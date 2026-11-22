#!/usr/bin/env node
// MIGO landmark import: open data -> deterministic seed SQL for Supabase.
//
// Dependency-free Node ESM (built-ins only, Node 20+). It downloads (or re-uses
// from --cache) the Montréal open-data files and an optional OpenStreetMap
// supplement, normalises / filters / dedupes them, and writes:
//   backend/supabase/migrations/008_montreal_island_boundary.sql
//   backend/supabase/migrations/009_landmarks_seed.sql (+ 010_..., 011_... if split)
//   backend/data/landmark_import_report.md
// Curated corrections live in backend/data/landmark_overrides.json.
//
// Usage:
//   node backend/scripts/import_landmarks.mjs --cache /private/tmp/migo-landmark-raw [--refresh] [--no-osm]
//
// Downloaded files are untrusted data: they are only parsed as JSON, never executed.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(SCRIPT_DIR, '..');
const MIGRATIONS_DIR = path.join(BACKEND_DIR, 'supabase', 'migrations');
const DATA_DIR = path.join(BACKEND_DIR, 'data');
const OVERRIDES_FILE = path.join(DATA_DIR, 'landmark_overrides.json');
const REPORT_FILE = path.join(DATA_DIR, 'landmark_import_report.md');
const SCRIPT_REL = 'backend/scripts/import_landmarks.mjs';

// Fixed namespace for landmark ids: uuid v5 of `${source_name}:${source_record_id}`.
// Never change it, or every landmark id changes.
const MIGO_LANDMARK_NAMESPACE = 'd5fd9932-fa82-49f0-bc93-11d22086fc71';

// Montréal's servers answer "RBAC: access denied" without a browser-like UA.
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const OSM_UA = 'MIGO-landmark-import/1.0 (hackathon project; Node fetch)';

const MAX_SQL_FILE_BYTES = 1_450_000; // each file is pasted into the Supabase SQL editor
const BOUNDARY_TOLERANCE_M = 5;
const LANDMARK_POLYGON_TOLERANCE_M = 3;
const ROWS_PER_INSERT = 100;

const SOURCES = {
  lieux: {
    key: 'lieux',
    source_name: 'montreal-lieux-interet',
    title: "Lieux d'intérêt (Ville de Montréal)",
    dataset_url: 'https://donnees.montreal.ca/dataset/763fe3b8-cdc3-4b8a-bbbd-a0a9bc587c56',
    download_url: 'https://donnees.montreal.ca/dataset/763fe3b8-cdc3-4b8a-bbbd-a0a9bc587c56/resource/5ca7cdb8-f86f-4038-b5a8-657446c75427/download/lieux_d_interet.geojson',
    file: 'lieux_d_interet.geojson',
    license: 'CC-BY-4.0',
  },
  boundary: {
    key: 'boundary',
    source_name: 'montreal-limites-terrestres',
    title: "Limites terrestres de l'île de Montréal (Ville de Montréal)",
    dataset_url: 'https://donnees.montreal.ca/dataset/b628f1da-9dc3-4bb1-9875-1470f891afb1',
    download_url: 'https://donnees.montreal.ca/dataset/b628f1da-9dc3-4bb1-9875-1470f891afb1/resource/92cb062a-11be-4222-9ea5-867e7e64c5ff/download/limites-terrestres.geojson',
    file: 'limites-terrestres.geojson',
    license: 'CC-BY-4.0',
  },
  parks: {
    key: 'parks',
    source_name: 'montreal-grands-parcs',
    title: "Grands parcs, parcs d'arrondissements et espaces publics (Ville de Montréal)",
    dataset_url: 'https://donnees.montreal.ca/dataset/2e9e4d2f-173a-4c3d-a5e3-565d79baa27d',
    download_url: 'https://donnees.montreal.ca/dataset/2e9e4d2f-173a-4c3d-a5e3-565d79baa27d/resource/35796624-15df-4503-a569-797665f8768e/download/espace_vert.json',
    file: 'espace_vert.json',
    license: 'CC-BY-4.0',
  },
  lpc: {
    key: 'lpc',
    source_name: 'montreal-patrimoine-lpc',
    title: 'Sites et immeubles protégés en vertu de la Loi sur le patrimoine culturel (Ville de Montréal)',
    dataset_url: 'https://donnees.montreal.ca/dataset/41fcc790-e328-44be-bcbf-73556fa0bc32',
    download_url: 'https://donnees.montreal.ca/dataset/41fcc790-e328-44be-bcbf-73556fa0bc32/resource/b0a6cfa4-ad77-4f5b-bd1b-050fe233a31f/download/patrimoinelpc.geojson',
    file: 'patrimoinelpc.geojson',
    license: 'CC-BY-4.0',
  },
  osm: {
    key: 'osm',
    source_name: 'openstreetmap',
    title: 'OpenStreetMap (Overpass API), © OpenStreetMap contributors',
    dataset_url: 'https://www.openstreetmap.org/copyright',
    download_url: 'https://overpass-api.de/api/interpreter',
    file: 'overpass_montreal.json',
    license: 'ODbL-1.0',
  },
};

const LANDMARK_SOURCE_ORDER = ['montreal-lieux-interet', 'montreal-grands-parcs', 'montreal-patrimoine-lpc', 'openstreetmap'];

const CATEGORIES = ['landmark', 'museum', 'park', 'historic', 'architecture', 'religious', 'culture', 'viewpoint', 'market', 'public-art', 'campus', 'other'];

const DEFAULT_RADIUS = {
  'public-art': 25,
  viewpoint: 40,
  museum: 50,
  culture: 50,
  landmark: 60,
  architecture: 60,
  religious: 60,
  historic: 60,
  market: 60,
  other: 60,
  park: 120,
  campus: 200,
};

// Lieux d'intérêt: which `Type` values are discoverable, and as what.
// Anything not listed is dropped with reason "type not discoverable".
const LIEUX_TYPE_RULES = {
  'Attrait touristique culturel': { category: 'landmark' },
  'Attrait touristique sportif ou récréatif': { category: 'landmark' },
  'Attrait touristique commercial': { category: 'landmark' },
  'Bâtiment historique / patrimonial': { category: 'historic', religiousByName: true },
  'Bâtiment architectural / design': { category: 'architecture', religiousByName: true },
  'Place publique': { category: 'landmark' },
  'Art public': { category: 'public-art' },
  "Musée et centre d'interprétation / d'exposition": { category: 'museum', religiousByName: true },
  'Musée municipal': { category: 'museum' },
  "Galerie d'art": { category: 'culture' },
  'Théâtre / salle de spectacle / petit lieu de diffusion': { category: 'culture' },
  'Lieu de diffusion municipal': { category: 'culture' },
  'Cinéma': { category: 'culture' },
  'Bibliothèque publique': { category: 'culture' },
  'Marché public': { category: 'market' },
  'Artère commerciale': { category: 'market' },
  'Parc': { category: 'park' },
  'Cégep et université': { category: 'campus', maxNiveau: 1, dropReason: 'college niveau 2-4 (private/vocational schools in office buildings)' },
  "Centre de congrès / d'exposition": { category: 'architecture', maxNiveau: 1, dropReason: 'convention/exhibition centre niveau 2-4' },
  'Gare de train': { category: 'architecture', maxNiveau: 1, dropReason: 'commuter train station (transit service)' },
  'Équipement sportif extérieur': { category: 'landmark', maxNiveau: 1, dropReason: 'local outdoor sports facility' },
  'Hôtel de ville / mairie': { category: 'historic', nameMatch: /^Hôtel de ville de Montréal$/u, dropReason: 'borough hall (municipal service)' },
};

// Name-based drops (applied to kept types).
const LIEUX_NAME_DROPS = [
  { re: /^parc[- ]école\b/iu, reason: 'schoolyard park (parc-école)' },
  { re: /(^|[^\p{L}])canin(e)?([^\p{L}]|$)/iu, reason: 'dog run' },
  { re: /jardin communautaire/iu, reason: 'community garden plots' },
];

const RELIGIOUS_RE = /(^|[^\p{L}])(basilique|église|eglise|cathédrale|cathedrale|chapelle|oratoire|sanctuaire|temple|synagogue|mosquée|mosquee|monastère|monastere|church|cathedral|congregation|gurdwara)([^\p{L}]|$)/iu;

const LPC_KEEP_ZONES = ['IC', 'BC', 'SC', 'SP', 'SD'];
const LPC_ZONE_PRIORITY = { SD: 0, SC: 1, IC: 2, SP: 3, BC: 4 };
const LPC_ZONE_PROMINENCE = { SD: 2, SC: 3, IC: 3, SP: 3, BC: 4 };
const LPC_POLYGON_MIN_AREA_M2 = 20_000; // >= 2 ha: campus/complex-type sites get a polygon
const DISTRICT_AREA_M2 = 500_000; // >= 50 ha non-park polygons overlap many landmarks -> review

