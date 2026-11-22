#!/usr/bin/env python3
"""Build the MIGO landmark catalogue for Montréal Island from open data.

Reproducible import (Python 3 standard library only). It downloads the sources
(or reads them from a cache directory), normalises and filters them, removes
duplicates, picks a geofence for every place and writes two SQL files for the
Supabase SQL editor:

  backend/supabase/migrations/008_montreal_island_boundary.sql  -> public.service_areas
  backend/supabase/migrations/009_landmarks_seed.sql            -> public.landmarks

plus a review report in backend/data/. See backend/scripts/README.md.

Usage (from the repository root):

  python3 -I backend/scripts/import_landmarks.py --cache /tmp/migo-landmark-raw
  python3 -I backend/scripts/import_landmarks.py --offline --cache DIR   # cached files only
  python3 -I backend/scripts/import_landmarks.py --self-test

The output is deterministic: the same inputs give byte-identical SQL (the date
in the header comes from --date, which defaults to today in UTC).
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import difflib
import hashlib
import html
import io
import json
import math
import os
import re
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

# ---------------------------------------------------------------------------
# Paths and sources
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(BACKEND_DIR, "data")
MIGRATIONS_DIR = os.path.join(BACKEND_DIR, "supabase", "migrations")
OVERRIDES_PATH = os.path.join(DATA_DIR, "landmark_overrides.json")
REPORT_PATH = os.path.join(DATA_DIR, "landmark_import_report.md")
SKIPPED_CSV_PATH = os.path.join(DATA_DIR, "landmark_import_skipped.csv")
BOUNDARY_SQL = os.path.join(MIGRATIONS_DIR, "008_montreal_island_boundary.sql")
SEED_SQL = os.path.join(MIGRATIONS_DIR, "009_landmarks_seed.sql")
SCRIPT_REL = "backend/scripts/import_landmarks.py"

CKAN = "https://donnees.montreal.ca/api/3/action/"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "migo-landmark-import/1.0 (python-urllib)"
CC_BY = "CC-BY-4.0"
ODBL = "ODbL-1.0"

SRC_LIEUX = {
    "source_name": "montreal-lieux-interet",
    "title": "Lieux d'intérêt (Ville de Montréal)",
    "page": "https://donnees.montreal.ca/dataset/lieux-d-interet",
    "license": CC_BY,
    "geojson_url": "https://donnees.montreal.ca/dataset/763fe3b8-cdc3-4b8a-bbbd-a0a9bc587c56/"
                   "resource/5ca7cdb8-f86f-4038-b5a8-657446c75427/download/lieux_d_interet.geojson",
    # Same records as the CSV resource, served by the portal's CKAN DataStore API.
    "datastore_resource": "edce22aa-f7cc-495e-9c53-b367f68309f6",
}
SRC_EDIFICES = {
    "source_name": "montreal-edifices-patrimoniaux",
    "title": "Les édifices patrimoniaux de Montréal (archives, Ville de Montréal)",
    "page": "https://donnees.montreal.ca/dataset/les-edifices-patrimoniaux-de-montreal",
    "license": CC_BY,
    "datastore_resource": "a89dd7ad-ebb1-4d1e-97d5-e14724e50447",
}
SRC_VOCATION = {  # descriptions only (montreal.ca "Lieux" pages)
    "source_name": "montreal-lieux-vocation-publique",
    "title": "Lieux et bâtiments à vocation publique (Ville de Montréal)",
    "page": "https://donnees.montreal.ca/dataset/lieux-batiments-vocation-publique",
    "license": CC_BY,
    "datastore_resource": "4731b64f-29cc-4e08-bc44-8752ae2fcafb",
}
SRC_BOUNDARY = {
    "source_name": "montreal-limites-terrestres",
    "title": "Limites terrestres de l'île de Montréal (Ville de Montréal)",
    "page": "https://donnees.montreal.ca/dataset/limites-terrestres",
    "license": CC_BY,
    "geojson_url": "https://donnees.montreal.ca/dataset/b628f1da-9dc3-4bb1-9875-1470f891afb1/"
                   "resource/92cb062a-11be-4222-9ea5-867e7e64c5ff/download/limites-terrestres.geojson",
}
SRC_ESPACES = {
    "source_name": "montreal-grands-parcs",
    "title": "Grands parcs, parcs d'arrondissements et espaces publics (Ville de Montréal)",
    "page": "https://donnees.montreal.ca/dataset/grands-parcs-parcs-d-arrondissements-et-espaces-publics",
    "license": CC_BY,
    "geojson_url": "https://donnees.montreal.ca/dataset/2e9e4d2f-173a-4c3d-a5e3-565d79baa27d/"
                   "resource/35796624-15df-4503-a569-797665f8768e/download/espace_vert.json",
    # Attribute table (no geometry) of the same dataset: names + areas.
    "datastore_resource": "f34c3555-c285-4ef3-a55c-f0f5c440ad2d",
}
SRC_OSM = {
    "source_name": "openstreetmap",
    "title": "OpenStreetMap (© OpenStreetMap contributors)",
    "page": "https://www.openstreetmap.org/copyright",
    "license": ODBL,
}
SOURCE_PRIORITY = {SRC_LIEUX["source_name"]: 0, SRC_EDIFICES["source_name"]: 1, SRC_OSM["source_name"]: 2}

CATEGORIES = ("landmark", "museum", "park", "historic", "architecture", "religious", "culture",
              "viewpoint", "market", "public-art", "campus", "other")
DEFAULT_RADIUS = {
    "public-art": 25, "landmark": 60, "architecture": 60, "religious": 60, "historic": 50,
    "museum": 50, "viewpoint": 40, "market": 60, "park": 120, "campus": 100, "culture": 40,
    "other": 50,
}
RADIUS_MIN, RADIUS_MAX = 15, 2000

# Coarse envelope of Montréal Island + adjacent islets (used only for sanity
# checks and when the official boundary could not be loaded).
ISLAND_BBOX = (45.39, -73.99, 45.71, -73.46)  # min lat, min lng, max lat, max lng
SHORE_TOLERANCE_M = 60.0          # points this close outside the land boundary are kept (quays, piers)
BOUNDARY_TOLERANCE_M = (5.0, 7.5, 10.0)
BOUNDARY_MAX_BYTES = 1_400_000
BOUNDARY_MIN_ISLET_M2 = 2_000.0
POLYGON_TOLERANCE_M = 5.0
POLYGON_MIN_AREA_M2 = 10_000.0     # parks smaller than 1 ha keep a circle only
DEDUPE_SAME_NAME_M = 75.0
DEDUPE_SIMILAR_NAME_M = 150.0
DEDUPE_SIMILARITY = 0.88
DESCRIPTION_MAX = 600
BATCH_SIZE = 100

# --- Source A: type -> category ------------------------------------------------
LIEUX_TYPE_CATEGORY = {
    "Attrait touristique commercial": "landmark",
    "Attrait touristique culturel": "landmark",
    "Attrait touristique sportif ou récréatif": "landmark",
    "Bâtiment historique / patrimonial": "historic",
    "Bâtiment architectural / design": "architecture",
    "Place publique": "landmark",
    "Rue piétonne": "landmark",
    "Parcours": "landmark",
    "Cinéma": "culture",
    "Galerie d'art": "culture",
    "Lieu de diffusion municipal": "culture",
    "Théâtre / salle de spectacle / petit lieu de diffusion": "culture",
    "Musée et centre d'interprétation / d'exposition": "museum",
    "Musée municipal": "museum",
    "Art public": "public-art",
    "Bibliothèque publique": "culture",
    "Bibliothèque privée": "culture",
    "Parc": "park",
    "Marché public": "market",
    "Cégep et université": "campus",
}
# Everything else is dropped. Reason by source "Catégorie" (then by "Type").
LIEUX_DROP_BY_TYPE = {
    "Jardin communautaire": "community garden (allotment plots, not a public visit)",
    "Toilette publique": "public toilets",
    "Poste d'attente de taxis": "transport (taxi stand)",
    "Artère commerciale": "commercial street (linear, no meaningful point geofence)",
    "Centre commercial": "shopping mall",
    "Centre de congrès / d'exposition": "convention centre",
}
LIEUX_DROP_BY_CATEGORY = {
    "Hébergement": "lodging (hotel, hostel)",
    "Regroupement de commerces": "commercial (mall / shopping street)",
    "Équipement sportif et récréatif": "sports facility (pool, arena, sports centre)",
    "Équipement communautaire": "community organisation / leisure centre",
    "Établissement scolaire": "school",
    "Service de santé": "health service",
    "Service d'urgence": "emergency service (fire, police)",
    "Service gouvernemental": "government service office",
    "Service municipal": "municipal service (offices, recycling, eco-quartier)",
    "Transport": "transport (metro, train, mobility hub)",
    "Information touristique": "tourist information office",
    "Centre de congrès / d'exposition": "convention centre",
}

# --- Heritage buildings: typology -> category ---------------------------------
EDIFICE_TYPO_CATEGORY = {
    "gratte-ciel": "architecture",
    "Tour d'habitation": "architecture",
    "Immeuble de bureaux": "architecture",
    "Édifice de culte": "religious",
    "Édifice religieux": "religious",
    "Croix de chemin": "religious",
}

ROMAN_OR_NUMBER = re.compile(r"^(?:[ivxlc]+|\d+)$")


# ---------------------------------------------------------------------------
# Small utilities
# ---------------------------------------------------------------------------

def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def clean_text(value) -> str | None:
    """NFC, strip control chars, collapse whitespace. Empty -> None."""
    if value is None:
        return None
    s = str(value)
    if s.strip().upper() in ("", "NULL", "NONE", "N/A"):
        return None
    s = unicodedata.normalize("NFC", s)
    s = "".join(ch if (ch >= " " or ch in "\t\n") else " " for ch in s)
    s = re.sub(r"\s+", " ", s).strip()
    return s or None


def strip_html(s: str | None) -> str | None:
    if not s:
        return s
    s = re.sub(r"(?i)</?(sup|sub|i|b|em|strong|span|u)\b[^>]*>", "", s)  # inline tags: no space
    s = re.sub(r"<[^>]+>", " ", s)
    return clean_text(html.unescape(s))


def truncate(s: str | None, limit: int = DESCRIPTION_MAX) -> str | None:
    if not s or len(s) <= limit:
        return s
    cut = s[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    if end >= limit * 0.5:
        return cut[: end + 1]
    return cut[: cut.rfind(" ")].rstrip(" ,;:") + "…"


def ascii_fold(s: str) -> str:
    s = s.replace("œ", "oe").replace("Œ", "Oe").replace("æ", "ae").replace("Æ", "Ae").replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def fold_key(s: str) -> str:
    """Key for comparing column names: ascii, lowercase, alphanumerics only."""
    return re.sub(r"[^a-z0-9]", "", ascii_fold(s).lower())


def name_key(name: str) -> str:
    s = ascii_fold(name).lower().replace("’", "'")
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    s = re.sub(r"^(l|le|la|les|the) ", "", s)
    return s


GENERIC_WORDS = {"parc", "nature", "square", "place", "promenade", "jardin", "jardins", "espace",
                 "du", "de", "des", "la", "le", "les", "l", "d", "et", "ecole", "mini", "ilot"}


def core_key(name: str) -> str:
    """Name without generic words, for matching parks across datasets."""
    return " ".join(w for w in name_key(name).split() if w not in GENERIC_WORDS)


def slugify(s: str) -> str:
    s = ascii_fold(s).lower().replace("’", "").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    if len(s) > 80:
        s = s[:80].rsplit("-", 1)[0]
    return s or "lieu"


def to_float(v) -> float | None:
    if v is None:
        return None
    try:
        f = float(str(v).strip().replace(",", "."))
    except ValueError:
        return None
    return f if math.isfinite(f) else None


def record_id_str(v) -> str | None:
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    s = str(v).strip()
    if re.fullmatch(r"\d+\.0+", s):
        s = s.split(".")[0]
    return s or None


def numeric_sort_key(v: str):
    return (0, int(v), "") if v.isdigit() else (1, 0, v)


def norm_neighbourhood(s: str | None) -> str | None:
    s = clean_text(s)
    if not s:
        return None
    s = s.replace("—", "–")
    s = re.sub(r"\s*\(Montréal\)$", "", s)
    s = re.sub(r"^Ville de ", "", s)
    s = re.sub(r"^Ville Mont-Royal$", "Mont-Royal", s)
    return s


# ---------------------------------------------------------------------------
# HTTP + cache
# ---------------------------------------------------------------------------

class FetchError(RuntimeError):
    pass


class Fetcher:
    def __init__(self, cache_dir: str, offline: bool, refresh: bool):
        self.cache_dir = cache_dir
        self.offline = offline
        self.refresh = refresh
        os.makedirs(cache_dir, exist_ok=True)
        self.inputs: dict[str, str] = {}  # cache name -> sha256 (for the SQL header)

    def _path(self, name: str) -> str:
        return os.path.join(self.cache_dir, name)

    def cached(self, name: str) -> bytes | None:
        p = self._path(name)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            with open(p, "rb") as fh:
                return fh.read()
        return None

    def _store(self, name: str, data: bytes) -> None:
        tmp = self._path(name + ".part")
        with open(tmp, "wb") as fh:
            fh.write(data)
        os.replace(tmp, self._path(name))

    @staticmethod
    def http(url: str, data: bytes | None = None, timeout: int = 120, retries: int = 3,
             backoff: float = 5.0, accept_json: bool = False) -> bytes:
        last = None
        for attempt in range(retries):
            req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
            if data is not None:
                req.add_header("Content-Type", "application/x-www-form-urlencoded")
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    body = resp.read()
                if accept_json:
                    json.loads(body)
                return body
            except urllib.error.HTTPError as e:  # 4xx other than 429: do not hammer
                last = e
                if e.code not in (429, 500, 502, 503, 504):
                    break
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError, ValueError) as e:
                last = e
            if attempt + 1 < retries:
                wait = backoff * (3 ** attempt)
                log(f"    retry in {wait:.0f}s ({last})")
                time.sleep(wait)
        raise FetchError(f"{url}: {last}")

    def get(self, name: str, url: str, accept_json: bool = True) -> bytes:
        if not self.refresh:
            data = self.cached(name)
            if data is not None:
                self.inputs[name] = sha256(data)
                return data
        if self.offline:
            raise FetchError(f"{name} not in cache ({self.cache_dir}) and --offline is set")
        log(f"  downloading {url}")
        data = self.http(url, accept_json=accept_json)
        self._store(name, data)
        self.inputs[name] = sha256(data)
        return data

    def datastore(self, resource_id: str) -> list[dict]:
        """All records of a CKAN DataStore resource (paged), cached as one JSON file."""
        name = f"datastore-{resource_id}.json"
        if not self.refresh:
            data = self.cached(name)
            if data is not None:
                self.inputs[name] = sha256(data)
                return json.loads(data)
        if self.offline:
            raise FetchError(f"{name} not in cache and --offline is set")
        records: list[dict] = []
        offset, limit = 0, 1000
        while True:
            q = urllib.parse.urlencode({"resource_id": resource_id, "limit": limit, "offset": offset,
                                        "sort": "_id asc"})
            log(f"  datastore {resource_id} offset {offset}")
            body = json.loads(self.http(f"{CKAN}datastore_search?{q}", accept_json=True))
            if not body.get("success"):
                raise FetchError(f"datastore_search failed for {resource_id}")
            page = body["result"]["records"]
            records.extend(page)
            offset += len(page)
            if not page or offset >= body["result"].get("total", 0):
                break
        data = json.dumps(records, ensure_ascii=False, sort_keys=True).encode()
        self._store(name, data)
        self.inputs[name] = sha256(data)
        return records


# ---------------------------------------------------------------------------
# Geometry (pure Python)
# ---------------------------------------------------------------------------

R_EARTH = 6_371_008.8


def haversine(lat1, lng1, lat2, lng2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R_EARTH * math.asin(min(1.0, math.sqrt(a)))


class LocalProj:
    """Equirectangular metres around a reference latitude (fine at city scale)."""

    def __init__(self, lat0: float = 45.55):
        self.kx = math.radians(1) * R_EARTH * math.cos(math.radians(lat0))
        self.ky = math.radians(1) * R_EARTH

    def xy(self, lng, lat):
        return lng * self.kx, lat * self.ky


PROJ = LocalProj()


def ring_area_m2(ring) -> float:
    """Unsigned area of a lng/lat ring in m²."""
    pts = [PROJ.xy(x, y) for x, y in ring]
    s = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def polygon_area_m2(poly) -> float:
    return max(0.0, ring_area_m2(poly[0]) - sum(ring_area_m2(h) for h in poly[1:]))


def mp_area_m2(mp) -> float:
    return sum(polygon_area_m2(p) for p in mp)


def point_in_ring(lng, lat, ring) -> bool:
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat):
            x = (xj - xi) * (lat - yi) / (yj - yi) + xi
            if lng < x:
                inside = not inside
        j = i
    return inside


def bbox_of(mp):
    xs = [x for poly in mp for x, _ in poly[0]]
    ys = [y for poly in mp for _, y in poly[0]]
    return min(xs), min(ys), max(xs), max(ys)


def point_in_mp(lng, lat, mp, bboxes=None) -> bool:
    for k, poly in enumerate(mp):
        if bboxes is not None:
            x0, y0, x1, y1 = bboxes[k]
            if not (x0 <= lng <= x1 and y0 <= lat <= y1):
                continue
        if point_in_ring(lng, lat, poly[0]) and not any(point_in_ring(lng, lat, h) for h in poly[1:]):
            return True
    return False


def dist_point_to_mp_m(lng, lat, mp) -> float:
    px, py = PROJ.xy(lng, lat)
    best = float("inf")
    for poly in mp:
        for ring in poly:
            pts = [PROJ.xy(x, y) for x, y in ring]
            for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
                dx, dy = x2 - x1, y2 - y1
                L = dx * dx + dy * dy
                t = 0.0 if L == 0 else max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / L))
                d = math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
                if d < best:
                    best = d
    return best


def douglas_peucker(pts_xy, tol) -> list[int]:
    """Indices of the points kept (iterative, so huge rings are fine)."""
    n = len(pts_xy)
    if n < 3:
        return list(range(n))
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    tol2 = tol * tol
    while stack:
        a, b = stack.pop()
        ax, ay = pts_xy[a]
        bx, by = pts_xy[b]
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy
        best_i, best_d = -1, -1.0
        for i in range(a + 1, b):
            px, py = pts_xy[i]
            if L == 0:
                d = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L))
                d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d > best_d:
                best_i, best_d = i, d
        if best_d > tol2:
            keep[best_i] = True
            stack.append((a, best_i))
            stack.append((best_i, b))
    return [i for i in range(n) if keep[i]]


def simplify_ring(ring, tol_m, decimals=6):
    if ring[0] != ring[-1]:
        ring = ring + [ring[0]]
    # Split the closed ring at its farthest point from the start so the
    # simplification cannot collapse it to a line.
    pts = [PROJ.xy(x, y) for x, y in ring]
    far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    idx = douglas_peucker(pts[: far + 1], tol_m) + [far + i for i in douglas_peucker(pts[far:], tol_m)[1:]]
    out = []
    for i in idx:
        p = [round(ring[i][0], decimals), round(ring[i][1], decimals)]
        if not out or out[-1] != p:
            out.append(p)
    if out[0] != out[-1]:
        out.append(out[0])
    return out if len(out) >= 4 else None


def simplify_mp(mp, tol_m, min_area_m2=0.0, decimals=6):
    """Simplify a multipolygon (list of [outer, *holes] in lng/lat). Drops parts below min_area."""
    out = []
    dropped_area = 0.0
    for poly in mp:
        area = polygon_area_m2(poly)
        if area < min_area_m2:
            dropped_area += area
            continue
        outer = simplify_ring(poly[0], tol_m, decimals)
        if outer is None:
            dropped_area += area
            continue
        holes = []
        for h in poly[1:]:
            if ring_area_m2(h) < max(min_area_m2, 4 * tol_m * tol_m):
                continue
            sh = simplify_ring(h, tol_m, decimals)
            if sh:
                holes.append(sh)
        out.append([outer] + holes)
    out.sort(key=lambda p: (-ring_area_m2(p[0]), p[0][0]))
    return out, dropped_area


def geojson_to_mp(geom) -> list:
    """GeoJSON Polygon/MultiPolygon/GeometryCollection -> list of polygons (lng/lat floats)."""
    if not geom:
        return []
    t = geom.get("type")
    if t == "Polygon":
        return [[[[float(c[0]), float(c[1])] for c in ring] for ring in geom["coordinates"] if ring]]
    if t == "MultiPolygon":
        return [[[[float(c[0]), float(c[1])] for c in ring] for ring in poly if ring]
                for poly in geom["coordinates"] if poly]
    if t == "GeometryCollection":
        return [p for g in geom.get("geometries", []) for p in geojson_to_mp(g)]
    return []


def mp_geojson(mp) -> str:
    return json.dumps({"type": "MultiPolygon", "coordinates": mp}, separators=(",", ":"))


# --- Transverse Mercator (Krüger series), for MTM zone 8 inputs ---------------

GRS80_A = 6378137.0
GRS80_F = 1 / 298.257222101


class TransverseMercator:
    def __init__(self, lon0, k0, fe, fn, a=GRS80_A, f=GRS80_F):
        self.lon0, self.k0, self.fe, self.fn = math.radians(lon0), k0, fe, fn
        n = f / (2 - f)
        self.n = n
        self.A = a / (1 + n) * (1 + n ** 2 / 4 + n ** 4 / 64)
        self.alpha = (n / 2 - 2 * n ** 2 / 3 + 5 * n ** 3 / 16, 13 * n ** 2 / 48 - 3 * n ** 3 / 5, 61 * n ** 3 / 240)
        self.beta = (n / 2 - 2 * n ** 2 / 3 + 37 * n ** 3 / 96, n ** 2 / 48 + n ** 3 / 15, 17 * n ** 3 / 480)
        self.delta = (2 * n - 2 * n ** 2 / 3 - 2 * n ** 3, 7 * n ** 2 / 3 - 8 * n ** 3 / 5, 56 * n ** 3 / 15)

    def forward(self, lon, lat):
        phi, lam = math.radians(lat), math.radians(lon) - self.lon0
        c = 2 * math.sqrt(self.n) / (1 + self.n)
        t = math.sinh(math.atanh(math.sin(phi)) - c * math.atanh(c * math.sin(phi)))
        xi_p = math.atan2(t, math.cos(lam))
        eta_p = math.atanh(math.sin(lam) / math.sqrt(1 + t * t))
        xi = xi_p + sum(a * math.sin(2 * j * xi_p) * math.cosh(2 * j * eta_p) for j, a in enumerate(self.alpha, 1))
        eta = eta_p + sum(a * math.cos(2 * j * xi_p) * math.sinh(2 * j * eta_p) for j, a in enumerate(self.alpha, 1))
        return self.fe + self.k0 * self.A * eta, self.fn + self.k0 * self.A * xi

    def inverse(self, e, n_):
        xi = (n_ - self.fn) / (self.k0 * self.A)
        eta = (e - self.fe) / (self.k0 * self.A)
        xi_p = xi - sum(b * math.sin(2 * j * xi) * math.cosh(2 * j * eta) for j, b in enumerate(self.beta, 1))
        eta_p = eta - sum(b * math.cos(2 * j * xi) * math.sinh(2 * j * eta) for j, b in enumerate(self.beta, 1))
        chi = math.asin(math.sin(xi_p) / math.cosh(eta_p))
        phi = chi + sum(d * math.sin(2 * j * chi) for j, d in enumerate(self.delta, 1))
        lam = self.lon0 + math.atan2(math.sinh(eta_p), math.cos(xi_p))
        return math.degrees(lam), math.degrees(phi)


# NAD83 / NAD83(CSRS) MTM zone 8 (EPSG:32188 / 2950). NAD83 ~ WGS84 within ~1-2 m here.
MTM8 = TransverseMercator(lon0=-73.5, k0=0.9999, fe=304800.0, fn=0.0)


def detect_crs(gj) -> str:
    name = ""
    crs = gj.get("crs") or {}
    if isinstance(crs, dict):
        name = str((crs.get("properties") or {}).get("name", ""))
    m = re.search(r"(\d{4,5})\D*$", name)
    if "CRS84" in name.upper():
        return "EPSG:4326"
    if m:
        return f"EPSG:{m.group(1)}"
    # No CRS member: guess from magnitudes.
    for feat in gj.get("features", []):
        mp = geojson_to_mp(feat.get("geometry"))
        if mp:
            x, y = mp[0][0][0]
            if abs(x) <= 180 and abs(y) <= 90:
                return "EPSG:4326"
            if 100_000 < x < 600_000 and 4_900_000 < y < 5_200_000:
                return "EPSG:2950"
            if abs(x) > 1_000_000:
                return "EPSG:3857"
    return "EPSG:4326"


def reproject_mp(mp, crs: str):
    if crs in ("EPSG:4326", "EPSG:4269", "EPSG:4617"):
        return mp
    if crs in ("EPSG:2950", "EPSG:32188"):
        f = MTM8.inverse
    elif crs in ("EPSG:3857", "EPSG:900913"):
        def f(x, y):
            return (math.degrees(x / 6378137.0),
                    math.degrees(2 * math.atan(math.exp(y / 6378137.0)) - math.pi / 2))
    else:
        raise ValueError(f"unsupported CRS {crs}")
    return [[[list(f(x, y)) for x, y in ring] for ring in poly] for poly in mp]


# ---------------------------------------------------------------------------
# OpenStreetMap (Overpass) - optional supplement, fails gracefully
# ---------------------------------------------------------------------------

class Overpass:
    def __init__(self, fetcher: Fetcher, enabled: bool):
        self.fetcher = fetcher
        self.enabled = enabled
        self.failed = False
        self.errors: list[str] = []

    def query(self, ql: str, cache_name: str):
        cached = None if self.fetcher.refresh else self.fetcher.cached(cache_name)
        if cached is not None:
            self.fetcher.inputs[cache_name] = sha256(cached)
            return json.loads(cached)
        if not self.enabled or self.fetcher.offline or self.failed:
            return None
        try:
            log("  overpass query")
            data = Fetcher.http(OVERPASS_URL, data=urllib.parse.urlencode({"data": ql}).encode(),
                                timeout=90, retries=3, backoff=10.0, accept_json=True)
        except FetchError as e:
            self.failed = True  # do not keep waiting on a dead endpoint
            self.errors.append(str(e))
            log(f"  WARNING overpass unavailable: {e}")
            return None
        self.fetcher._store(cache_name, data)
        self.fetcher.inputs[cache_name] = sha256(data)
        return json.loads(data)


def _stitch_rings(ways):
    """Join member way geometries (lists of [lng,lat]) into closed rings."""
    segs = [list(w) for w in ways if len(w) >= 2]
    rings = []
    while segs:
        ring = segs.pop(0)
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[::-1][1:]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[::-1][:-1] + ring
                else:
                    continue
                segs.pop(i)
                changed = True
                break
        if ring[0] == ring[-1] and len(ring) >= 4:
            rings.append(ring)
    return rings


def osm_element_mp(el):
    if el.get("type") == "way":
        g = [[p["lon"], p["lat"]] for p in el.get("geometry", [])]
        if len(g) >= 4 and g[0] == g[-1]:
            return [[g]]
        return []
    if el.get("type") == "relation":
        outers = [[[p["lon"], p["lat"]] for p in m.get("geometry", [])]
                  for m in el.get("members", []) if m.get("type") == "way" and m.get("role") in ("outer", "")]
        inners = [[[p["lon"], p["lat"]] for p in m.get("geometry", [])]
                  for m in el.get("members", []) if m.get("type") == "way" and m.get("role") == "inner"]
        outer_rings, inner_rings = _stitch_rings(outers), _stitch_rings(inners)
        mp = [[o] for o in outer_rings]
        for h in inner_rings:
            for poly in mp:
                if point_in_ring(h[0][0], h[0][1], poly[0]):
                    poly.append(h)
                    break
        return mp
    return []


def ql_regex(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def osm_polygon_near(op: Overpass, name_regex: str, lat: float, lng: float, around_m: int):
    ql = (f'[out:json][timeout:60];('
          f'way(around:{around_m},{lat:.6f},{lng:.6f})["name"~"{ql_regex(name_regex)}",i];'
          f'relation(around:{around_m},{lat:.6f},{lng:.6f})["name"~"{ql_regex(name_regex)}",i]["type"="multipolygon"];'
          f');out geom;')
    key = "overpass-poly-" + hashlib.sha1(ql.encode()).hexdigest()[:16] + ".json"
    res = op.query(ql, key)
    if not res:
        return None
    best = None
    for el in sorted(res.get("elements", []), key=lambda e: (e.get("type"), e.get("id"))):
        mp = osm_element_mp(el)
        if not mp or not point_in_mp(lng, lat, mp):
            continue
        area = mp_area_m2(mp)
        if area > 3_000_000:  # not a single place
            continue
        if best is None or area > best[1]:
            best = (f"{el['type']}/{el['id']}", area, mp)
    return best


def osm_find_place(op: Overpass, name_regex: str, lat: float, lng: float, around_m: int):
    ql = (f'[out:json][timeout:60];nwr(around:{around_m},{lat:.6f},{lng:.6f})'
          f'["name"~"{ql_regex(name_regex)}",i];out center tags;')
    key = "overpass-place-" + hashlib.sha1(ql.encode()).hexdigest()[:16] + ".json"
    res = op.query(ql, key)
    if not res:
        return None
    cands = []
    for el in res.get("elements", []):
        tags = el.get("tags", {})
        c = el.get("center") or ({"lat": el.get("lat"), "lon": el.get("lon")} if "lat" in el else None)
        if not c:
            continue
        rank = 0 if tags.get("amenity") == "place_of_worship" or tags.get("tourism") else 1
        cands.append((rank, {"way": 0, "relation": 1, "node": 2}.get(el["type"], 3), el["id"], el, c, tags))
    if not cands:
        return None
    _, _, _, el, c, tags = sorted(cands, key=lambda t: t[:3])[0]
    return {"id": f"{el['type']}/{el['id']}", "lat": float(c["lat"]), "lng": float(c["lon"]), "tags": tags}


# ---------------------------------------------------------------------------
# Loading sources
# ---------------------------------------------------------------------------

def fold_props(props: dict) -> dict:
    # Skip CKAN's internal row number "_id": it would collide with the source "ID" column.
    return {fold_key(k): v for k, v in props.items() if not k.startswith("_")}


def load_lieux(fx: Fetcher, warnings: list) -> tuple[list[dict], str]:
    """Source A as a list of folded-key dicts with '_lat'/'_lng'. Returns (rows, how).

    The CSV resource (read through the CKAN DataStore API) is preferred: it has the same
    records and coordinates as the GeoJSON plus the 'Nom court' column (short names, used
    for public art). The GeoJSON download is the fallback.
    """
    try:
        rows = []
        for r in fx.datastore(SRC_LIEUX["datastore_resource"]):
            p = fold_props(r)
            p["_lng"], p["_lat"] = p.get("longitude"), p.get("latitude")
            rows.append(p)
        return rows, "CKAN DataStore API (CSV resource)"
    except FetchError as e:
        warnings.append(f"Lieux d'intérêt DataStore unavailable ({e}); used the GeoJSON download (no short names).")
    gj = json.loads(fx.get("lieux_d_interet.geojson", SRC_LIEUX["geojson_url"]))
    rows = []
    for feat in gj.get("features", []):
        p = fold_props(feat.get("properties") or {})
        geom = feat.get("geometry") or {}
        if geom.get("type") == "Point" and geom.get("coordinates"):
            p["_lng"], p["_lat"] = geom["coordinates"][0], geom["coordinates"][1]
        else:
            p["_lng"], p["_lat"] = p.get("longitude"), p.get("latitude")
        rows.append(p)
    return rows, "GeoJSON download"


def load_boundary(fx: Fetcher, boundary_file: str | None, warnings: list):
    try:
        if boundary_file:
            with open(boundary_file, "rb") as fh:
                raw = fh.read()
            fx.inputs[os.path.basename(boundary_file)] = sha256(raw)
        else:
            raw = fx.get("limites-terrestres.geojson", SRC_BOUNDARY["geojson_url"])
    except (FetchError, OSError) as e:
        warnings.append(f"Island boundary not available ({e}). 008 was NOT written; points were checked against a coarse bounding box only.")
        return None
    gj = json.loads(raw)
    crs = detect_crs(gj)
    mp = []
    for feat in gj.get("features", []) if gj.get("type") == "FeatureCollection" else [{"geometry": gj}]:
        mp.extend(geojson_to_mp(feat.get("geometry")))
    mp = reproject_mp(mp, crs)
    name = os.path.basename(boundary_file) if boundary_file else "limites-terrestres.geojson"
    return {"crs": crs, "mp": mp, "features": len(gj.get("features", [])), "input": name}


def load_espaces(fx: Fetcher, warnings: list):
    """Green-space polygons grouped by NUM_INDEX (plus single features by OBJECTID).

    Returns ({"groups", "by_oid"} or None, attribute-table groups)."""
    attr_groups = {}
    try:
        for r in fx.datastore(SRC_ESPACES["datastore_resource"]):
            key = clean_text(r.get("NUM_INDEX")) or f"OBJECTID:{record_id_str(r.get('OBJECTID'))}"
            g = attr_groups.setdefault(key, {"names": set(), "area_m2": 0.0, "gestion": set()})
            g["names"].add(espace_name(r))
            g["area_m2"] += (to_float(r.get("SUPERFICIE")) or 0.0) * 10_000
            if clean_text(r.get("GESTION")):
                g["gestion"].add(clean_text(r.get("GESTION")))
    except FetchError as e:
        warnings.append(f"Green-space attribute table unavailable ({e}); park radii use category defaults.")
    try:
        gj = json.loads(fx.get("espace_vert.json", SRC_ESPACES["geojson_url"]))
    except FetchError as e:
        warnings.append(f"Green-space polygons (espace_vert.json) not downloadable ({e}); no Montréal polygons attached.")
        return None, attr_groups
    groups, by_oid = {}, {}
    for feat in gj.get("features", []):
        props = feat.get("properties") or {}
        fp = fold_props(props)
        mp = geojson_to_mp(feat.get("geometry"))
        if not mp:
            continue
        oid = record_id_str(fp.get("objectid"))
        key = clean_text(fp.get("numindex")) or f"OBJECTID:{oid}"
        g = groups.setdefault(key, {"key": key, "names": set(), "mp": [], "objectids": []})
        g["names"].add(espace_name({"Type": fp.get("type"), "Lien": fp.get("lien"), "Nom": fp.get("nom")}))
        g["mp"].extend(mp)
        g["objectids"].append(oid)
        if oid:  # single-feature access for curated 'OBJECTID:<n>' references
            by_oid[f"OBJECTID:{oid}"] = {"key": f"OBJECTID:{oid}", "names": {espace_name(
                {"Type": fp.get("type"), "Lien": fp.get("lien"), "Nom": fp.get("nom")})}, "mp": mp, "objectids": [oid]}
    for g in list(groups.values()) + list(by_oid.values()):
        g["area_m2"] = mp_area_m2(g["mp"])
        g["bbox"] = bbox_of(g["mp"])
        g["cores"] = {core_key(n) for n in g["names"] if n}
    return {"groups": groups, "by_oid": by_oid}, attr_groups


def espace_name(r) -> str:
    parts = [clean_text(r.get("Type")), clean_text(r.get("Lien")), clean_text(r.get("Nom"))]
    s = " ".join(p for p in parts if p)
    return re.sub(r"(\b[dl]['’])\s+", r"\1", s, flags=re.I)


# ---------------------------------------------------------------------------
# Building the catalogue
# ---------------------------------------------------------------------------

class Catalogue:
    def __init__(self, overrides: dict):
        self.overrides = overrides
        self.records: list[dict] = []
        self.skipped: list[dict] = []
        self.merges: list[dict] = []
        self.notes: list[str] = []
        self.name_rules = [(re.compile(r["regex"], re.I), r["category"]) for r in overrides.get("name_rules", [])]

    def skip(self, src, rid, name, typ, reason, detail=""):
        self.skipped.append({"source_name": src, "source_record_id": rid or "", "name": name or "",
                             "source_type": typ or "", "reason": reason, "detail": detail})

    def ov(self, src, rid) -> dict:
        return self.overrides.get("records", {}).get(f"{src}:{rid}", {})

    def apply_name_rules(self, name: str, category: str) -> str:
        for rx, cat in self.name_rules:
            if rx.search(name):
                return cat
        return category


def build_lieux(cat: Catalogue, rows: list[dict]) -> None:
    src = SRC_LIEUX["source_name"]
    for p in rows:
        rid = record_id_str(p.get("id"))
        name_full = clean_text(p.get("nomfrancais"))
        short = clean_text(p.get("nomcourt"))
        typ = clean_text(p.get("type")) or ""
        fam_cat = clean_text(p.get("categorie")) or ""
        level = clean_text(p.get("classification")) or ""
        if not rid:
            cat.skip(src, rid, name_full, typ, "invalid: missing source id")
            continue
        if not name_full:
            cat.skip(src, rid, name_full, typ, "invalid: missing name")
            continue
        ov = cat.ov(src, rid)
        if ov.get("exclude"):
            cat.skip(src, rid, name_full, typ, "curated exclude", str(ov["exclude"]))
            continue
        category = LIEUX_TYPE_CATEGORY.get(typ)
        religious_rescue = bool(cat.name_rules) and cat.apply_name_rules(name_full, "") == "religious"
        if category is None and not ov.get("include") and not religious_rescue:
            reason = LIEUX_DROP_BY_TYPE.get(typ) or LIEUX_DROP_BY_CATEGORY.get(fam_cat) or f"type not kept ({typ})"
            cat.skip(src, rid, name_full, typ, "not a discoverable place: " + reason)
            continue
        if category is None:
            category = "religious" if religious_rescue else "other"
        if typ == "Parc" and re.match(r"(?i)^(parc-école|aire de repos)\b", name_full):
            cat.skip(src, rid, name_full, typ, "not a discoverable place: schoolyard / rest area")
            continue
        if category == "campus" and level not in ("niveau 1", "niveau 2") and not ov.get("include"):
            cat.skip(src, rid, name_full, typ, "not a discoverable place: minor private college / training school")
            continue
        lat, lng = to_float(p.get("_lat")), to_float(p.get("_lng"))
        if typ == "Art public":
            name = short or name_full
            description = f"Art public : {name_full}." if short and short != name_full else None
            if short and re.fullmatch(r"(?i)sans[- ]titre|untitled", short):
                # Many works are called "Sans titre": add the artist so names stay distinct.
                artist = name_full.replace(short, "")
                artist = re.sub(r",?\s*\d{4}(\s*-\s*\d{4})?\s*$", "", artist)
                artist = clean_text(re.sub(r"(,\s*)+", ", ", artist).strip(" ,"))
                if artist:
                    name = f"{short} ({artist})"
        else:
            name, description = name_full, None
        category = cat.apply_name_rules(name, category)
        if ov.get("category"):
            category = ov["category"]
        if ov.get("name"):
            name = clean_text(ov["name"])
        addr_parts = [clean_text(p.get("numero")), clean_text(p.get("rue"))]
        address = " ".join(a for a in addr_parts if a and a != "0") or None
        city, postal = clean_text(p.get("ville")), clean_text(p.get("codepostal"))
        if address and city:
            address += f", {city}"
        if address and postal:
            address += f" {postal}"
        cat.records.append({
            "source_name": src, "source_record_id": rid, "source_url": SRC_LIEUX["page"],
            "source_license": SRC_LIEUX["license"], "name": name, "category": category,
            "lat": lat, "lng": lng, "address": address,
            "neighbourhood": norm_neighbourhood(p.get("arrondissement")),
            "description": description, "source_type": typ, "level": level,
            "needs_review": False, "review_notes": [], "override": ov,
        })


EDIFICE_SKIP_TYPO = set()


def build_edifices(cat: Catalogue, rows: list[dict]) -> None:
    src = SRC_EDIFICES["source_name"]
    for r in rows:
        rid = clean_text(r.get("IDENTIFIANT_BATIMENT")) or f"_id:{r.get('_id')}"
        name = strip_html(r.get("NOM_HISTORIQUE"))
        typo = clean_text(r.get("TYPOLOGIE_SPECIFIQUE")) or ""
        desc = strip_html(r.get("HISTORIQUE_SOMMAIRE"))
        if not name:
            cat.skip(src, rid, name, typo, "heritage building without a name")
            continue
        ov = cat.ov(src, rid)
        if ov.get("exclude"):
            cat.skip(src, rid, name, typo, "curated exclude", str(ov["exclude"]))
            continue
        if not desc and not ov.get("include"):
            cat.skip(src, rid, name, typo, "heritage building without a historical summary (low discoverability)")
            continue
        if re.match(r"^\d", name):
            cat.skip(src, rid, name, typo, "heritage building named only by its address")
            continue
        category = EDIFICE_TYPO_CATEGORY.get(typo, "historic")
        category = cat.apply_name_rules(name, category)
        if ov.get("category"):
            category = ov["category"]
        civ = clean_text(r.get("CIVIQUE"))
        street = " ".join(x for x in [clean_text(r.get("TYPE_DE_VOIE")), clean_text(r.get("LIEN")),
                                       clean_text(r.get("VOIE")), clean_text(r.get("EST_OUEST"))] if x)
        street = re.sub(r"(\b[dl]['’])\s+", r"\1", street, flags=re.I)
        address = f"{civ} {street}".strip() if street else None
        years = [clean_text(r.get("DEBUT_DES_TRAVAUX")), clean_text(r.get("FIN_DES_TRAVAUX"))]
        lat, lng = to_float(r.get("CENTRO_Y")), to_float(r.get("CENTRO_X"))
        notes = []
        prec = max(len((clean_text(r.get("CENTRO_Y")) or "").partition(".")[2]),
                   len((clean_text(r.get("CENTRO_X")) or "").partition(".")[2]))
        if prec < 3:
            notes.append("coordinates given with fewer than 3 decimals in the source; check the position")
        cat.records.append({
            "source_name": src, "source_record_id": rid, "source_url": SRC_EDIFICES["page"],
            "source_license": SRC_EDIFICES["license"], "name": name, "category": category,
            "lat": lat, "lng": lng, "address": address,
            "neighbourhood": norm_neighbourhood(r.get("ARRONDISSEMENT")),
            "description": truncate(desc), "source_type": typo, "level": "",
            "years": [y for y in years if y], "needs_review": bool(notes), "review_notes": notes,
            "override": ov,
        })


def validate_locations(cat: Catalogue, boundary_mp) -> None:
    bboxes = [bbox_of([p]) for p in boundary_mp] if boundary_mp else None
    kept = []
    for r in cat.records:
        lat, lng = r["lat"], r["lng"]
        if lat is None or lng is None:
            cat.skip(r["source_name"], r["source_record_id"], r["name"], r["source_type"], "invalid: missing coordinates")
            continue
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            cat.skip(r["source_name"], r["source_record_id"], r["name"], r["source_type"],
                     "invalid: coordinates out of range", f"{lat},{lng}")
            continue
        if abs(lat) < 1e-9 and abs(lng) < 1e-9:
            cat.skip(r["source_name"], r["source_record_id"], r["name"], r["source_type"], "invalid: coordinates 0,0")
            continue
        b = ISLAND_BBOX
        if not (b[0] <= lat <= b[2] and b[1] <= lng <= b[3]):
            cat.skip(r["source_name"], r["source_record_id"], r["name"], r["source_type"],
                     "outside Montréal Island (bounding box)", f"{lat:.6f},{lng:.6f}")
            continue
        if boundary_mp:
            if not point_in_mp(lng, lat, boundary_mp, bboxes):
                d = dist_point_to_mp_m(lng, lat, boundary_mp)
                if d > SHORE_TOLERANCE_M:
                    cat.skip(r["source_name"], r["source_record_id"], r["name"], r["source_type"],
                             "outside Montréal Island land boundary", f"{lat:.6f},{lng:.6f} ({d:.0f} m off shore)")
                    continue
                r["review_notes"].append(f"point is {d:.0f} m outside the land boundary (shoreline/quay); kept")
        kept.append(r)
    cat.records = kept


def enrich_descriptions(cat: Catalogue, vocation_rows: list[dict]) -> int:
    """Fill empty descriptions from montreal.ca 'Lieux' records: same name within 250 m."""
    index: dict[str, list] = {}
    for v in vocation_rows:
        name, desc = clean_text(v.get("titre_lieu")), strip_html(v.get("description"))
        lat, lng = to_float(v.get("lat")), to_float(v.get("long"))
        if desc and (len(desc) < 80 or re.match(r"(?i)(consultez|projet carnet|voir la programmation)", desc)):
            desc = None  # placeholders / programme blurbs, not a description of the place
        if name and desc and lat and lng:
            index.setdefault(name_key(name), []).append((lat, lng, desc))
    n = 0
    for r in cat.records:
        if r["description"]:
            continue
        best = None
        for lat, lng, desc in index.get(name_key(r["name"]), []):
            d = haversine(r["lat"], r["lng"], lat, lng)
            if d <= 250 and (best is None or d < best[0]):
                best = (d, desc)
        if best:
            r["description"] = truncate(best[1])
            r["description_source"] = SRC_VOCATION["source_name"]
            n += 1
    return n


def trailing_numeral(key: str) -> str:
    last = key.rsplit(" ", 1)[-1]
    return last if ROMAN_OR_NUMBER.match(last) else ""


DISTINGUISHING = {"nord", "sud", "est", "ouest", "north", "south", "east", "west", "vieux", "vieil",
                  "vieille", "ancien", "ancienne", "nouveau", "nouvelle", "petit", "petite", "grand", "grande",
                  "annexe", "pavillon"}
STOPWORDS = {"du", "de", "des", "la", "le", "les", "l", "d", "a", "au", "aux", "et", "of", "the"}


def distinguishing_tokens(key: str) -> frozenset:
    toks = key.split()
    return frozenset([t for t in toks if t in DISTINGUISHING] + [trailing_numeral(key)])


def content_key(key: str) -> str:
    return " ".join(t for t in key.split() if t not in STOPWORDS)


COMPATIBLE = {"historic", "architecture", "religious", "landmark", "museum"}


def is_duplicate(a: dict, b: dict) -> tuple[bool, str, float]:
    d = haversine(a["lat"], a["lng"], b["lat"], b["lng"])
    if d > DEDUPE_SIMILAR_NAME_M:
        return False, "", d
    ka, kb = a["_key"], b["_key"]
    if ka == kb:
        return (d <= DEDUPE_SAME_NAME_M), "same name", d
    if distinguishing_tokens(ka) != distinguishing_tokens(kb):
        return False, "", d  # e.g. "Parc X-Nord" / "Parc X-Sud", "Vieux palais ..." / "Palais ...", "... II" / "... III"
    ca, cb = content_key(ka), content_key(kb)
    if ca == cb:
        return True, "same name except articles/prepositions", d
    ratio = difflib.SequenceMatcher(None, ca, cb).ratio()
    if ratio >= DEDUPE_SIMILARITY and len(ca.split()) == len(cb.split()):
        return True, f"near-identical name ({ratio:.2f})", d
    short, long_ = sorted((ka, kb), key=len)
    if len(short) >= 10 and long_.startswith(short + " ") and (
            a["category"] == b["category"] or {a["category"], b["category"]} <= COMPATIBLE):
        return True, "name is a prefix of the other", d
    return False, "", d


def sort_key(r):
    return (SOURCE_PRIORITY.get(r["source_name"], 9), r.get("level") or "niveau 9",
            numeric_sort_key(r["source_record_id"]))


def dedupe(cat: Catalogue) -> None:
    cell = 0.002  # ~200 m
    grid: dict[tuple, list] = {}
    kept = []
    for r in sorted(cat.records, key=sort_key):
        r["_key"] = name_key(r["name"])
        gx, gy = int(r["lng"] // cell), int(r["lat"] // cell)
        dup = None
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for k in grid.get((gx + dx, gy + dy), []):
                    ok, why, d = is_duplicate(k, r)
                    if ok and (dup is None or d < dup[2]):
                        dup = (k, why, d)
        if dup:
            k, why, d = dup
            if not k["description"] and r["description"]:
                k["description"] = r["description"]
            if not k["address"] and r["address"]:
                k["address"] = r["address"]
            cat.merges.append({"kept": k, "dropped": r, "reason": why, "distance_m": d})
            continue
        grid.setdefault((gx, gy), []).append(r)
        kept.append(r)
    cat.records = kept


def match_polygons(cat: Catalogue, espaces, attr_groups, op: Overpass) -> dict:
    stats = {"montreal": 0, "osm": 0, "area_radius": 0, "ambiguous": []}
    groups = espaces["groups"] if espaces else None
    by_oid = espaces["by_oid"] if espaces else {}
    for r in cat.records:
        ov = r["override"]
        r["polygon"] = None
        # 1) curated espace vert reference
        ref = ov.get("espace_vert_index")
        g = (groups or {}).get(ref) or by_oid.get(ref) if ref else None
        if g:
            if point_in_mp(r["lng"], r["lat"], g["mp"]) or dist_point_to_mp_m(r["lng"], r["lat"], g["mp"]) <= 250:
                r["polygon"] = ("montreal", ref, g["mp"], g["area_m2"])
            else:
                stats["ambiguous"].append(f"{r['name']}: curated polygon {ref} is more than 250 m away; not attached")
        # 2) parks: automatic name + location match
        if r["polygon"] is None and groups and r["category"] == "park":
            ck = core_key(r["name"])
            cands = []
            for g in groups.values():
                if ck and ck in g["cores"]:
                    x0, y0, x1, y1 = g["bbox"]
                    if not (x0 - 0.003 <= r["lng"] <= x1 + 0.003 and y0 - 0.002 <= r["lat"] <= y1 + 0.002):
                        continue
                    inside = point_in_mp(r["lng"], r["lat"], g["mp"])
                    d = 0.0 if inside else dist_point_to_mp_m(r["lng"], r["lat"], g["mp"])
                    if d <= 100:
                        cands.append((d, -g["area_m2"], g["key"], g))
            cands.sort(key=lambda t: t[:3])
            uniq = {c[2] for c in cands}
            if cands:
                g = cands[0][3]
                if len(uniq) > 1 and cands[0][0] > 0:
                    stats["ambiguous"].append(f"{r['name']}: several green spaces match ({', '.join(sorted(uniq))}); not attached")
                elif g["area_m2"] >= POLYGON_MIN_AREA_M2:
                    r["polygon"] = ("montreal", g["key"], g["mp"], g["area_m2"])
        # 3) curated OSM lookup
        if r["polygon"] is None and ov.get("osm_polygon"):
            spec = ov["osm_polygon"]
            found = osm_polygon_near(op, spec["name_regex"], r["lat"], r["lng"], int(spec.get("around_m", 300)))
            if found:
                osm_id, area, mp = found
                r["polygon"] = ("osm", osm_id, mp, area)
                r["needs_review"] = True
                r["review_notes"].append(
                    f"geofence_polygon from OpenStreetMap {osm_id} (© OpenStreetMap contributors, ODbL-1.0)")
        # Radius from area (parks without a curated radius)
        area = r["polygon"][3] if r["polygon"] else None
        if area is None and r["category"] == "park" and attr_groups:
            area = park_area_from_table(r, attr_groups, stats)
        r["area_m2"] = area
        if r["polygon"]:
            stats["montreal" if r["polygon"][0] == "montreal" else "osm"] += 1
    return stats


def park_area_from_table(r, attr_groups, stats):
    ck = core_key(r["name"])
    if not ck:
        return None
    cands = [g for g in attr_groups.values() if ck in {core_key(n) for n in g["names"] if n}]
    if not cands:
        return None
    nb = fold_key(r["neighbourhood"] or "")
    same = [g for g in cands if any(fold_key(x) == nb for x in g["gestion"])]
    pick = same if same else ([g for g in cands if not any(
        fold_key(x) != nb and not re.search(r"(?i)service|autre", x) for x in g["gestion"])] if len(cands) == 1 else [])
    if len(pick) != 1:
        return None
    stats["area_radius"] += 1
    return pick[0]["area_m2"] or None


def assign_radius(cat: Catalogue) -> None:
    for r in cat.records:
        ov = r["override"]
        if ov.get("geofence_radius_m"):
            radius, how = int(ov["geofence_radius_m"]), "curated"
        elif r["category"] == "park" and r.get("area_m2"):
            radius, how = round(1.1 * math.sqrt(r["area_m2"] / math.pi)), "park area"
            radius = max(40, min(1500, radius))
        else:
            radius, how = DEFAULT_RADIUS[r["category"]], "category default"
        r["radius"] = max(RADIUS_MIN, min(RADIUS_MAX, radius))
        r["radius_how"] = how


def ensure_required(cat: Catalogue, op: Overpass) -> list[dict]:
    status = []
    for req in cat.overrides.get("required", []):
        rx = re.compile(req["name_regex"], re.I)
        hits = [r for r in cat.records
                if rx.search(r["name"].lower().replace("’", "'")) or rx.search(ascii_fold(r["name"]).lower())]
        if hits:
            status.append({"label": req["label"], "status": "present", "record": hits[0]})
            continue
        osm = req.get("osm")
        found = osm and osm_find_place(op, osm["name_regex"], osm["lat"], osm["lng"], int(osm.get("around_m", 500)))
        if not found:
            status.append({"label": req["label"], "status": "MISSING (OSM lookup unavailable or no match)"})
            continue
        name = clean_text(found["tags"].get("name:fr") or found["tags"].get("name")) or req["label"]
        rec = {
            "source_name": SRC_OSM["source_name"], "source_record_id": found["id"],
            "source_url": f"https://www.openstreetmap.org/{found['id']}", "source_license": ODBL,
            "name": name, "category": req.get("category", "landmark"), "lat": found["lat"], "lng": found["lng"],
            "address": None, "neighbourhood": None, "description": None, "source_type": "osm",
            "level": "", "needs_review": True, "override": {"geofence_radius_m": req.get("geofence_radius_m")},
            "review_notes": ["added from OpenStreetMap because the municipal sources lack it "
                             "(© OpenStreetMap contributors, ODbL-1.0); check licence compatibility and position"],
            "polygon": None, "area_m2": None, "_key": name_key(name),
        }
        cat.records.append(rec)
        status.append({"label": req["label"], "status": f"added from OSM {found['id']}", "record": rec})
    return status


def assign_slugs(records: list[dict]) -> None:
    """base, base-2, base-3... in (source priority, source_record_id) order."""
    used: set[str] = set()
    for r in sorted(records, key=lambda r: (SOURCE_PRIORITY.get(r["source_name"], 9),
                                            numeric_sort_key(r["source_record_id"]))):
        base = slugify(r["name"])
        slug, n = base, 1
        while slug in used:
            n += 1
            slug = f"{base}-{n}"
        used.add(slug)
        r["slug"] = slug


# ---------------------------------------------------------------------------
# SQL output
# ---------------------------------------------------------------------------

def q(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    s = str(v).replace("\x00", "")
    return "'" + s.replace("'", "''") + "'"


def geog_sql(mp) -> str:
    gj = mp_geojson(mp)
    return ("extensions.st_multi(extensions.st_collectionextract(extensions.st_makevalid("
            f"extensions.st_setsrid(extensions.st_geomfromgeojson({q(gj)}),4326)),3))::extensions.geography")


def fmt_coord(x: float) -> str:
    return f"{x:.7f}".rstrip("0").rstrip(".")


def header(title: str, date: str, lines: list[str]) -> str:
    out = [f"-- {title}",
           f"-- GENERATED FILE - do not edit by hand. Re-run: python3 -I {SCRIPT_REL}",
           f"-- Generated: {date}",
           "--"]
    out += [f"-- {ln}" if ln else "--" for ln in lines]
    return "\n".join(out) + "\n"


def write_boundary_sql(path, boundary, date, fx) -> dict:
    mp_raw = boundary["mp"]
    total_area = mp_area_m2(mp_raw)
    for tol in BOUNDARY_TOLERANCE_M:
        mp, dropped = simplify_mp(mp_raw, tol, BOUNDARY_MIN_ISLET_M2)
        gj = mp_geojson(mp)
        if len(gj) <= BOUNDARY_MAX_BYTES:
            break
    area = mp_area_m2(mp)
    verts_in = sum(len(r) for p in mp_raw for r in p)
    verts_out = sum(len(r) for p in mp for r in p)
    info = {"polygons_in": len(mp_raw), "polygons_out": len(mp), "tolerance_m": tol,
            "area_in_km2": total_area / 1e6, "area_out_km2": area / 1e6, "dropped_islets_m2": dropped,
            "vertices_in": verts_in, "vertices_out": verts_out, "crs": boundary["crs"]}
    lines = [
        "Service area 'montreal-island' = land of the island of Montréal and the adjacent islets in the",
        "official 'Limites terrestres' dataset (all polygons of the file except islets under "
        f"{BOUNDARY_MIN_ISLET_M2:.0f} m2).",
        f"Source: {SRC_BOUNDARY['title']}, {SRC_BOUNDARY['page']}",
        f"Licence: {SRC_BOUNDARY['license']} (Creative Commons Attribution 4.0). Attribution: Ville de Montréal.",
        (f"Input CRS {boundary['crs']} (WGS84 longitude/latitude); no reprojection needed."
         if boundary["crs"] == "EPSG:4326" else
         f"Input CRS {boundary['crs']} -> EPSG:4326 (pure-Python inverse transverse Mercator, MTM zone 8)."),
        f"Douglas-Peucker simplification, tolerance {tol:g} m: {verts_in} -> {verts_out} vertices, "
        f"{len(mp_raw)} -> {len(mp)} polygons, area {total_area/1e6:.3f} -> {area/1e6:.3f} km2.",
        f"Input (sha256): {boundary['input']}={fx.inputs.get(boundary['input'], '?')[:12]}",
        "Requires migration 007 (public.service_areas).",
    ]
    sql = header("008_montreal_island_boundary.sql - Montréal Island service area", date, lines)
    sql += (
        "\ninsert into public.service_areas (id, name, geom, source_name, source_url, source_license, updated_at)\n"
        "values (\n"
        "  'montreal-island',\n"
        "  'Île de Montréal',\n"
        f"  {geog_sql(mp)},\n"
        f"  {q(SRC_BOUNDARY['source_name'])},\n"
        f"  {q(SRC_BOUNDARY['page'])},\n"
        f"  {q(SRC_BOUNDARY['license'])},\n"
        "  now()\n"
        ")\n"
        "on conflict (id) do update set\n"
        "  name = excluded.name,\n"
        "  geom = excluded.geom,\n"
        "  source_name = excluded.source_name,\n"
        "  source_url = excluded.source_url,\n"
        "  source_license = excluded.source_license,\n"
        "  updated_at = now();\n"
    )
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(sql)
    info["bytes"] = len(sql.encode())
    info["mp"] = mp
    return info


SEED_COLUMNS = ("slug", "name", "description", "category", "latitude", "longitude", "geofence_radius_m",
                "geofence_polygon", "address", "neighbourhood", "source_name", "source_url", "source_license",
                "source_record_id", "needs_review", "review_note", "is_active")


def write_seed_sql(path, records, date, fx, summary_lines, loaded_sources) -> int:
    recs = sorted(records, key=lambda r: (r["source_name"], numeric_sort_key(r["source_record_id"])))
    sql = [header("009_landmarks_seed.sql - landmark catalogue for Montréal Island", date, summary_lines)]
    sql.append("\nbegin;\n")
    update_cols = [c for c in SEED_COLUMNS if c not in ("slug", "source_name", "source_record_id")]
    for i in range(0, len(recs), BATCH_SIZE):
        batch = recs[i:i + BATCH_SIZE]
        sql.append(f"\n-- batch {i // BATCH_SIZE + 1}: rows {i + 1}-{i + len(batch)}\n")
        sql.append("insert into public.landmarks (" + ", ".join(SEED_COLUMNS) + ") values\n")
        rows = []
        for r in batch:
            poly = (geog_sql(r["polygon_simplified"]) if r.get("polygon_simplified") else "null::extensions.geography")
            note = "; ".join(r["review_notes"]) or None
            vals = [q(r["slug"]), q(r["name"]), q(r["description"]), q(r["category"]),
                    fmt_coord(r["lat"]), fmt_coord(r["lng"]), str(int(r["radius"])), poly,
                    q(r["address"]), q(r["neighbourhood"]), q(r["source_name"]), q(r["source_url"]),
                    q(r["source_license"]), q(r["source_record_id"]), q(bool(r["needs_review"])), q(note), "true"]
            rows.append("  (" + ", ".join(vals) + ")")
        sql.append(",\n".join(rows) + "\n")
        sql.append("on conflict (source_name, source_record_id) do update set\n")
        sql.append(",\n".join(f"  {c} = excluded.{c}" for c in update_cols) + ",\n  updated_at = now();\n")
    sql.append("\n-- Rows of these sources that are no longer in the import are deactivated (never deleted).\n")
    for src in sorted(loaded_sources):
        ids = sorted({r["source_record_id"] for r in recs if r["source_name"] == src}, key=numeric_sort_key)
        arr = "array[" + ",".join(q(x) for x in ids) + "]::text[]"
        sql.append("update public.landmarks set is_active = false, updated_at = now()\n"
                   f"where source_name = {q(src)} and is_active\n"
                   f"  and not (source_record_id = any ({arr}));\n")
    sql.append("\ncommit;\n")
    text = "".join(sql)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    return len(text.encode())


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def md_escape(s) -> str:
    return str(s if s is not None else "").replace("|", "\\|").replace("\n", " ")


def write_reports(cat, stats, date, warnings, boundary_info, required, counts, how_lieux, fx, enriched):
    by_reason: dict[str, int] = {}
    for s in cat.skipped:
        by_reason[s["reason"]] = by_reason.get(s["reason"], 0) + 1
    L = ["# Landmark import report", "",
         f"Generated {date} by `{SCRIPT_REL}`. Do not edit by hand; re-run the script.", ""]
    if warnings:
        L += ["## Warnings", ""] + [f"- {w}" for w in warnings] + [""]
    L += ["## Totals", "",
          f"- Landmarks written to 009: **{len(cat.records)}**",
          f"- Source A (Lieux d'intérêt) read via: {how_lieux}",
          f"- Records read: " + ", ".join(f"{k} {v}" for k, v in sorted(counts["read"].items())),
          f"- Skipped: {len(cat.skipped)} (see reasons below and `landmark_import_skipped.csv`)",
          f"- Duplicates merged: {len(cat.merges)}",
          f"- Polygons attached: {stats['montreal']} from Montréal green spaces, {stats['osm']} from OpenStreetMap",
          f"- Park radii derived from green-space area: {stats['area_radius']}",
          f"- Descriptions filled from montreal.ca 'Lieux' records: {enriched}",
          f"- Flagged needs_review: {sum(1 for r in cat.records if r['needs_review'])}", ""]
    L += ["## By category", "", "| category | count | radius (min/median/max) |", "|---|---:|---|"]
    for c in CATEGORIES:
        rs = sorted(r["radius"] for r in cat.records if r["category"] == c)
        if rs:
            L.append(f"| {c} | {len(rs)} | {rs[0]} / {rs[len(rs)//2]} / {rs[-1]} |")
    L += ["", "## By source", "", "| source_name | licence | count |", "|---|---|---:|"]
    for src in sorted({r["source_name"] for r in cat.records}):
        lic = sorted({r["source_license"] for r in cat.records if r["source_name"] == src})
        L.append(f"| {src} | {', '.join(lic)} | {sum(1 for r in cat.records if r['source_name'] == src)} |")
    L += ["", "## Required places", "", "| place | status | slug | lat, lng | radius | polygon |", "|---|---|---|---|---:|---|"]
    for s in required:
        r = s.get("record")
        if r:
            poly = f"{r['polygon'][0]} {r['polygon'][1]}" if r.get("polygon") else "none"
            L.append(f"| {s['label']} | {s['status']} | `{r.get('slug','')}` | {r['lat']:.6f}, {r['lng']:.6f} | "
                     f"{r.get('radius','')} | {poly} |")
        else:
            L.append(f"| {s['label']} | {s['status']} | | | | |")
    if boundary_info:
        b = boundary_info
        L += ["", "## Island boundary (008)", "",
              f"- Input CRS {b['crs']}, {b['polygons_in']} polygons, {b['vertices_in']} vertices, {b['area_in_km2']:.3f} km²",
              f"- Output: {b['polygons_out']} polygons, {b['vertices_out']} vertices, {b['area_out_km2']:.3f} km² "
              f"(tolerance {b['tolerance_m']:g} m, islets under {BOUNDARY_MIN_ISLET_M2:.0f} m² dropped: "
              f"{b['dropped_islets_m2']:.0f} m²), {b['bytes']} bytes"]
    L += ["", "## Skipped by reason", "", "| reason | count |", "|---|---:|"]
    for reason, n in sorted(by_reason.items(), key=lambda t: (-t[1], t[0])):
        L.append(f"| {md_escape(reason)} | {n} |")
    invalid = [s for s in cat.skipped if s["reason"].startswith(("invalid", "outside"))]
    L += ["", "## Invalid or outside the island", ""]
    if invalid:
        L += ["| source | id | name | reason | detail |", "|---|---|---|---|---|"]
        L += [f"| {s['source_name']} | {s['source_record_id']} | {md_escape(s['name'])} | {md_escape(s['reason'])} | {md_escape(s['detail'])} |"
              for s in invalid]
    else:
        L.append("None.")
    L += ["", "## Flagged for review (needs_review = true)", ""]
    flagged = [r for r in cat.records if r["needs_review"]]
    if flagged:
        L += ["| slug | source | id | note |", "|---|---|---|---|"]
        L += [f"| `{r['slug']}` | {r['source_name']} | {r['source_record_id']} | {md_escape('; '.join(r['review_notes']))} |"
              for r in sorted(flagged, key=lambda r: r["slug"])]
    else:
        L.append("None.")
    if stats["ambiguous"]:
        L += ["", "## Polygon matches not attached (ambiguous)", ""] + [f"- {md_escape(a)}" for a in sorted(stats["ambiguous"])]
    L += ["", "## Polygons attached", ""]
    pol = [r for r in cat.records if r.get("polygon")]
    if pol:
        L += ["| slug | from | ref | area (ha) |", "|---|---|---|---:|"]
        L += [f"| `{r['slug']}` | {r['polygon'][0]} | {r['polygon'][1]} | {r['polygon'][3] / 10000:.1f} |"
              for r in sorted(pol, key=lambda r: r["slug"])]
    else:
        L.append("None (polygon sources unavailable in this run, or no clear match).")
    L += ["", "## Duplicates merged", "", "| kept | dropped | reason | distance (m) |", "|---|---|---|---:|"]
    for m in sorted(cat.merges, key=lambda m: (m["kept"]["slug"], m["dropped"]["source_name"], m["dropped"]["source_record_id"])):
        k, d = m["kept"], m["dropped"]
        L.append(f"| `{k['slug']}` ({k['source_name']}:{k['source_record_id']}) | {md_escape(d['name'])} "
                 f"({d['source_name']}:{d['source_record_id']}) | {m['reason']} | {m['distance_m']:.0f} |")
    L += ["", "## Curated overrides applied", "", "| slug | radius | radius from | note |", "|---|---:|---|---|"]
    for r in sorted((r for r in cat.records if r["override"]), key=lambda r: r["slug"]):
        L.append(f"| `{r['slug']}` | {r['radius']} | {r['radius_how']} | {md_escape(r['override'].get('note', ''))} |")
    L += ["", "## Inputs", ""] + [f"- `{k}` sha256 `{v}`" for k, v in sorted(fx.inputs.items())] + [""]
    with open(REPORT_PATH, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(L))
    with open(SKIPPED_CSV_PATH, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["source_name", "source_record_id", "name", "source_type", "reason", "detail"],
                           lineterminator="\n")
        w.writeheader()
        for s in sorted(cat.skipped, key=lambda s: (s["source_name"], numeric_sort_key(s["source_record_id"]), s["reason"])):
            w.writerow(s)


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

def self_test() -> None:
    # MTM 8 round trip and known central-meridian value.
    for lon, lat in [(-73.5, 45.5), (-73.95, 45.42), (-73.47, 45.70), (-73.6165, 45.4919)]:
        e, n = MTM8.forward(lon, lat)
        lon2, lat2 = MTM8.inverse(e, n)
        assert abs(lon - lon2) < 1e-7 and abs(lat - lat2) < 1e-7, (lon, lat, lon2, lat2)  # < 1 cm
    e, n = MTM8.forward(-73.5, 45.0)
    assert abs(e - 304800) < 1e-6 and abs(n - 0.9999 * 4984944.378) < 0.01, (e, n)  # GRS80 meridian arc to 45°
    # Douglas-Peucker keeps a square, removes collinear points, never moves vertices.
    sq = [[-73.6, 45.5], [-73.6, 45.5005], [-73.6, 45.501], [-73.599, 45.501], [-73.599, 45.5], [-73.6, 45.5]]
    s = simplify_ring(sq, 5.0)
    assert len(s) == 5 and all(p in sq for p in s), s
    assert point_in_mp(-73.5995, 45.5005, [[s]]) and not point_in_mp(-73.598, 45.5005, [[s]])
    assert slugify("L’Oratoire Saint-Joseph du Mont-Royal") == "loratoire-saint-joseph-du-mont-royal"
    assert name_key("L’Oratoire Saint-Joseph") == "oratoire saint joseph"
    assert core_key("Parc du Mont-Royal") == core_key(espace_name({"Type": "Parc", "Lien": "du", "Nom": "Mont-Royal"}))
    assert trailing_numeral("edifice des sulpiciens ii") == "ii"
    rings = _stitch_rings([[[0, 0], [1, 0], [1, 1]], [[1, 1], [0, 1], [0, 0]]])
    assert rings and rings[0][0] == rings[0][-1]
    print("self-test OK")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cache", default=os.path.join(tempfile.gettempdir(), "migo-landmark-raw"),
                    help="directory for downloaded raw files (re-used on later runs)")
    ap.add_argument("--offline", action="store_true", help="only use files already in --cache")
    ap.add_argument("--refresh", action="store_true", help="ignore cached files and download again")
    ap.add_argument("--no-osm", action="store_true", help="never call the Overpass API")
    ap.add_argument("--boundary-file", help="use this limites-terrestres GeoJSON instead of downloading it")
    ap.add_argument("--require-boundary", action="store_true", help="fail if the island boundary is unavailable")
    ap.add_argument("--date", default=dt.datetime.now(dt.timezone.utc).date().isoformat(),
                    help="date written in the SQL headers (default: today, UTC)")
    ap.add_argument("--self-test", action="store_true", help="run the built-in geometry/name checks and exit")
    args = ap.parse_args(argv)
    if args.self_test:
        self_test()
        return 0

    with open(OVERRIDES_PATH, encoding="utf-8") as fh:
        overrides = json.load(fh)
    fx = Fetcher(args.cache, args.offline, args.refresh)
    op = Overpass(fx, enabled=not args.no_osm)
    warnings: list[str] = []
    counts = {"read": {}}
    loaded_sources = set()

    log("Island boundary")
    boundary = load_boundary(fx, args.boundary_file, warnings)
    if boundary is None and args.require_boundary:
        log("ERROR: island boundary unavailable and --require-boundary is set")
        return 2

    log("Source A: Lieux d'intérêt")
    lieux_rows, how_lieux = load_lieux(fx, warnings)
    counts["read"][SRC_LIEUX["source_name"]] = len(lieux_rows)
    loaded_sources.add(SRC_LIEUX["source_name"])

    log("Heritage buildings")
    try:
        edifices_rows = fx.datastore(SRC_EDIFICES["datastore_resource"])
        counts["read"][SRC_EDIFICES["source_name"]] = len(edifices_rows)
        loaded_sources.add(SRC_EDIFICES["source_name"])
    except FetchError as e:
        warnings.append(f"Heritage buildings unavailable ({e}); skipped (existing rows are left active).")
        edifices_rows = []

    log("Public-place descriptions")
    try:
        vocation_rows = fx.datastore(SRC_VOCATION["datastore_resource"])
    except FetchError as e:
        warnings.append(f"montreal.ca 'Lieux' descriptions unavailable ({e}).")
        vocation_rows = []

    log("Green spaces")
    espaces, attr_groups = load_espaces(fx, warnings)

    cat = Catalogue(overrides)
    build_lieux(cat, lieux_rows)
    build_edifices(cat, edifices_rows)

    boundary_info = None
    if boundary:
        log("Writing 008 (boundary)")
        boundary_info = write_boundary_sql(BOUNDARY_SQL, boundary, args.date, fx)
    validate_locations(cat, boundary_info["mp"] if boundary_info else None)
    enriched = enrich_descriptions(cat, vocation_rows)
    dedupe(cat)

    log("Polygons and radii")
    stats = match_polygons(cat, espaces, attr_groups, op)
    required = ensure_required(cat, op)
    for r in cat.records:
        if "area_m2" not in r:
            r["area_m2"] = None
    assign_radius(cat)
    assign_slugs(cat.records)
    for r in cat.records:
        if r.get("polygon"):
            simp, _ = simplify_mp(r["polygon"][2], POLYGON_TOLERANCE_M, 100.0)
            r["polygon_simplified"] = simp or None
            if not simp:
                r["polygon"] = None
    osm_failed_for_required = op.failed and any(s["status"].startswith("MISSING") for s in required)
    if any(r["source_name"] == SRC_OSM["source_name"] for r in cat.records) or not osm_failed_for_required:
        loaded_sources.add(SRC_OSM["source_name"])
    if op.errors:
        warnings.append(f"Overpass (OpenStreetMap) unavailable: {op.errors[0]}; OSM polygons/supplements skipped.")

    by_cat = {c: sum(1 for r in cat.records if r["category"] == c) for c in CATEGORIES}
    by_src = {}
    for r in cat.records:
        by_src[r["source_name"]] = by_src.get(r["source_name"], 0) + 1
    summary_lines = [
        f"{len(cat.records)} landmarks. By category: " + ", ".join(f"{c} {n}" for c, n in by_cat.items() if n) + ".",
        "By source: " + ", ".join(f"{k} {v}" for k, v in sorted(by_src.items())) + ".",
        f"Polygons attached: {stats['montreal'] + stats['osm']}. needs_review: "
        f"{sum(1 for r in cat.records if r['needs_review'])}. Skipped: {len(cat.skipped)}. Duplicates merged: {len(cat.merges)}.",
        "",
        "Sources and licences:",
        f"  {SRC_LIEUX['source_name']}: {SRC_LIEUX['title']}, {SRC_LIEUX['page']} ({CC_BY})",
        f"  {SRC_EDIFICES['source_name']}: {SRC_EDIFICES['title']}, {SRC_EDIFICES['page']} ({CC_BY})",
        f"  descriptions: {SRC_VOCATION['title']}, {SRC_VOCATION['page']} ({CC_BY})",
        f"  polygons/areas: {SRC_ESPACES['title']}, {SRC_ESPACES['page']} ({CC_BY})",
        f"  {SRC_OSM['source_name']}: © OpenStreetMap contributors, {SRC_OSM['page']} ({ODBL}); only rows/polygons noted in review_note",
        "Attribution: contains data from Ville de Montréal (CC BY 4.0).",
        "",
        "Upsert key (source_name, source_record_id): ids are stable across re-runs and slug is never overwritten.",
        "Rows from the sources listed at the end that are missing from this import are set is_active = false.",
        "Requires migration 007 (public.landmarks).",
        "Inputs (sha256): " + ", ".join(f"{k}={v[:12]}" for k, v in sorted(fx.inputs.items())),
    ]
    log("Writing 009 (landmarks)")
    seed_bytes = write_seed_sql(SEED_SQL, cat.records, args.date, fx, summary_lines, loaded_sources)
    write_reports(cat, stats, args.date, warnings, boundary_info, required, counts, how_lieux, fx, enriched)

    # Console summary
    print(f"Landmarks: {len(cat.records)}  (009: {seed_bytes} bytes)")
    print("By category: " + ", ".join(f"{c}={n}" for c, n in by_cat.items() if n))
    print("By source:   " + ", ".join(f"{k}={v}" for k, v in sorted(by_src.items())))
    reasons = {}
    for s in cat.skipped:
        reasons[s["reason"]] = reasons.get(s["reason"], 0) + 1
    print(f"Skipped: {len(cat.skipped)}")
    for k, v in sorted(reasons.items(), key=lambda t: (-t[1], t[0])):
        print(f"  {v:5d}  {k}")
    print(f"Duplicates merged: {len(cat.merges)}")
    print(f"Polygons attached: montreal={stats['montreal']} osm={stats['osm']}; park radii from area: {stats['area_radius']}")
    print(f"needs_review: {sum(1 for r in cat.records if r['needs_review'])}")
    for s in required:
        print(f"Required: {s['label']}: {s['status']}")
    if boundary_info:
        print(f"008: {boundary_info['polygons_out']} polygons, {boundary_info['vertices_out']} vertices, "
              f"{boundary_info['bytes']} bytes")
    for w in warnings:
        print(f"WARNING: {w}")
    print(f"Report: {os.path.relpath(REPORT_PATH)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
