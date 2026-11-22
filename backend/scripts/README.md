# Landmark import

`import_landmarks.mjs` builds MIGO's landmark catalogue and the Montréal Island service area from open data. It writes SQL seed files that you paste into the Supabase SQL editor. The script needs only Node 20 or later and has no npm dependencies.

| Output | What it is |
|---|---|
| `backend/supabase/migrations/008_montreal_island_boundary.sql` | Upserts the `montreal-island` row in `public.service_areas`, then calls `public.refresh_service_area_parts('montreal-island')` |
| `backend/supabase/migrations/009_landmarks_seed.sql` | Upserts every landmark in one transaction, then deactivates rows the import no longer produces |
| `010_landmark_polygons.sql`, `011_…` | Only created when 009 would go over about 1.45 MB. Polygon rows move to these files, and the deactivate statement goes in the last one |
| `backend/data/landmark_import_report.md` | Counts, skipped records by reason, merges, attached polygons, the `needs_review` list and spot checks |
| `backend/data/landmark_overrides.json` | Curated corrections that you edit by hand (see below) |

## Re-run

```sh
node backend/scripts/import_landmarks.mjs --cache /private/tmp/migo-landmark-raw
```

- `--cache <dir>`: where the downloads are kept. Files already there are re-used, so runs on the same cache give byte-identical SQL. `manifest.json` in the cache records each file's URL, download time and sha256.
- `--refresh`: downloads everything again. The SQL changes only if the sources changed.
- `--no-osm`: skips the OpenStreetMap supplement. If OSM is skipped, or Overpass is down, existing `openstreetmap` rows are left as they are and are not deactivated.
- `--date YYYY-MM-DD`: sets the date in the headers. By default it is the newest download date, which keeps the output deterministic.

Downloads are untrusted. They are only parsed as JSON and never executed. Montréal's portal answers `RBAC: access denied` unless the request has a browser User-Agent, so the script sends one.

Apply the files in order in the Supabase SQL editor: `007_landmarks_geofencing.sql` (schema, written separately), then `008`, then `009` and any `010+`. Every file can safely be run again:
- rows are upserted on `id`;
- `slug` is set only on the first insert;
- rows that are no longer produced get `is_active = false`. Nothing is deleted.

## Sources and licences