const MATCH_DISTANCE_M = 150;
const SAME_NAME_DEDUPE_M = 75;
const SIMILAR_NAME_DEDUPE_M = 150;
const ESPACE_VERT_POLYGON_MIN_AREA_M2 = 50_000; // >= 5 ha non-"Grand parc" areas get a polygon
const POLYGON_CATEGORIES = new Set(['park', 'campus', 'historic', 'religious', 'landmark']);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { cache: path.join(os.tmpdir(), 'migo-landmark-raw'), refresh: false, osm: true, date: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cache') opts.cache = path.resolve(argv[++i]);
    else if (a === '--refresh') opts.refresh = true;
    else if (a === '--no-osm') opts.osm = false;
    else if (a === '--date') opts.date = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node backend/scripts/import_landmarks.mjs [--cache <dir>] [--refresh] [--no-osm] [--date YYYY-MM-DD]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${a}`);
  }
  if (opts.date && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) throw new Error('--date must be YYYY-MM-DD');
  return opts;
}

// ---------------------------------------------------------------------------
// Download / cache
// ---------------------------------------------------------------------------

function readManifest(cacheDir) {
  const p = path.join(cacheDir, 'manifest.json');
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

function writeManifest(cacheDir, manifest) {
  const sorted = {};
  for (const k of Object.keys(manifest).sort(cmp)) sorted[k] = manifest[k];
  fs.writeFileSync(path.join(cacheDir, 'manifest.json'), JSON.stringify(sorted, null, 2) + '\n');
}

async function fetchToFile(url, dest, { method = 'GET', body = null, headers = {}, timeoutMs = 180_000 } = {}) {
  const res = await fetch(url, { method, body, headers, signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString('utf8');
  if (/RBAC: access denied/.test(text.slice(0, 200))) throw new Error(`RBAC: access denied for ${url}`);
  JSON.parse(text); // must be JSON; throws otherwise
  fs.writeFileSync(dest + '.part', buf);
  fs.renameSync(dest + '.part', dest);
  return buf;
}

function recordManifest(manifest, src, file, url, fetchedAt) {
  const buf = fs.readFileSync(file);
  manifest[src.file] = {
    url,
    fetched_at: fetchedAt,
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  };
}

async function ensureSource(src, cacheDir, manifest, refresh) {
  const file = path.join(cacheDir, src.file);
  if (refresh || !fs.existsSync(file)) {
    console.log(`  downloading ${src.file} ...`);
    await fetchToFile(src.download_url, file, { headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json,*/*' } });
    recordManifest(manifest, src, file, src.download_url, new Date().toISOString());
  } else if (!manifest[src.file]) {
    recordManifest(manifest, src, file, src.download_url, fs.statSync(file).mtime.toISOString());
  } else {
    console.log(`  using cached ${src.file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const OSM_BBOX = '45.40,-73.98,45.71,-73.47';
const OSM_QUERY = `[out:json][timeout:180];
(
  nwr["tourism"~"^(museum|viewpoint)$"]["name"](${OSM_BBOX});
  nwr["tourism"~"^(attraction|gallery)$"]["name"]["wikidata"](${OSM_BBOX});
  nwr["historic"]["name"]["wikidata"](${OSM_BBOX});
);
out center tags;`;

async function ensureOsm(cacheDir, manifest, refresh) {
  const src = SOURCES.osm;
  const file = path.join(cacheDir, src.file);
  if (!refresh && fs.existsSync(file)) {
    if (!manifest[src.file]) recordManifest(manifest, src, file, src.download_url, fs.statSync(file).mtime.toISOString());
    console.log(`  using cached ${src.file}`);
    return { data: JSON.parse(fs.readFileSync(file, 'utf8')), error: null };
  }
  try {
    console.log('  querying Overpass API (can take ~1 min) ...');
    await fetchToFile(src.download_url, file, {
      method: 'POST',
      body: new URLSearchParams({ data: OSM_QUERY }).toString(),
      headers: { 'User-Agent': OSM_UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      timeoutMs: 240_000,
    });
    recordManifest(manifest, src, file, src.download_url, new Date().toISOString());
    return { data: JSON.parse(fs.readFileSync(file, 'utf8')), error: null };
  } catch (err) {
    return { data: null, error: String(err && err.message ? err.message : err) };
  }
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; } // code-point order, locale-independent

function cleanText(s) {
  if (s === null || s === undefined) return null;
  const t = String(s).normalize('NFC').replace(/[\s   ​]+/gu, ' ').trim();
  return t.length ? t : null;
}

function foldAscii(s) {
  return s.replace(/[œŒ]/g, (c) => (c === 'œ' ? 'oe' : 'OE')).replace(/[æÆ]/g, (c) => (c === 'æ' ? 'ae' : 'AE'))
    .replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function slugify(s) {
  return foldAscii(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function truncateSlug(s, max) {
  if (s.length <= max) return s;
  let t = s.slice(0, max);
  if (s[max] !== '-' && t.includes('-')) t = t.replace(/-[^-]*$/, '');
  return t.replace(/-+$/g, '');
}

const STOPWORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'the', 'of', 'au', 'aux', 'a', 'en', 'sur']);
const GENERIC_TOKENS = new Set(['parc', 'place', 'square', 'eglise', 'maison', 'rue', 'cimetiere', 'universite', 'ecole', 'college', 'musee', 'centre', 'site', 'patrimonial', 'saint', 'sainte', 'montreal', 'nature', 'jardin', 'edifice', 'ancien', 'ancienne']);
const NAME_PREFIXES = ['site patrimonial', 'site historique', 'site archeologique', 'lieu historique national canada', 'lieu historique national'];

function nameTokens(s) {
  const t = foldAscii(s).toLowerCase().replace(/[’'`´]/g, ' ').replace(/[^a-z0-9]+/g, ' ');
  return t.split(' ').filter(Boolean).map((w) => (w === 'st' ? 'saint' : w === 'ste' ? 'sainte' : w)).filter((w) => !STOPWORDS.has(w));
}

function nameVariants(name) {
  const key = nameTokens(name).join(' ');
  const out = new Set([key]);
  for (const p of NAME_PREFIXES) if (key.startsWith(p + ' ')) out.add(key.slice(p.length + 1));
  return [...out].filter(Boolean);
}

function bigrams(s) {
  const t = s.replace(/ /g, '');
  const m = new Map();
  for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); }
  return m;
}

function dice(a, b) {
  if (a === b) return 1;
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, na = 0, nb = 0;
  for (const v of A.values()) na += v;
  for (const v of B.values()) nb += v;
  for (const [g, v] of A) inter += Math.min(v, B.get(g) || 0);
  return na + nb === 0 ? 0 : (2 * inter) / (na + nb);
}

function tokenSubset(a, b) {
  const ta = a.split(' '), tb = b.split(' ');
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length < 2) return false;
  if (!short.some((t) => !GENERIC_TOKENS.has(t) && !/^\d+$/.test(t))) return false;
  if (short.length / long.length < 0.5) return false; // e.g. "mont royal" must not match "oratoire saint joseph mont royal"
  const L = new Set(long);
  return short.every((t) => L.has(t));
}

// 'exact' | 'similar' | null. withSubset: allow token-subset matches (cross-source only).
function namesMatch(namesA, namesB, withSubset) {
  const va = namesA.flatMap(nameVariants), vb = namesB.flatMap(nameVariants);
  for (const x of va) for (const y of vb) if (x === y) return 'exact';
  for (const x of va) for (const y of vb) {
    if (dice(x, y) >= 0.85) return 'similar';
    if (withSubset && tokenSubset(x, y)) return 'similar';
  }
  return null;
}

// ---------------------------------------------------------------------------
// UUID v5
// ---------------------------------------------------------------------------

function uuidv5(name, namespace) {
  const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const h = crypto.createHash('sha1').update(ns).update(Buffer.from(name, 'utf8')).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

// ---------------------------------------------------------------------------
// Geometry (lon/lat arrays; metric work in a local equirectangular projection)
// ---------------------------------------------------------------------------

const LAT0 = 45.55, LON0 = -73.7;
const PHI0 = (LAT0 * Math.PI) / 180;
const M_PER_DEG_LAT = 111132.954 - 559.822 * Math.cos(2 * PHI0) + 1.175 * Math.cos(4 * PHI0);
const M_PER_DEG_LON = 111412.84 * Math.cos(PHI0) - 93.5 * Math.cos(3 * PHI0);

function toXY(p) { return [(p[0] - LON0) * M_PER_DEG_LON, (p[1] - LAT0) * M_PER_DEG_LAT]; }
function fromXY(q) { return [q[0] / M_PER_DEG_LON + LON0, q[1] / M_PER_DEG_LAT + LAT0]; }

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371008.8, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function round6(v) { return Math.round(v * 1e6) / 1e6; }

function ringAreaXY(ring) { // signed, m²
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = toXY(ring[i]), b = toXY(ring[i + 1]);
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
function polygonArea(poly) { // poly = [outer, ...holes]
  let a = Math.abs(ringAreaXY(poly[0]));
  for (let i = 1; i < poly.length; i++) a -= Math.abs(ringAreaXY(poly[i]));
  return Math.max(0, a);
}
function multiArea(polys) { return polys.reduce((s, p) => s + polygonArea(p), 0); }

function bboxOf(polys) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polys) for (const ring of poly) for (const p of ring) {
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
  }
  return [minX, minY, maxX, maxY];
}

function pointInRing(pt, ring) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInPolygon(pt, poly) {
  if (!pointInRing(pt, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) if (pointInRing(pt, poly[i])) return false;
  return true;
}

function segDist2XY(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const ex = a[0] + t * dx - p[0], ey = a[1] + t * dy - p[1];
  return ex * ex + ey * ey;
}

// Shape with cached bbox for fast queries.
function makeShape(polys) {
  return { polys, bbox: bboxOf(polys), area: multiArea(polys) };
}

function bboxDistanceM(pt, bbox) {
  const dx = pt[0] < bbox[0] ? bbox[0] - pt[0] : pt[0] > bbox[2] ? pt[0] - bbox[2] : 0;
  const dy = pt[1] < bbox[1] ? bbox[1] - pt[1] : pt[1] > bbox[3] ? pt[1] - bbox[3] : 0;
  return Math.hypot(dx * M_PER_DEG_LON, dy * M_PER_DEG_LAT);
}

// Metres from a [lon,lat] point to a shape (0 when inside). Returns Infinity beyond `limit`.
function distanceToShape(pt, shape, limit = Infinity) {
  if (bboxDistanceM(pt, shape.bbox) > limit) return Infinity;
  for (const poly of shape.polys) if (pointInPolygon(pt, poly)) return 0;
  const p = toXY(pt);
  let best = Infinity;
  for (const poly of shape.polys) for (const ring of poly) {
    for (let i = 0; i < ring.length - 1; i++) {
      const d2 = segDist2XY(p, toXY(ring[i]), toXY(ring[i + 1]));
      if (d2 < best) best = d2;
    }
  }
  return Math.sqrt(best);
}

// A point guaranteed inside the largest polygon (centroid if inside, else scanline midpoint).
function pointOnSurface(polys) {
  let largest = polys[0], la = -1;
  for (const p of polys) { const a = polygonArea(p); if (a > la) { la = a; largest = p; } }
  const outer = largest[0];
  let cx = 0, cy = 0, a2 = 0;
  for (let i = 0; i < outer.length - 1; i++) {
    const p = toXY(outer[i]), q = toXY(outer[i + 1]);
    const c = p[0] * q[1] - q[0] * p[1];
    a2 += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c;
  }
  if (a2 !== 0) {
    const cand = fromXY([cx / (3 * a2), cy / (3 * a2)]);
    if (pointInPolygon(cand, largest)) return cand;
  }
  const bb = bboxOf([largest]);
  for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
    const y = bb[1] + (bb[3] - bb[1]) * f;
    const xs = [];
    for (const ring of largest) for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
      if ((y1 > y) !== (y2 > y)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
    xs.sort((m, n) => m - n);
    let bestW = -1, mid = null;
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > bestW) { bestW = xs[i + 1] - xs[i]; mid = (xs[i] + xs[i + 1]) / 2; }
    if (mid !== null && pointInPolygon([mid, y], largest)) return [mid, y];
  }
  return outer[0];
}

// --- Douglas–Peucker in metres -------------------------------------------------

function dpKeep(xy, tol) {
  const n = xy.length, keep = new Uint8Array(n);
  keep[0] = 1; keep[n - 1] = 1;
  const tol2 = tol * tol, stack = [[0, n - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = -1, idx = -1;
    for (let i = s + 1; i < e; i++) { const d = segDist2XY(xy[i], xy[s], xy[e]); if (d > maxD) { maxD = d; idx = i; } }
    if (idx >= 0 && maxD > tol2) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return keep;
}

// ring: closed [lon,lat][] (already rounded). Returns closed ring or null if it collapses.
function simplifyRing(ring, tol) {
  const pts = ring.slice(0, -1);
  if (tol <= 0 || pts.length < 4) return ring.length >= 4 ? ring : null;
  const xy = pts.map(toXY);
  let far = 0, fd = -1;
  for (let i = 1; i < xy.length; i++) { const d = (xy[i][0] - xy[0][0]) ** 2 + (xy[i][1] - xy[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const a = xy.slice(0, far + 1), b = xy.slice(far).concat([xy[0]]);
  const ka = dpKeep(a, tol), kb = dpKeep(b, tol);
  const out = [];
  for (let i = 0; i <= far; i++) if (ka[i]) out.push(pts[i]);
  for (let j = 1; j < b.length - 1; j++) if (kb[j]) out.push(pts[far + j]);
  if (out.length < 3) return null;
  out.push(out[0]);
  if (Math.abs(ringAreaXY(out)) < 1) return null;
  return out;
}

function cleanRing(ring) { // round to 6 decimals, drop consecutive duplicates, close
  const out = [];
  for (const p of ring) {
    const q = [round6(p[0]), round6(p[1])];
    if (!Number.isFinite(q[0]) || !Number.isFinite(q[1])) return null;
    const last = out[out.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q);
  }
  if (out.length && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) out.push(out[0]);
  return out.length >= 4 ? out : null;
}

function segsIntersect(p1, p2, p3, p4) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const onSeg = (a, b, c) => Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSeg(p3, p4, p1)) return true;
  if (d2 === 0 && onSeg(p3, p4, p2)) return true;
  if (d3 === 0 && onSeg(p1, p2, p3)) return true;
  if (d4 === 0 && onSeg(p1, p2, p4)) return true;
  return false;
}

// rings: array of closed rings. Returns Set of "i|j" ring-index pairs that intersect
// (excluding adjacent segments of the same ring).
function intersectingRingPairs(rings) {
  const CELL = 200; // metres
  const grid = new Map();
  const segs = [];
  rings.forEach((ring, ri) => {
    const n = ring.length - 1;
    for (let i = 0; i < n; i++) {
      const a = toXY(ring[i]), b = toXY(ring[i + 1]);
      const s = { ri, i, n, a, b };
      const id = segs.push(s) - 1;
      const x0 = Math.floor(Math.min(a[0], b[0]) / CELL), x1 = Math.floor(Math.max(a[0], b[0]) / CELL);
      const y0 = Math.floor(Math.min(a[1], b[1]) / CELL), y1 = Math.floor(Math.max(a[1], b[1]) / CELL);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const k = x * 100003 + y;
        let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); } arr.push(id);
      }
    }
  });
  const pairs = new Set();
  const seen = new Set();
  for (const arr of grid.values()) {
    for (let x = 0; x < arr.length; x++) for (let y = x + 1; y < arr.length; y++) {
      const s1 = segs[arr[x]], s2 = segs[arr[y]];
      if (s1.ri === s2.ri) {
        const di = Math.abs(s1.i - s2.i);
        if (di <= 1 || di === s1.n - 1) continue;
      }
      const pk = s1.ri < s2.ri ? `${s1.ri}|${s2.ri}` : `${s2.ri}|${s1.ri}`;
      if (pairs.has(pk)) continue;
      const sk = arr[x] < arr[y] ? `${arr[x]}:${arr[y]}` : `${arr[y]}:${arr[x]}`;
      if (seen.has(sk)) continue;
      seen.add(sk);
      if (segsIntersect(s1.a, s1.b, s2.a, s2.b)) pairs.add(pk);
    }
  }
  return pairs;
}

// Simplify a multipolygon (polys: [[outer, holes...], ...], coords lon/lat) at `tol` metres,
// re-simplifying any ring that gains an intersection with a smaller tolerance (down to none).
function simplifyMulti(polys, tol) {
  const orig = []; // flat list of {pi, ri, ring}
  polys.forEach((poly, pi) => poly.forEach((ring, ri) => { const c = cleanRing(ring); if (c) orig.push({ pi, ri, ring: c }); }));
  const baseline = intersectingRingPairs(orig.map((o) => o.ring));
  const tols = orig.map(() => tol);
  let cur = orig.map((o) => simplifyRing(o.ring, tol));
  let refinedRings = 0;
  for (let iter = 0; iter < 6; iter++) {
    const idx = [], rings = [];
    cur.forEach((r, k) => { if (r) { idx.push(k); rings.push(r); } });
    const pairs = intersectingRingPairs(rings);
    const bad = new Set();
    for (const pk of pairs) {
      const [a, b] = pk.split('|').map(Number);
      const oa = idx[a], ob = idx[b];
      const okey = oa < ob ? `${oa}|${ob}` : `${ob}|${oa}`;
      if (!baseline.has(okey)) { bad.add(oa); bad.add(ob); }
    }
    if (!bad.size) break;
    for (const k of bad) {
      if (tols[k] > 0) refinedRings++;
      tols[k] = tols[k] > 0.6 ? tols[k] / 2 : 0;
      cur[k] = tols[k] > 0 ? simplifyRing(orig[k].ring, tols[k]) : orig[k].ring;
    }
  }
  // Rebuild polygons: drop polygons whose outer ring collapsed, drop collapsed holes.
  const out = [];
  let droppedPolys = 0, droppedHoles = 0, vertsBefore = 0, vertsAfter = 0;
  const byPoly = new Map();
  orig.forEach((o, k) => {
    vertsBefore += o.ring.length;
    if (!byPoly.has(o.pi)) byPoly.set(o.pi, []);
    byPoly.get(o.pi).push({ ri: o.ri, ring: cur[k] });
  });
  for (const pi of [...byPoly.keys()].sort((a, b) => a - b)) {
    const rings = byPoly.get(pi).sort((a, b) => a.ri - b.ri);
    const outerEntry = rings.find((r) => r.ri === 0);
    if (!outerEntry || !outerEntry.ring) { droppedPolys++; continue; }
    const poly = [orientRing(outerEntry.ring, true)];
    for (const r of rings) if (r.ri !== 0) { if (r.ring) poly.push(orientRing(r.ring, false)); else droppedHoles++; }
    for (const r of poly) vertsAfter += r.length;
    out.push(poly);
  }
  return { polys: out, droppedPolys, droppedHoles, refinedRings, vertsBefore, vertsAfter, baselineIssues: baseline.size };
}

function orientRing(ring, ccw) { // RFC 7946: outer CCW, holes CW
  const a = ringAreaXY(ring);
  return (a > 0) === ccw ? ring : ring.slice().reverse();
}

function geomToPolys(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}

function multiToGeoJSON(polys) {
  return JSON.stringify({ type: 'MultiPolygon', coordinates: polys.map((poly) => poly.map((ring) => ring.map((p) => [round6(p[0]), round6(p[1])]))) });
}

// --- EPSG:2950 (NAD83(CSRS) / MTM zone 8) inverse/forward Transverse Mercator -----

const TM = (() => {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9999, lon0 = (-73.5 * Math.PI) / 180, FE = 304800, FN = 0;
  const e2 = 2 * f - f * f, ep2 = e2 / (1 - e2), e4 = e2 * e2, e6 = e4 * e2;
  const M = (phi) => a * ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi - ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) + ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) - ((35 * e6) / 3072) * Math.sin(6 * phi));
  function inverse(E, N) {
    const x = E - FE, y = N - FN;
    const mu = y / k0 / (a * (1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const phi1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
    const s = Math.sin(phi1), c = Math.cos(phi1), t = Math.tan(phi1);
    const C1 = ep2 * c * c, T1 = t * t, N1 = a / Math.sqrt(1 - e2 * s * s), R1 = (a * (1 - e2)) / (1 - e2 * s * s) ** 1.5, D = x / (N1 * k0);
    const phi = phi1 - ((N1 * t) / R1) * ((D * D) / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);
    const lam = lon0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) / c;
    return [(lam * 180) / Math.PI, (phi * 180) / Math.PI];
  }
  function forward(lonDeg, latDeg) {
    const phi = (latDeg * Math.PI) / 180, lam = (lonDeg * Math.PI) / 180;
    const s = Math.sin(phi), c = Math.cos(phi), t = Math.tan(phi);
    const N = a / Math.sqrt(1 - e2 * s * s), T = t * t, C = ep2 * c * c, A = (lam - lon0) * c;
    const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120);
    const y = k0 * (M(phi) + N * t * ((A * A) / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
    return [x + FE, y + FN];
  }
  return { inverse, forward };
})();

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

function sqlStr(s) {
  if (s === null || s === undefined) return 'null';
  const t = String(s);
  if (t.includes('\u0000')) throw new Error('NUL byte in SQL string');
  return "'" + t.replace(/'/g, "''") + "'";
}

function sqlPolygon(geojson) {
  return `extensions.st_multi(extensions.st_collectionextract(extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson(${sqlStr(geojson)}),4326)),3))`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  selfTests();
  fs.mkdirSync(opts.cache, { recursive: true });
  console.log(`Cache: ${opts.cache}`);
  const manifest = readManifest(opts.cache);

  const raw = {};
  for (const k of ['lieux', 'boundary', 'parks', 'lpc']) raw[k] = await ensureSource(SOURCES[k], opts.cache, manifest, opts.refresh);
  let osm = { data: null, error: 'disabled with --no-osm' };
  if (opts.osm) osm = await ensureOsm(opts.cache, manifest, opts.refresh);
  if (osm.error) console.log(`  OpenStreetMap supplement skipped: ${osm.error}`);
  writeManifest(opts.cache, manifest);

  const overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
  const ovr = overrides.records || {};
  const usedOverrides = new Set();

  const fetchedDates = ['lieux', 'boundary', 'parks', 'lpc', ...(osm.data ? ['osm'] : [])].map((k) => (manifest[SOURCES[k].file] || {}).fetched_at || '').filter(Boolean).sort(cmp);
  const runDate = opts.date || (fetchedDates.length ? fetchedDates[fetchedDates.length - 1].slice(0, 10) : '1970-01-01');

  const report = { skipped: new Map(), skippedExamples: new Map(), merges: [], polygons: [], notes: [], verification: [] };
  const skip = (source, reason, example) => {
    const k = `${source} — ${reason}`;
    report.skipped.set(k, (report.skipped.get(k) || 0) + 1);
    if (example) { const arr = report.skippedExamples.get(k) || []; if (arr.length < 4) arr.push(example); report.skippedExamples.set(k, arr); }
  };

  // ---------------- Boundary ----------------
  console.log('Building island boundary ...');
  const bFeatures = raw.boundary.features || [];
  // Holes in the land polygons are inland water (Lachine Canal, Old Port basins, park ponds,
  // the Jean-Drapeau basins). They are filled: someone on a pier or a pond shore is in Montréal.
  const bPolys = [];
  let filledHoles = 0;
  for (const f of bFeatures) for (const p of geomToPolys(f.geometry)) { filledHoles += p.length - 1; bPolys.push([p[0]]); }
  const bSimple = simplifyMulti(bPolys, BOUNDARY_TOLERANCE_M);
  // Deterministic order: largest first. Drop islets that sit inside a filled hole of a bigger polygon.
  const bySize = bSimple.polys.map((p) => ({ p, a: polygonArea(p) })).sort((x, y) => y.a - x.a || cmp(JSON.stringify(x.p[0][0]), JSON.stringify(y.p[0][0])));
  const islandPolys = [];
  let nestedIslets = 0;
  for (const { p } of bySize) {
    const probe = pointOnSurface([p]);
    if (islandPolys.some((q) => pointInRing(probe, q[0]))) { nestedIslets++; continue; }
    islandPolys.push(p);
  }
  const island = makeShape(islandPolys);
  const islandShapes = islandPolys.map((p) => makeShape([p]));
  const inIsland = (lon, lat) => islandShapes.some((s) => lon >= s.bbox[0] && lon <= s.bbox[2] && lat >= s.bbox[1] && lat <= s.bbox[3] && pointInPolygon([lon, lat], s.polys[0]));
  const boundaryGeojson = multiToGeoJSON(islandPolys);
  const boundaryStats = {
    features: bFeatures.length, inputPolygons: bPolys.length, outputPolygons: islandPolys.length,
    droppedPolys: bSimple.droppedPolys, droppedHoles: bSimple.droppedHoles, filledHoles, nestedIslets, refinedRings: bSimple.refinedRings,
    vertsBefore: bSimple.vertsBefore, vertsAfter: bSimple.vertsAfter, baselineIssues: bSimple.baselineIssues,
    totalAreaKm2: island.area / 1e6, largest: islandPolys.slice(0, 8).map((p) => ({ areaKm2: polygonArea(p) / 1e6, at: pointOnSurface([p]) })),
  };

  // ---------------- Lieux d'intérêt (A) ----------------
  console.log("Processing Lieux d'intérêt ...");
  const SRC_A = SOURCES.lieux;
  const candidates = []; // landmark candidates
  let coordMismatch = 0;
  for (const f of raw.lieux.features || []) {
    const p = f.properties || {};
    const rid = p.ID === undefined || p.ID === null ? null : String(p.ID);
    const name = cleanText(p['Nom français']);
    if (!rid) { skip('lieux', 'missing ID'); continue; }
    if (!name) { skip('lieux', 'missing name', rid); continue; }
    const key = `${SRC_A.source_name}:${rid}`;
    const o = ovr[key];
    if (o) usedOverrides.add(key);
    let lon = f.geometry && f.geometry.type === 'Point' ? Number(f.geometry.coordinates[0]) : Number(p.Longitude);
    let lat = f.geometry && f.geometry.type === 'Point' ? Number(f.geometry.coordinates[1]) : Number(p.Latitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || (lat === 0 && lon === 0)) { skip('lieux', 'missing/invalid coordinates', `${rid} ${name}`); continue; }
    if (Number.isFinite(Number(p.Latitude)) && haversine(lat, lon, Number(p.Latitude), Number(p.Longitude)) > 50) coordMismatch++;
    const type = cleanText(p.Type) || '';
    const niveau = Number(String(p.Classification || '').replace(/\D/g, '')) || 3;
    let category = null, dropReason = null;
    const rule = LIEUX_TYPE_RULES[type];
    if (!rule) dropReason = `type not discoverable: ${type || '(none)'}`;
    else if (rule.maxNiveau && niveau > rule.maxNiveau) dropReason = rule.dropReason;
    else if (rule.nameMatch && !rule.nameMatch.test(name)) dropReason = rule.dropReason;
    else {
      category = rule.category;
      for (const d of LIEUX_NAME_DROPS) if (d.re.test(name)) { dropReason = d.reason; break; }
      if (rule.religiousByName && RELIGIOUS_RE.test(name)) category = 'religious';
      if (category === 'landmark' && /^belvédère/iu.test(name)) category = 'viewpoint';
      if (category === 'landmark' && /^golf\b/iu.test(name)) category = 'other';
    }
    if (o && o.include) { dropReason = null; category = o.category || category || 'other'; }
    if (o && o.exclude) dropReason = `curated exclusion: ${o.exclude}`;
    if (dropReason) { skip('lieux', dropReason, `${rid} ${name}`); continue; }
    if (!inIsland(lon, lat)) { skip('lieux', 'outside island boundary', `${rid} ${name} (${lat.toFixed(5)},${lon.toFixed(5)})`); continue; }
    const num = cleanText(p['Numéro']);
    const rue = cleanText(p.rue);
    const ville = cleanText(p.Ville);
    const cp = cleanText(p['Code postal']);
    let address = [num && num !== '0' ? num : null, rue].filter(Boolean).join(' ');
    if (address && ville) address += `, ${ville}`;
    if (address && cp) address += ` ${cp}`;
    candidates.push({
      key, source: SRC_A, rid, name, altNames: [cleanText(p['Nom court'])].filter(Boolean),
      description: type, category, prominence: Math.min(4, Math.max(1, niveau)),
      lat, lon, polygon: null, radius: null, address: address || null, neighbourhood: cleanText(p.Arrondissement),
      merged: [], needsReview: false, reviewNotes: [], typeLabel: type, areaM2: null,
    });
  }
  if (coordMismatch) report.notes.push(`${coordMismatch} Lieux d'intérêt records have geometry differing >50 m from their Latitude/Longitude fields (geometry used).`);

  // Dedupe within A.
  const keptA = dedupeList(candidates, report, 'lieux');

  // ---------------- Espaces verts / Grands parcs (C) ----------------
  console.log('Processing parks / green spaces ...');
  const SRC_C = SOURCES.parks;
  const evFeatures = [];
  for (const f of raw.parks.features || []) {
    const p = f.properties || {};
    const polys = geomToPolys(f.geometry);
    if (!polys.length) { skip('parks', 'missing geometry'); continue; }
    const baseNom = cleanText(p.Nom);
    if (!baseNom) { skip('parks', 'missing name'); continue; }
    const fullName = joinParkName(cleanText(p.Type), p.Lien, baseNom);
    const clean = polys.map((poly) => poly.map(cleanRing).filter(Boolean)).filter((poly) => poly.length && poly[0]);
    if (!clean.length) { skip('parks', 'invalid geometry'); continue; }
    evFeatures.push({ oid: Number(p.OBJECTID), nom: baseNom, fullName, typo1: p.TYPO1 || null, typo2: p.TYPO2 || null, gestion: cleanText(p.GESTION), shape: makeShape(clean) });
  }
  // Groups: "Grand parc" by Nom (as published); everything else by normalised full name + manager.
  const evGroups = new Map();
  for (const f of evFeatures) {
    const grand = f.typo1 === 'Grand parc';
    const gk = grand ? `G|${f.nom}` : `E|${nameTokens(f.fullName).join(' ')}|${f.gestion || ''}`;
    if (!evGroups.has(gk)) evGroups.set(gk, { gk, grand, name: f.fullName, nom: f.nom, features: [] });
    evGroups.get(gk).features.push(f);
  }
  for (const g of evGroups.values()) {
    g.features.sort((a, b) => a.oid - b.oid);
    g.shape = makeShape(g.features.flatMap((f) => f.shape.polys));
    const bb = g.shape.bbox;
    const spread = Math.hypot((bb[2] - bb[0]) * M_PER_DEG_LON, (bb[3] - bb[1]) * M_PER_DEG_LAT);
    g.composite = g.name.includes(',') || (g.grand && spread > 5000);
    g.recordId = g.grand ? `grand-parc:${slugify(g.nom)}` : `objectid:${g.features.map((f) => f.oid).join('+')}`;
    g.gestion = g.features.map((f) => f.gestion).find((x) => x && x !== 'Autre') || null;
  }
  const groupList = [...evGroups.values()].sort((a, b) => cmp(a.gk, b.gk));

  // Attach polygons / area-based radii to A landmarks (two passes: find matches, then attach;
  // a group matched by several landmarks only gives each the pieces around its own point).
  const usedGrandGroups = new Set();
  const evMatches = [];
  for (const lm of keptA) {
    const pt = [lm.lon, lm.lat];
    let best = null;
    for (const g of groupList) {
      if (bboxDistanceM(pt, g.shape.bbox) > MATCH_DISTANCE_M) continue;
      const m = namesMatch([lm.name, ...lm.altNames], [g.name], true);
      if (!m) continue;
      const near = g.features.filter((f) => distanceToShape(pt, f.shape, MATCH_DISTANCE_M) <= MATCH_DISTANCE_M);
      if (!near.length) continue;
      const d = Math.min(...near.map((f) => distanceToShape(pt, f.shape)));
      const score = (m === 'exact' ? 0 : 1000) + d;
      if (!best || score < best.score) best = { g, m, near, d, score };
    }
    // Composite park-nature: no name match possible ("Grand parc de l'Ouest"), so accept containment.
    if (!best && lm.category === 'park' && /^parc-nature/iu.test(lm.name)) {
      for (const g of groupList) {
        if (!g.grand || !g.composite) continue;
        const inside = g.features.filter((f) => distanceToShape(pt, f.shape, 0) === 0);
        if (inside.length) { best = { g, m: 'containment', near: inside, d: 0, score: 5000 }; break; }
      }
    }
    if (best) evMatches.push({ lm, ...best });
  }
  const claims = new Map();
  for (const x of evMatches) claims.set(x.g.gk, (claims.get(x.g.gk) || 0) + 1);
  for (const { lm, g, m, near } of evMatches) {
    const pt = [lm.lon, lm.lat];
    const shared = claims.get(g.gk) > 1;
    let feats;
    if (g.composite || shared) feats = near;
    else if (g.grand) feats = g.features;
    else feats = g.features.filter((f) => distanceToShape(pt, f.shape, 1500) <= 1500);
    const shape = makeShape(feats.flatMap((f) => f.shape.polys));
    if (g.grand) usedGrandGroups.add(g.gk);
    const entry = { source_name: SRC_C.source_name, source_record_id: g.composite ? `objectid:${feats.map((f) => f.oid).join('+')}` : g.recordId, source_license: SRC_C.license, source_url: SRC_C.dataset_url };
    if ((g.grand || shape.area >= ESPACE_VERT_POLYGON_MIN_AREA_M2) && POLYGON_CATEGORIES.has(lm.category)) {
      lm.polygon = shape.polys; lm.areaM2 = shape.area; lm.polygonFrom = 'espace-vert';
      lm.merged.push({ ...entry, role: 'geofence_polygon' });
      report.polygons.push({ key: lm.key, name: lm.name, from: `${SRC_C.source_name} ${entry.source_record_id} "${g.name}"`, match: m, areaHa: shape.area / 1e4 });
      if (m === 'containment') { lm.needsReview = true; lm.reviewNotes.push(`Polygon is the part(s) of "${g.name}" (${m}) around the point; check extent.`); }
    } else {
      lm.areaM2 = shape.area;
      lm.radiusFromArea = true;
    }
    if (!lm.neighbourhood && g.gestion) lm.neighbourhood = g.gestion;
  }

  // Grand parcs with no A record become their own park landmarks.
  const parkLandmarks = [];
  for (const g of groupList) {
    if (!g.grand) continue;
    if (usedGrandGroups.has(g.gk)) continue;
    if (g.composite) { skip('parks', 'composite Grand parc not matched as a whole (parts attached to parc-nature records)', g.name); continue; }
    const pos = pointOnSurface(g.shape.polys);
    if (!inIsland(pos[0], pos[1])) { skip('parks', 'outside island boundary', g.name); continue; }
    // Point-level check against existing A landmarks of the same name (unmatched due to distance).
    const key = `${SRC_C.source_name}:${g.recordId}`;
    if (ovr[key]) usedOverrides.add(key);
    if (ovr[key] && ovr[key].exclude) { skip('parks', `curated exclusion: ${ovr[key].exclude}`, g.name); continue; }
    parkLandmarks.push({
      key, source: SRC_C, rid: g.recordId, name: g.name, altNames: [], description: `Grand parc (${g.features[0].typo2 || 'parc'})`,
      category: 'park', prominence: 2, lat: pos[1], lon: pos[0], polygon: g.shape.polys, polygonFrom: 'espace-vert', areaM2: g.shape.area, radius: null,
      address: null, neighbourhood: g.gestion, merged: [], needsReview: false, reviewNotes: [], typeLabel: 'Grand parc',
    });
    report.polygons.push({ key, name: g.name, from: `${SRC_C.source_name} ${g.recordId} (new park landmark)`, match: 'self', areaHa: g.shape.area / 1e4 });
  }
  for (const g of groupList) if (!g.grand) skip('parks', 'non-"Grand parc" green space (used only to size/outline matching landmarks)');

  let landmarks = [...keptA, ...parkLandmarks];

  // ---------------- LPC heritage (D) ----------------
  console.log('Processing protected heritage sites (LPC, EPSG:2950) ...');
  const SRC_D = SOURCES.lpc;
  const lpc = [];
  let maxAreaDev = 0;
  for (const f of raw.lpc.features || []) {
    const p = f.properties || {};
    const rid = p.ID_LPC === undefined || p.ID_LPC === null ? null : String(p.ID_LPC);
    const zone = cleanText(p.type_zone);
    const name = cleanText(p.Nom);
    if (!rid || !name) { skip('lpc', 'missing id/name'); continue; }
    if (!LPC_KEEP_ZONES.includes(zone)) { skip('lpc', `designation ${zone} dropped (AP = protection buffer, AI = notice of intent)`, `${rid} ${name}`); continue; }
    const polysMtm = geomToPolys(f.geometry);
    if (!polysMtm.length) { skip('lpc', 'missing geometry', `${rid} ${name}`); continue; }
    const polys = polysMtm.map((poly) => poly.map((ring) => cleanRing(ring.map((c) => TM.inverse(Number(c[0]), Number(c[1]))))).filter(Boolean)).filter((poly) => poly.length && poly[0]);
    if (!polys.length) { skip('lpc', 'invalid geometry', `${rid} ${name}`); continue; }
    const shape = makeShape(polys);
    // Reprojection check: area in WGS84 (local metric projection) vs planar area in MTM metres.
    const mtmArea = polysMtm.reduce((s, poly) => s + Math.max(0, Math.abs(planarArea(poly[0])) - poly.slice(1).reduce((h, r) => h + Math.abs(planarArea(r)), 0)), 0);
    if (mtmArea > 500) maxAreaDev = Math.max(maxAreaDev, Math.abs(shape.area - mtmArea) / mtmArea);
    const alt = String(p.NomsAutres || '').split(/,\s+|;\s*/).map(cleanText).filter(Boolean);
    lpc.push({ rid, zone, name, alt, shape, zoneExpl: cleanText(p.zone_expl), dateStatut: cleanText(p.DateStatut), ensemble: cleanText(p.nom_ensemb) });
  }
  report.notes.push(`LPC reprojection: polygon areas after EPSG:2950 → WGS84 match the planar MTM areas within ${(maxAreaDev * 100).toFixed(2)} % (features > 500 m²). (The published Shape_Area field is stale for ~17 small features and was not used.)`);

  // Dedupe within LPC (e.g. Mont-Royal SD/SP, Habitat 67 IC/BC).
  lpc.sort((a, b) => LPC_ZONE_PRIORITY[a.zone] - LPC_ZONE_PRIORITY[b.zone] || Number(a.rid) - Number(b.rid));
  const lpcKept = [];
  for (const r of lpc) {
    const dup = lpcKept.find((k) => {
      const m = namesMatch([k.name], [r.name], false);
      if (!m) return false;
      const d = shapeDistance(k.shape, r.shape);
      return m === 'exact' ? d <= SAME_NAME_DEDUPE_M : d <= SIMILAR_NAME_DEDUPE_M;
    });
    if (dup) {
      dup.mergedLpc = dup.mergedLpc || [];
      dup.mergedLpc.push(r);
      report.merges.push({ kept: `${SRC_D.source_name}:${dup.rid} ${dup.name} (${dup.zone})`, dropped: `${SRC_D.source_name}:${r.rid} ${r.name} (${r.zone})`, why: 'same heritage site, two designations' });
      continue;
    }
    lpcKept.push(r);
  }
  const lpcEntry = (r, role) => ({ source_name: SRC_D.source_name, source_record_id: r.rid, source_license: SRC_D.license, source_url: SRC_D.dataset_url, role });

  const lpcNew = [];
  for (const r of lpcKept.sort((a, b) => Number(a.rid) - Number(b.rid))) {
    const key = `${SRC_D.source_name}:${r.rid}`;
    const o = ovr[key];
    if (o) usedOverrides.add(key);
    if (o && o.exclude) { skip('lpc', `curated exclusion: ${o.exclude}`, `${r.rid} ${r.name}`); continue; }
    // Match to an existing landmark.
    let best = null;
    if (!(o && o.no_match)) {
      for (const lm of landmarks) {
        const d = distanceToShape([lm.lon, lm.lat], r.shape, MATCH_DISTANCE_M);
        if (d > MATCH_DISTANCE_M) continue;
        const m = namesMatch([lm.name, ...lm.altNames], [r.name, ...r.alt], true);
        if (!m) continue;
        const score = (m === 'exact' ? 0 : 1000) + d + (lm.source === SRC_A ? 0 : 1);
        if (!best || score < best.score) best = { lm, m, d, score };
      }
    }
    const extra = (r.mergedLpc || []).map((x) => lpcEntry(x, 'merged'));
    if (best) {
      const lm = best.lm;
      const big = r.shape.area >= LPC_POLYGON_MIN_AREA_M2;
      const okCategory = best.m === 'exact' ? (POLYGON_CATEGORIES.has(lm.category) || ['architecture', 'museum', 'culture'].includes(lm.category)) : ['park', 'campus'].includes(lm.category);
      if (!lm.polygon && big && okCategory && !(o && o.no_polygon)) {
        lm.polygon = r.shape.polys; lm.areaM2 = r.shape.area; lm.polygonFrom = 'lpc';
        lm.merged.push(lpcEntry(r, 'merged+geofence_polygon'), ...extra);
        report.polygons.push({ key: lm.key, name: lm.name, from: `${SRC_D.source_name} ${r.rid} "${r.name}" (${r.zone})`, match: best.m, areaHa: r.shape.area / 1e4 });
      } else {
        lm.merged.push(lpcEntry(r, 'merged'), ...extra);
        if (!lm.polygon && !lm.areaM2) { lm.areaM2 = r.shape.area; lm.radiusFromArea = true; }
      }
      report.merges.push({ kept: `${lm.key} ${lm.name}`, dropped: `${key} ${r.name} (${r.zone})`, why: `${best.m} name, ${Math.round(best.d)} m from site polygon` });
      continue;
    }
    const pos = pointOnSurface(r.shape.polys);
    if (!inIsland(pos[0], pos[1])) { skip('lpc', 'outside island boundary', `${r.rid} ${r.name}`); continue; }
    const category = RELIGIOUS_RE.test(r.name) ? 'religious' : 'historic';
    const big = r.shape.area >= LPC_POLYGON_MIN_AREA_M2;
    const lm = {
      key, source: SRC_D, rid: r.rid, name: r.name, altNames: r.alt,
      description: `${r.zoneExpl || r.zone} en vertu de la Loi sur le patrimoine culturel${r.dateStatut ? ` (statut depuis ${r.dateStatut})` : ''}.${r.ensemble ? ` Ensemble : ${r.ensemble}.` : ''}`,
      category, prominence: LPC_ZONE_PROMINENCE[r.zone], lat: pos[1], lon: pos[0],
      polygon: big ? r.shape.polys : null, polygonFrom: big ? 'lpc' : null, areaM2: r.shape.area, radiusFromArea: !big, radius: null,
      address: null, neighbourhood: null, merged: extra, needsReview: false, reviewNotes: [], typeLabel: r.zoneExpl,
    };
    if (big) report.polygons.push({ key, name: r.name, from: `${SRC_D.source_name} ${r.rid} (${r.zone}, new historic landmark)`, match: 'self', areaHa: r.shape.area / 1e4 });
    lpcNew.push(lm);
  }
  landmarks.push(...lpcNew);

  // ---------------- OpenStreetMap (E) ----------------
  const SRC_E = SOURCES.osm;
  let osmStats = { fetched: 0, added: 0, skippedReason: osm.error };
  if (osm.data) {
    console.log('Processing OpenStreetMap supplement ...');
    const els = (osm.data.elements || []).slice().sort((a, b) => cmp(a.type, b.type) || a.id - b.id);
    osmStats.fetched = els.length;
    const added = [];
    for (const el of els) {
      const t = el.tags || {};
      const name = cleanText(t.name);
      const rid = `${el.type}/${el.id}`;
      const lat = el.type === 'node' ? el.lat : el.center && el.center.lat;
      const lon = el.type === 'node' ? el.lon : el.center && el.center.lon;
      if (!name) { skip('osm', 'missing name'); continue; }
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) { skip('osm', 'missing/invalid coordinates', rid); continue; }
      if (t.attraction || t.amusement_park) { skip('osm', 'amusement ride / attraction feature', `${rid} ${name}`); continue; }
      const category = osmCategory(t);
      if (!category) { skip('osm', `not a discoverable kind (historic=${t.historic || ''} tourism=${t.tourism || ''})`, `${rid} ${name}`); continue; }
      if (!inIsland(lon, lat)) { skip('osm', 'outside island boundary', `${rid} ${name}`); continue; }
      const key = `${SRC_E.source_name}:${rid}`;
      const o = ovr[key];
      if (o) usedOverrides.add(key);
      if (o && o.exclude) { skip('osm', `curated exclusion: ${o.exclude}`, `${rid} ${name}`); continue; }
      const altNames = [t['name:fr'], t['name:en'], t.alt_name, t.official_name].map(cleanText).filter(Boolean);
      const pool = [...landmarks, ...added];
      let dupOf = null;
      for (const lm of pool) {
        const d = lm.polygon ? Math.min(haversine(lat, lon, lm.lat, lm.lon), distanceToShape([lon, lat], makeShapeCached(lm), MATCH_DISTANCE_M)) : haversine(lat, lon, lm.lat, lm.lon);
        if (d > MATCH_DISTANCE_M) continue;
        if (d <= 40 && !lm.polygon) { dupOf = { lm, why: `${Math.round(d)} m from an existing landmark` }; break; }
        const m = namesMatch([lm.name, ...lm.altNames], [name, ...altNames], true);
        if (m) { dupOf = { lm, why: `${m} name, ${Math.round(d)} m` }; break; }
      }
      if (dupOf) { skip('osm', 'already covered by a Montréal open-data landmark (not merged: ODbL)', `${rid} ${name} ~ ${dupOf.lm.name}`); continue; }
      const descr = [t.tourism ? `tourism=${t.tourism}` : null, t.historic ? `historic=${t.historic}` : null, t.wikidata ? `wikidata ${t.wikidata}` : null].filter(Boolean).join(', ');
      const addr = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
      added.push({
        key, source: SRC_E, rid, name, altNames, description: `OpenStreetMap: ${descr}`, category,
        prominence: t.wikidata && ['museum', 'landmark'].includes(category) ? 3 : 4,
        lat, lon, polygon: null, areaM2: null, radius: null, address: addr ? `${addr}${t['addr:city'] ? `, ${cleanText(t['addr:city'])}` : ''}` : null,
        neighbourhood: null, merged: [], needsReview: true,
        reviewNotes: ['OpenStreetMap-derived (ODbL-1.0, © OpenStreetMap contributors): share-alike applies to a derived database; verify the place and the licence decision before publishing.'],
        typeLabel: descr, sourceUrl: `https://www.openstreetmap.org/${rid}`,
      });
    }
    landmarks.push(...added);
    osmStats.added = added.length;
  }

  // ---------------- Overrides, radius, review flags ----------------
  for (const lm of landmarks) {
    const o = ovr[lm.key];
    if (o) {
      usedOverrides.add(lm.key);
      if (o.name) lm.name = cleanText(o.name);
      if (o.description) lm.description = cleanText(o.description);
      if (o.category) lm.category = o.category;
      if (o.prominence) lm.prominence = o.prominence;
      if (o.geofence_radius_m) lm.radius = o.geofence_radius_m;
      if (o.drop_polygon) { lm.polygon = null; }
      if (o.needs_review) lm.needsReview = true;
      if (o.review_note) lm.reviewNotes.push(o.review_note);
      if (o.note) lm.overrideNote = o.note;
    }
    if (!CATEGORIES.includes(lm.category)) throw new Error(`Bad category ${lm.category} for ${lm.key}`);
    if (!lm.radius) {
      const def = DEFAULT_RADIUS[lm.category];
      if (!lm.polygon && lm.areaM2 && lm.radiusFromArea) {
        const r = Math.round(Math.sqrt(lm.areaM2 / Math.PI) + 20);
        lm.radius = lm.category === 'park' ? Math.min(400, Math.max(40, r)) : Math.max(def, Math.min(r, 300));
      } else lm.radius = def;
    }
    lm.radius = Math.max(10, Math.min(2000, Math.round(lm.radius)));
    if (lm.polygon && lm.polygonFrom === 'lpc' && lm.areaM2 >= DISTRICT_AREA_M2 && lm.category !== 'park' && !(o && o.district_ok)) {
      lm.needsReview = true;
      lm.reviewNotes.push(`District-scale polygon (${(lm.areaM2 / 1e4).toFixed(0)} ha) overlaps other landmarks.`);
    }
  }
  const unusedOverrides = Object.keys(ovr).filter((k) => !usedOverrides.has(k)).sort(cmp);
  if (unusedOverrides.length) report.notes.push(`Overrides that matched no record (check ids): ${unusedOverrides.join(', ')}`);

  // ---------------- Polygon simplification ----------------
  console.log('Simplifying landmark polygons ...');
  let polyVertsBefore = 0, polyVertsAfter = 0;
  for (const lm of landmarks) {
    if (!lm.polygon) continue;
    const s = simplifyMulti(lm.polygon, LANDMARK_POLYGON_TOLERANCE_M);
    polyVertsBefore += s.vertsBefore; polyVertsAfter += s.vertsAfter;
    if (!s.polys.length) { lm.polygon = null; report.notes.push(`Polygon of ${lm.key} collapsed during simplification and was dropped.`); continue; }
    lm.polygon = s.polys;
    lm.polygonJson = multiToGeoJSON(s.polys);
    // A landmark point should sit inside or near its polygon.
    const d = distanceToShape([lm.lon, lm.lat], makeShape(s.polys));
    if (d > MATCH_DISTANCE_M) { lm.needsReview = true; lm.reviewNotes.push(`Point is ${Math.round(d)} m outside its polygon.`); }
  }

  // ---------------- Final fields, ids, slugs ----------------
  for (const lm of landmarks) {
    lm.id = uuidv5(lm.key, MIGO_LANDMARK_NAMESPACE);
    lm.name = lm.name.slice(0, 200);
    lm.description = lm.description ? lm.description.slice(0, 2000) : null;
    lm.lat = round6(lm.lat); lm.lon = round6(lm.lon);
    lm.sourceUrl = lm.sourceUrl || lm.source.dataset_url;
    lm.merged.sort((a, b) => cmp(a.source_name, b.source_name) || cmp(a.source_record_id, b.source_record_id) || cmp(a.role || '', b.role || ''));
    lm.reviewNote = lm.reviewNotes.length ? [...new Set(lm.reviewNotes)].join(' ') : null;
  }
  assignSlugs(landmarks);
  landmarks.sort((a, b) => LANDMARK_SOURCE_ORDER.indexOf(a.source.source_name) - LANDMARK_SOURCE_ORDER.indexOf(b.source.source_name) || cmpRid(a.rid, b.rid));
  const ids = new Set();
  for (const lm of landmarks) { if (ids.has(lm.id)) throw new Error(`Duplicate id ${lm.id} (${lm.key})`); ids.add(lm.id); }

  // ---------------- Verification of well-known places ----------------
  const checks = [
    ["Saint Joseph's Oratory", /oratoire saint-joseph/iu],
    ['Parc du Mont-Royal', /^parc du mont-royal$/iu],
    ['Jardin botanique', /^jardin botanique/iu],
    ['Musée des beaux-arts', /^musée des beaux-arts de montréal$/iu],
    ['Vieux-Port', /^vieux-port/iu],
    ['Parc Jean-Drapeau', /^parc jean-drapeau$/iu],
    ['Biosphère', /^biosphère/iu],
    ['Notre-Dame Basilica', /^basilique notre-dame/iu],
  ];
  for (const [label, re] of checks) {
    const hits = landmarks.filter((l) => re.test(l.name));
    report.verification.push({ label, hits: hits.map((l) => ({ key: l.key, slug: l.slug, name: l.name, category: l.category, prominence: l.prominence, lat: l.lat, lon: l.lon, radius: l.radius, polygonHa: l.polygon ? multiArea(l.polygon) / 1e4 : null, needsReview: l.needsReview })) });
  }

  // TM verification (LPC Habitat 67 vs the Lieux point; round trip).
  const hab = lpc.find((r) => r.name === 'Habitat 67');
  const habA = landmarks.find((l) => l.key === `${SRC_A.source_name}:2786`);
  const rt = TM.forward(-73.6165, 45.49188);
  const back = TM.inverse(rt[0], rt[1]);
  report.tm = {
    roundTripErrM: haversine(45.49188, -73.6165, back[1], back[0]),
    oratoryMtm: rt,
    habitatDistM: hab && habA ? distanceToShape([habA.lon, habA.lat], hab.shape) : null,
  };

  // ---------------- SQL output ----------------
  console.log('Writing SQL ...');
  const counts = summarise(landmarks);
  const sourcesUsed = ['lieux', 'boundary', 'parks', 'lpc', ...(osm.data ? ['osm'] : [])];
  const header008 = sqlHeader('008_montreal_island_boundary.sql', runDate, manifest, ['boundary'], [
    'Service area = all land polygons of the "Limites terrestres" dataset: the island of Montréal',
    'plus the adjacent islands of the agglomeration (Île Bizard, Île des Sœurs / Nuns\' Island,',
    'Île Sainte-Hélène and Île Notre-Dame (parc Jean-Drapeau), Île de la Visitation, islets).',
    `Polygons: ${boundaryStats.outputPolygons} (input ${boundaryStats.inputPolygons}), area ${boundaryStats.totalAreaKm2.toFixed(1)} km². Holes (inland water:`,
    `Lachine Canal, port basins, ponds) are filled: ${boundaryStats.filledHoles}; islets inside them dropped: ${boundaryStats.nestedIslets}.`,
    `vertices ${boundaryStats.vertsBefore} -> ${boundaryStats.vertsAfter} (Douglas–Peucker ${BOUNDARY_TOLERANCE_M} m in metres; rings re-simplified to avoid new self-intersections: ${boundaryStats.refinedRings}).`,
    'Run after 007_landmarks_geofencing.sql.',
  ]);
  const sql008 = `${header008}
insert into public.service_areas (id, name, geom, source_name, source_url, source_license)
values (
  'montreal-island',
  'Île de Montréal',
  ${sqlPolygon(boundaryGeojson)},
  ${sqlStr(SOURCES.boundary.source_name)},
  ${sqlStr(SOURCES.boundary.dataset_url)},
  ${sqlStr(SOURCES.boundary.license)}
)
on conflict (id) do update set
  name = excluded.name,
  geom = excluded.geom,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  source_license = excluded.source_license,
  updated_at = now();

select public.refresh_service_area_parts('montreal-island');
`;

  const rowSql = (lm) => `  (${[
    `${sqlStr(lm.id)}::uuid`, sqlStr(lm.slug), sqlStr(lm.name), sqlStr(lm.description), sqlStr(lm.category), String(lm.prominence),
    lm.lat.toFixed(6), lm.lon.toFixed(6), String(lm.radius),
    lm.polygonJson ? `${sqlPolygon(lm.polygonJson)}::extensions.geography` : 'null',
    sqlStr(lm.address), sqlStr(lm.neighbourhood), sqlStr(lm.source.source_name), sqlStr(lm.sourceUrl), sqlStr(lm.source.license),
    sqlStr(lm.rid), `${sqlStr(JSON.stringify(lm.merged))}::jsonb`, lm.needsReview ? 'true' : 'false', sqlStr(lm.reviewNote), 'true',
  ].join(', ')})`;
  const insertHead = 'insert into public.landmarks (id, slug, name, description, category, prominence, latitude, longitude, geofence_radius_m, geofence_polygon, address, neighbourhood, source_name, source_url, source_license, source_record_id, merged_sources, needs_review, review_note, is_active) values\n';
  const insertTail = `
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  prominence = excluded.prominence,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  geofence_radius_m = excluded.geofence_radius_m,
  geofence_polygon = excluded.geofence_polygon,
  address = excluded.address,
  neighbourhood = excluded.neighbourhood,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  source_license = excluded.source_license,
  source_record_id = excluded.source_record_id,
  merged_sources = excluded.merged_sources,
  needs_review = excluded.needs_review,
  review_note = excluded.review_note,
  is_active = excluded.is_active,
  updated_at = now();
`;
  // Pack rows into files: rows without polygons and small polygons first (009), the rest after.
  const rows = landmarks.map((lm) => ({ lm, sql: rowSql(lm) }));
  const plain = rows.filter((r) => !r.lm.polygonJson);
  const withPoly = rows.filter((r) => r.lm.polygonJson);
  const deactivateSources = LANDMARK_SOURCE_ORDER.filter((s) => s !== 'openstreetmap' || osm.data);
  const deactivateSql = `
-- Non-destructive: deactivate rows from these sources that this import no longer produces.
update public.landmarks set is_active = false, updated_at = now()
where source_name in (${deactivateSources.map(sqlStr).join(', ')})
  and id not in (
${chunkLines(landmarks.map((l) => `${sqlStr(l.id)}::uuid`), 6).map((l) => '    ' + l).join(',\n')}
  )
  and is_active;
`;
  const files = [];
  let cur = [];
  let curBytes = 0;
  const budget = MAX_SQL_FILE_BYTES - 25_000 - Buffer.byteLength(deactivateSql);
  for (const r of [...plain, ...withPoly]) {
    const b = Buffer.byteLength(r.sql) + 3;
    if (cur.length && curBytes + b > budget) { files.push(cur); cur = []; curBytes = 0; }
    cur.push(r); curBytes += b;
  }
  if (cur.length) files.push(cur);
  const fileNames = files.map((_, i) => (i === 0 ? '009_landmarks_seed.sql' : `${String(9 + i).padStart(3, '0')}_landmark_polygons.sql`));
  // Remove stale split files from previous runs.
  for (const fn of fs.readdirSync(MIGRATIONS_DIR)) {
    if (/^0(1\d|09)_landmark(s_seed|_polygons)(_\d+)?\.sql$/.test(fn) && !fileNames.includes(fn)) fs.unlinkSync(path.join(MIGRATIONS_DIR, fn));
  }
  const written = [];
  fs.writeFileSync(path.join(MIGRATIONS_DIR, '008_montreal_island_boundary.sql'), sql008);
  written.push({ file: '008_montreal_island_boundary.sql', bytes: Buffer.byteLength(sql008) });
  files.forEach((fileRows, i) => {
    const isLast = i === files.length - 1;
    const header = sqlHeader(fileNames[i], runDate, manifest, sourcesUsed, [
      `This file: ${fileRows.length} landmark rows (${fileRows.filter((r) => r.lm.polygonJson).length} with a geofence polygon). Part ${i + 1} of ${files.length}: run ${fileNames.join(', then ')} in order, after 007 and 008.`,
      `Whole import: ${landmarks.length} landmarks — ${Object.entries(counts.bySource).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
      `By category: ${Object.entries(counts.byCategory).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
      `With polygon: ${counts.withPolygon}. needs_review: ${counts.needsReview}.`,
      osm.data ? 'OpenStreetMap rows are flagged needs_review (ODbL share-alike).' : `OpenStreetMap supplement not included in this run (${osm.error}); existing OSM rows are left untouched.`,
      'Ids are uuid v5 of "<source_name>:<source_record_id>"; slugs are only set on first insert.',
    ]);
    let body = header + '\nbegin;\n';
    for (let s = 0; s < fileRows.length; s += ROWS_PER_INSERT) {
      body += '\n' + insertHead + fileRows.slice(s, s + ROWS_PER_INSERT).map((r) => r.sql).join(',\n') + insertTail;
    }
    if (isLast) body += deactivateSql;
    body += '\ncommit;\n';
    fs.writeFileSync(path.join(MIGRATIONS_DIR, fileNames[i]), body);
    written.push({ file: fileNames[i], bytes: Buffer.byteLength(body) });
  });

  // ---------------- Report ----------------
  const reportMd = buildReport({ runDate, manifest, sourcesUsed, landmarks, counts, report, boundaryStats, osmStats, written, polyVertsBefore, polyVertsAfter, candidatesA: candidates.length, keptA: keptA.length });
  fs.writeFileSync(REPORT_FILE, reportMd);

  // ---------------- Console summary ----------------
  console.log('\nSummary');
  console.log(`  landmarks: ${landmarks.length}  (${Object.entries(counts.bySource).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  console.log(`  categories: ${Object.entries(counts.byCategory).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`  with polygon: ${counts.withPolygon}, needs_review: ${counts.needsReview}`);
  console.log(`  skipped: ${[...report.skipped.values()].reduce((a, b) => a + b, 0)} records (see report), merges: ${report.merges.length}`);
  console.log(`  OSM: ${osm.data ? `${osmStats.fetched} fetched, ${osmStats.added} added` : `skipped (${osm.error})`}`);
  for (const w of written) console.log(`  wrote backend/supabase/migrations/${w.file} (${(w.bytes / 1024).toFixed(0)} KB)`);
  console.log(`  wrote ${path.relative(path.resolve(BACKEND_DIR, '..'), REPORT_FILE)}`);
}

// ---------------------------------------------------------------------------
// Helpers used by main
// ---------------------------------------------------------------------------

const shapeCache = new WeakMap();
function makeShapeCached(lm) {
  let s = shapeCache.get(lm);
  if (!s || s.polys !== lm.polygon) { s = makeShape(lm.polygon); shapeCache.set(lm, s); }
  return s;
}

function planarArea(ring) {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return s / 2;
}

function shapeDistance(a, b) {
  // Approximate: distance from each shape's surface point to the other shape.
  const pa = pointOnSurface(a.polys), pb = pointOnSurface(b.polys);
  return Math.min(distanceToShape(pa, b), distanceToShape(pb, a));
}

function joinParkName(type, lien, nom) {
  const parts = [];
  if (type) parts.push(type);
  let l = lien === null || lien === undefined ? '' : String(lien).normalize('NFC').trim();
  let s = parts.join(' ');
  if (l) s = s ? `${s} ${l}` : l;
  if (s) s = /['’]$/.test(s) ? s + nom : `${s} ${nom}`;
  else s = nom;
  return cleanText(s);
}

function cmpRid(a, b) {
  const na = /^\d+$/.test(a) ? Number(a) : NaN, nb = /^\d+$/.test(b) ? Number(b) : NaN;
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return cmp(a, b);
}

function dedupeList(list, report, label) {
  // Prefer the most prominent (lowest number), then the lowest record id.
  const sorted = list.slice().sort((a, b) => a.prominence - b.prominence || cmpRid(a.rid, b.rid));
  const kept = [];
  for (const c of sorted) {
    const dup = kept.find((k) => {
      const d = haversine(c.lat, c.lon, k.lat, k.lon);
      if (d > SIMILAR_NAME_DEDUPE_M) return false;
      const m = namesMatch([k.name], [c.name], false);
      return m === 'exact' ? d <= SAME_NAME_DEDUPE_M : m === 'similar';
    });
    if (dup) {
      dup.merged.push({ source_name: c.source.source_name, source_record_id: c.rid, source_license: c.source.license, source_url: c.source.dataset_url, role: 'merged' });
      report.merges.push({ kept: `${dup.key} ${dup.name} (${dup.typeLabel})`, dropped: `${c.key} ${c.name} (${c.typeLabel})`, why: `duplicate within ${label}, ${Math.round(haversine(c.lat, c.lon, dup.lat, dup.lon))} m` });
      continue;
    }
    kept.push(c);
  }
  return kept.sort((a, b) => cmpRid(a.rid, b.rid));
}

function osmCategory(t) {
  const tour = t.tourism, hist = t.historic;
  if (tour === 'museum') return 'museum';
  if (tour === 'gallery') return 'culture';
  if (tour === 'viewpoint') return 'viewpoint';
  if (tour === 'attraction') return 'landmark';
  if (!hist) return null;
  if (['monument', 'memorial', 'statue'].includes(hist)) return t.memorial === 'plaque' || t.memorial === 'stolperstein' ? null : 'public-art';
  if (['wayside_cross', 'wayside_shrine', 'boundary_stone', 'milestone', 'district', 'yes', 'aircraft', 'tank', 'cannon', 'locomotive', 'railway_car', 'tomb', 'grave'].includes(hist)) return null;
  if (t.amenity === 'place_of_worship' || ['church', 'cathedral', 'chapel', 'monastery', 'convent'].includes(t.building) || ['church', 'monastery'].includes(hist)) return 'religious';
  return 'historic';
}

function assignSlugs(landmarks) {
  const groups = new Map();
  for (const lm of landmarks) {
    let base = truncateSlug(slugify(lm.name), 80) || 'landmark';
    lm.baseSlug = base;
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(lm);
  }
  const taken = new Set();
  const order = (a, b) => a.prominence - b.prominence || LANDMARK_SOURCE_ORDER.indexOf(a.source.source_name) - LANDMARK_SOURCE_ORDER.indexOf(b.source.source_name) || cmpRid(a.rid, b.rid);
  // First pass: the best record of each group keeps the base slug.
  const rest = [];
  for (const base of [...groups.keys()].sort(cmp)) {
    const g = groups.get(base).sort(order);
    g[0].slug = base; taken.add(base);
    rest.push(...g.slice(1));
  }
  // Others get a neighbourhood suffix, then the source record id.
  rest.sort((a, b) => cmp(a.baseSlug, b.baseSlug) || order(a, b));
  for (const lm of rest) {
    const tries = [];
    if (lm.neighbourhood) tries.push(slugify(lm.neighbourhood));
    tries.push(slugify(`${lm.source.source_name === 'montreal-lieux-interet' ? 'mtl' : lm.source.source_name === 'montreal-grands-parcs' ? 'parc' : lm.source.source_name === 'montreal-patrimoine-lpc' ? 'lpc' : 'osm'}-${lm.rid}`));
    let s = null;
    for (const suf of tries) {
      const cand = `${truncateSlug(lm.baseSlug, 80 - suf.length - 1)}-${suf}`.replace(/^-+/, '');
      if (!taken.has(cand)) { s = cand; break; }
    }
    if (!s) throw new Error(`Cannot assign slug for ${lm.key}`);
    lm.slug = s; taken.add(s);
  }
  for (const lm of landmarks) if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(lm.slug) || lm.slug.length > 80) throw new Error(`Bad slug ${lm.slug}`);
}

function chunkLines(items, per) {
  const out = [];
  for (let i = 0; i < items.length; i += per) out.push(items.slice(i, i + per).join(', '));
  return out;
}

function summarise(landmarks) {
  const bySource = {}, byCategory = {};
  for (const s of LANDMARK_SOURCE_ORDER) bySource[s] = 0;
  for (const c of CATEGORIES) byCategory[c] = 0;
  let withPolygon = 0, needsReview = 0;
  for (const l of landmarks) {
    bySource[l.source.source_name]++;
    byCategory[l.category]++;
    if (l.polygonJson) withPolygon++;
    if (l.needsReview) needsReview++;
  }
  for (const k of Object.keys(bySource)) if (!bySource[k]) delete bySource[k];
  for (const k of Object.keys(byCategory)) if (!byCategory[k]) delete byCategory[k];
  return { bySource, byCategory, withPolygon, needsReview };
}

function sqlHeader(fileName, runDate, manifest, sourceKeys, lines) {
  const out = [
    `-- ${fileName}`,
    `-- GENERATED by ${SCRIPT_REL} — do not edit by hand; re-run the script instead.`,
    `-- Generated for data fetched up to ${runDate}.`,
    '--',
    '-- Sources (licence, dataset page, fetched):',
  ];
  for (const k of sourceKeys) {
    const s = SOURCES[k];
    const m = manifest[s.file] || {};
    out.push(`--   ${s.title} — ${s.license} — ${s.dataset_url} — fetched ${(m.fetched_at || '?').slice(0, 10)}`);
  }
  out.push('--   Attribution: "Contient des données de la Ville de Montréal (CC BY 4.0)"' + (sourceKeys.includes('osm') ? ' and "© OpenStreetMap contributors (ODbL 1.0)".' : '.'));
  out.push('--');
  for (const l of lines) out.push(`-- ${l}`);
  return out.join('\n') + '\n';
}

function mdEscape(s) { return String(s === null || s === undefined ? '' : s).replace(/\|/g, '\\|'); }

function buildReport(ctx) {
  const { runDate, manifest, sourcesUsed, landmarks, counts, report, boundaryStats, osmStats, written } = ctx;
  const L = [];
  L.push('# Landmark import report', '');
  L.push(`Generated by \`${SCRIPT_REL}\` for data fetched up to ${runDate}. Re-running the script with the same cache gives identical output.`, '');
  L.push('## Sources', '');
  L.push('| Source | Licence | Dataset | Fetched | Bytes | sha256 |', '|---|---|---|---|---|---|');
  for (const k of sourcesUsed) {
    const s = SOURCES[k], m = manifest[s.file] || {};
    L.push(`| ${mdEscape(s.title)} | ${s.license} | ${s.dataset_url} | ${(m.fetched_at || '').slice(0, 10)} | ${m.bytes || ''} | \`${(m.sha256 || '').slice(0, 12)}\` |`);
  }
  if (!sourcesUsed.includes('osm')) L.push('', `OpenStreetMap supplement: **skipped** (${osmStats.skippedReason}).`);
  L.push('', '## Output files', '');
  for (const w of written) L.push(`- \`backend/supabase/migrations/${w.file}\` — ${(w.bytes / 1024).toFixed(0)} KB`);
  L.push('', '## Counts', '');
  L.push(`Total landmarks: **${landmarks.length}** — with polygon: ${counts.withPolygon}, needs_review: ${counts.needsReview}.`, '');
  L.push('| Source | Rows |', '|---|---|');
  for (const [k, v] of Object.entries(counts.bySource)) L.push(`| ${k} | ${v} |`);
  L.push('', '| Category | Rows | Default radius (m) |', '|---|---|---|');
  for (const [k, v] of Object.entries(counts.byCategory)) L.push(`| ${k} | ${v} | ${DEFAULT_RADIUS[k]} |`);
  const byProm = {};
  for (const l of landmarks) byProm[l.prominence] = (byProm[l.prominence] || 0) + 1;
  L.push('', `By prominence: ${Object.keys(byProm).sort().map((k) => `${k}: ${byProm[k]}`).join(', ')}.`);
  L.push(`Lieux d'intérêt: ${ctx.candidatesA} records passed the filters, ${ctx.keptA} kept after deduplication.`);
  if (osmStats.fetched) L.push(`OpenStreetMap: ${osmStats.fetched} elements fetched, ${osmStats.added} added as gap-fillers.`);
  L.push('', '## Island boundary (008)', '');
  L.push(`- ${boundaryStats.features} features → ${boundaryStats.outputPolygons} polygons, total ${boundaryStats.totalAreaKm2.toFixed(1)} km². ${boundaryStats.filledHoles} holes (inland water: canal, port basins, ponds) filled; ${boundaryStats.nestedIslets} islets inside filled water removed; ${boundaryStats.droppedPolys} islets collapsed by simplification.`);
  L.push(`- Vertices ${boundaryStats.vertsBefore} → ${boundaryStats.vertsAfter} (Douglas–Peucker ${BOUNDARY_TOLERANCE_M} m). Rings re-simplified with a smaller tolerance to avoid new intersections: ${boundaryStats.refinedRings}. Ring-pair touches already present in the source: ${boundaryStats.baselineIssues}.`);
  L.push('- Largest parts: ' + boundaryStats.largest.map((p) => `${p.areaKm2.toFixed(2)} km² @ ${p.at[1].toFixed(4)},${p.at[0].toFixed(4)}`).join('; ') + '.');
  L.push(`- Landmark polygons: vertices ${ctx.polyVertsBefore} → ${ctx.polyVertsAfter} (Douglas–Peucker ${LANDMARK_POLYGON_TOLERANCE_M} m).`);
  if (report.tm) {
    L.push('', '## EPSG:2950 → WGS84 check', '');
    L.push(`- Forward/inverse round trip at the Oratory (45.49188, -73.61650) → MTM8 E ${report.tm.oratoryMtm[0].toFixed(1)}, N ${report.tm.oratoryMtm[1].toFixed(1)}; round-trip error ${report.tm.roundTripErrM.toExponential(2)} m.`);
    L.push(`- Lieux d'intérêt "Habitat 67" point is ${report.tm.habitatDistM === null ? 'n/a' : report.tm.habitatDistM.toFixed(1) + ' m'} from the reprojected LPC "Habitat 67" polygon (0 = inside).`);
  }
  if (report.notes.length) { L.push('', '## Notes', ''); for (const n of report.notes) L.push(`- ${n}`); }
  L.push('', '## Spot checks', '');
  L.push('| Check | Key | Slug | Category | Prom. | Lat, Lon | Radius | Polygon (ha) | Review |', '|---|---|---|---|---|---|---|---|---|');
  for (const v of report.verification) {
    if (!v.hits.length) { L.push(`| ${v.label} | **MISSING** | | | | | | | |`); continue; }
    for (const h of v.hits) L.push(`| ${mdEscape(v.label)} | ${h.key} | ${h.slug} | ${h.category} | ${h.prominence} | ${h.lat}, ${h.lon} | ${h.radius} | ${h.polygonHa === null ? '—' : h.polygonHa.toFixed(1)} | ${h.needsReview ? 'yes' : ''} |`);
  }
  L.push('', '## Skipped records', '');
  L.push('| Source — reason | Count | Examples |', '|---|---|---|');
  for (const k of [...report.skipped.keys()].sort(cmp)) L.push(`| ${mdEscape(k)} | ${report.skipped.get(k)} | ${mdEscape((report.skippedExamples.get(k) || []).join('; '))} |`);
  L.push('', `## Merges (${report.merges.length})`, '');
  L.push('| Kept | Merged into it | Why |', '|---|---|---|');
  for (const m of report.merges.slice().sort((a, b) => cmp(a.kept, b.kept) || cmp(a.dropped, b.dropped))) L.push(`| ${mdEscape(m.kept)} | ${mdEscape(m.dropped)} | ${mdEscape(m.why)} |`);
  L.push('', `## Polygons attached (${report.polygons.length})`, '');
  L.push('| Landmark | Polygon from | Match | Area (ha) |', '|---|---|---|---|');
  for (const p of report.polygons.slice().sort((a, b) => cmp(a.key, b.key))) L.push(`| ${mdEscape(p.key)} ${mdEscape(p.name)} | ${mdEscape(p.from)} | ${p.match} | ${p.areaHa.toFixed(1)} |`);
  const rev = landmarks.filter((l) => l.needsReview);
  L.push('', `## needs_review (${rev.length})`, '');
  L.push('| Key | Name | Category | Note |', '|---|---|---|---|');
  for (const l of rev) L.push(`| ${l.key} | ${mdEscape(l.name)} | ${l.category} | ${mdEscape(l.reviewNote)} |`);
  const ov = landmarks.filter((l) => l.overrideNote);
  L.push('', `## Curated overrides applied (${ov.length})`, '');
  L.push('| Key | Name | Radius | Note |', '|---|---|---|---|');
  for (const l of ov) L.push(`| ${l.key} | ${mdEscape(l.name)} | ${l.radius} | ${mdEscape(l.overrideNote)} |`);
  L.push('');
  return L.join('\n');
}

function selfTests() {
  const t = uuidv5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
  if (t !== '2ed6657d-e927-568b-95e1-2665a8aea6a2') throw new Error(`uuidv5 self-test failed: ${t}`);
  const [E, N] = TM.forward(-73.5, 45.5);
  if (Math.abs(E - 304800) > 1e-6) throw new Error('TM self-test failed (central meridian easting)');
  const [lon, lat] = TM.inverse(E, N);
  if (haversine(lat, lon, 45.5, -73.5) > 0.001) throw new Error('TM round-trip self-test failed');
  if (slugify("L’Oratoire Saint-Joseph du Mont-Royal") !== 'l-oratoire-saint-joseph-du-mont-royal') throw new Error('slugify self-test failed');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