| `source_name` | Dataset | Licence | Used for |
|---|---|---|---|
| `montreal-lieux-interet` | [Lieux d'intérêt](https://donnees.montreal.ca/dataset/763fe3b8-cdc3-4b8a-bbbd-a0a9bc587c56) | CC BY 4.0 | Main catalogue (points) |
| (service area) | [Limites terrestres](https://donnees.montreal.ca/dataset/b628f1da-9dc3-4bb1-9875-1470f891afb1) | CC BY 4.0 | Island boundary; filters out points that are not on land |
| `montreal-grands-parcs` | [Grands parcs, parcs d'arrondissements et espaces publics](https://donnees.montreal.ca/dataset/2e9e4d2f-173a-4c3d-a5e3-565d79baa27d) (`espace_vert.json`) | CC BY 4.0 | Park and green-space polygons, and park landmarks that have no Lieux record |
| `montreal-patrimoine-lpc` | [Sites et immeubles protégés (LPC)](https://donnees.montreal.ca/dataset/41fcc790-e328-44be-bcbf-73556fa0bc32) (`patrimoinelpc.geojson`) | CC BY 4.0 | Heritage polygons and extra `historic` landmarks |
| `openstreetmap` | Overpass API, `© OpenStreetMap contributors` | ODbL 1.0 | A few clearly notable gaps only. Every row has `needs_review = true` |

Google Places data is never used.

**Attribution text for the app** (for example on an "About / Data" screen or the map footer):

> Données : Ville de Montréal, données ouvertes (CC BY 4.0) — donnees.montreal.ca. Certains lieux © les contributeurs d'OpenStreetMap (ODbL 1.0).
> Data: City of Montréal open data (CC BY 4.0). Some places © OpenStreetMap contributors (ODbL 1.0).

**ODbL note:** a database that contains OSM-derived rows can become subject to ODbL share-alike when it is published. That is why the OSM rows are flagged. To publish without them, drop them with `--no-osm` and then run `update public.landmarks set is_active = false where source_name = 'openstreetmap';`.

## Decisions

**Service area.** The service area is every land polygon in "Limites terrestres": the island of Montréal, plus Île Bizard, Île des Sœurs, Île Sainte-Hélène and Île Notre-Dame (parc Jean-Drapeau), Île de la Visitation and the islets of the agglomeration.
- Holes in the land polygons are inland water: the Lachine Canal, the Old Port basins, park ponds and the Jean-Drapeau basins. They are **filled**, because someone on a pier or at a pond's edge is in Montréal. Islets that sit inside that water are dropped.
- The shoreline is simplified with Douglas–Peucker at 5 m. The tolerance is measured in metres, in a local equirectangular projection.
- Any ring that would gain a self-intersection or cross another ring is simplified again with a smaller tolerance. In SQL, `st_makevalid` is the final safeguard.

**Which Lieux d'intérêt records are kept.** The rules are in `LIEUX_TYPE_RULES` in the script. Kept types:
- tourist attractions;
- historic, architectural and design buildings;
- public squares, public art, museums and galleries;
- theatres, performance venues, cinemas and public libraries;
- public markets and commercial streets;
- parks;
- universities and cégeps at niveau 1 only (niveau 2–4 are private vocational schools in office buildings);
- convention centres, train stations and outdoor sports facilities at niveau 1 only (Palais des congrès, Gare Centrale, the stadiums, Circuit Gilles-Villeneuve);
- Hôtel de ville de Montréal.

Dropped as not discoverable: accommodation, schools, health services, police and fire stations, government and municipal offices, borough halls, community centres, indoor sports facilities and pools, taxi stands, mobility hubs, metro stations, toilets, eco-centres, consulates, community gardens, shopping malls and pedestrian streets (the last two are seasonal or linear). Schoolyard parks (`Parc-école …`) and dog runs are dropped by name. The report lists every reason with counts and examples.

**Categories.** Each landmark gets exactly one of: `landmark`, `museum`, `park`, `historic`, `architecture`, `religious`, `culture`, `viewpoint`, `market`, `public-art`, `campus`, `other`. A historic, architectural or museum record becomes `religious` when its name contains basilique, église, cathédrale, chapelle, oratoire, sanctuaire, temple, synagogue, mosquée, monastère, church and similar words. Squares named `Belvédère…` become `viewpoint`, and golf courses become `other`. A few records are recategorised in the overrides, for example Jardin botanique to `park`, Biodôme and Planétarium to `museum`, and Place des Arts to `culture`.

**Prominence.** The Lieux `Classification` "niveau 1–4" maps directly to prominence 1–4, with a few overrides (for example, Biosphère becomes 1). Grand parcs that are not in Lieux get 2. LPC sites: SD 2, SC/IC/SP 3, BC 4. OSM rows get 3 or 4.

**Names and coordinates.**
- Names are normalised to NFC, trimmed, and have whitespace collapsed. French accents are kept.
- Coordinates are WGS84 with 6 decimals. Invalid coordinates are dropped and reported.
- Points outside the island polygon are dropped and reported. Two Lieux parks have their point 25–30 m off the shore, in the river.

**Deduplication.** Two records are merged when they have the same normalised name within 75 m, or very similar names (bigram Dice ≥ 0.85) within 150 m. The kept record is the more prominent one, then the one with the lower id. Lieux records always win over other sources.
- Each dropped record is added to `merged_sources` as `{source_name, source_record_id, source_license, source_url, role}`, where `role` is `merged`, `geofence_polygon` or `merged+geofence_polygon`.
- When comparing across sources, the script also accepts a token-subset match. The shorter name must have at least 2 tokens, one of which is not generic, and it must cover at least half of the longer name.
- Within LPC, the same site under two designations is merged, keeping SD > SC > IC > SP > BC. Examples: Mont-Royal SD/SP and Habitat 67 IC/BC.

**Polygons.**
- From the green-space dataset: "Grand parc" rows are grouped by `Nom`; other green spaces are grouped by name and manager. A group's polygon is attached to a landmark only when the names match and the landmark's point is inside the group or within 150 m of it.
- Grand parcs always give a polygon. Other green spaces give a polygon from 5 ha up; smaller ones are only used to size the radius.
- Composite groups give only the parts around the point and are flagged for review. These are "Grand parc de l'Est" and "Grand parc de l'Ouest", names that list several parks (with a comma), and groups claimed by several landmarks. The parc-nature parks inside the composites (Cap-Saint-Jacques, Anse-à-l'Orme, Pointe-aux-Prairies) are matched by containment.
- LPC polygons are reprojected from EPSG:2950 (MTM zone 8) with an inverse Transverse Mercator written in the script. NAD83(CSRS) is treated as equal to WGS84; the difference is about 1 m. The reprojection is verified by the round trip, by the Habitat 67 point falling inside its polygon, and by areas within 0.5 %.
- An LPC site of 2 ha or more gives a polygon to an exact-name match, or to a park or campus on a similar match. Smaller sites only enlarge the radius.
- Landmark polygons are simplified at 3 m and written with 6 decimals as `geography(MultiPolygon)`. When a polygon is present it should take precedence; `geofence_radius_m` stays at the category default as a fallback.

**Radius.** Each category has a default: public-art 25, viewpoint 40, museum and culture 50, landmark, architecture, religious, historic, market and other 60, park 120, campus 200.
- When a park without a polygon has a known area, its radius is `sqrt(area/π) + 20`, clamped to 40–400 m.
- For other categories with a known area, that value only raises the radius, up to 300 m.
- Curated overrides: Oratory 200 m, Vieux-Port 300, La Ronde 250, Circuit Gilles-Villeneuve and Bassin olympique 200, Stade olympique 150, Île Notre-Dame 350, and others listed in the report.

**Ids and slugs.**
- `id` is a uuid v5 of `"<source_name>:<source_record_id>"` under the fixed namespace `MIGO_LANDMARK_NAMESPACE`. It stays the same across re-runs.
- Grand-parc ids use `grand-parc:<slug of Nom>`, and OSM ids use `node/123` or `way/123`.
- Slugs are lowercase ASCII, at most 80 characters, and match `^[a-z0-9]+(-[a-z0-9]+)*$`. When names collide, the most prominent record keeps the bare slug and the others get `-<neighbourhood>`, then `-<source>-<id>`.
- Slugs are never updated after the first insert. A future collision with an existing row's slug would fail on the unique slug constraint; in that case, add a `name` override for the record.

**OpenStreetMap.** The script requests three kinds of features in the island's bounding box: `tourism=museum|viewpoint` with a name, `tourism=attraction|gallery` with a wikidata tag, and `historic=*` with a wikidata tag.
- A feature is kept only when it is on land, is not within 40 m of a Lieux, park or LPC landmark, and does not match one by name within 150 m.
- Rides, plaques and wayside crosses are dropped.
- OSM rows are never merged into Montréal rows; they are only added.

## Overrides (`backend/data/landmark_overrides.json`)

Keys are `"<source_name>:<source_record_id>"`. Available fields:
- `include` together with `category`: keeps a record that the type rules would drop.
- `exclude`: drops the record; the value is the reason.
- `name`, `description`, `category`, `prominence`, `geofence_radius_m`: replace the generated value.
- `drop_polygon`: removes the attached polygon.
- `no_match` (LPC): stops this site from being merged into another landmark.
- `district_ok`: marks a large polygon as intended, so it is not flagged.
- `needs_review`, `review_note`: flag the row for review, with a note.
- `note`: why the override exists; it is shown in the report.

The report lists any override that matched no record.
