# Landmark import

`import_landmarks.py` builds MIGO's catalogue of places to discover on Montréal Island from open data. It writes two SQL files for the Supabase SQL Editor:

| File | Fills | Size |
|---|---|---|
| `backend/supabase/migrations/008_montreal_island_boundary.sql` | `public.service_areas` row `montreal-island` (land boundary) | ~130 KB |
| `backend/supabase/migrations/009_landmarks_seed.sql` | `public.landmarks` (~1,700 rows) | ~1 MB |

It also writes a review report to `backend/data/landmark_import_report.md`, and every skipped record to `backend/data/landmark_import_skipped.csv`.

Both SQL files need migration `007_landmarks_geofencing.sql` (tables and RPCs) to run first. Never edit them by hand: change the script or `backend/data/landmark_overrides.json` and run the script again.

## Re-running

From the repository root. You need Python 3.10 or newer. It uses the standard library only, so there is nothing to install.

```sh
python3 -I backend/scripts/import_landmarks.py --cache /tmp/migo-landmark-raw
```

- `--cache DIR`: where the raw downloads go. Files already in `DIR` are reused. Without this flag, the script uses `$TMPDIR/migo-landmark-raw`.
- `--refresh`: download everything again.
- `--offline`: use only the files already in the cache.
- `--no-osm`: never call the Overpass API (OpenStreetMap).
- `--boundary-file F`: use a GeoJSON boundary you downloaded yourself.
- `--require-boundary`: stop with an error if the boundary can't be loaded. Without it, the script still writes 009, skips 008 and prints a warning.
- `--date YYYY-MM-DD`: the date written in the SQL headers. It defaults to today (UTC).
- `--self-test`: check the geometry code (MTM 8 projection, Douglas–Peucker, point-in-polygon, ring stitching) and the name functions.

The output is deterministic. The same inputs and `--date` give byte-identical SQL and report, because rows are sorted by `(source_name, source_record_id)`. The SQL headers list a sha256 for each input file.

After a run, paste 008 and then 009 into the SQL Editor, or apply them with the other migrations. Both are idempotent:

- **008** upserts `service_areas` on `id`.
- **009** runs in one transaction. It upserts `landmarks` on `(source_name, source_record_id)`, so a row keeps its `id` across runs. An update never touches `slug`, so links stay stable. Rows from a source that no longer appear in that source are set `is_active = false`, never deleted. A source that failed to load in a run is left out of that step.

Downloading: `donnees.montreal.ca` rejects some generic HTTP clients with `403 RBAC: access denied` (default curl / Python user agents). The script identifies itself as `migo-landmark-import/1.0` and gets through. If a download still fails, Source A falls back to the portal's CKAN DataStore API.

## Sources and licences

| source_name | Dataset | Licence | Used for |
|---|---|---|---|
| `montreal-lieux-interet` | [Lieux d'intérêt](https://donnees.montreal.ca/dataset/lieux-d-interet), Ville de Montréal | CC BY 4.0 | Main catalogue: 3,231 points. Read from the CSV resource through the CKAN DataStore API (`datastore_search`), because the CSV has the `Nom court` column and the GeoJSON doesn't. The GeoJSON is the fallback. |
| `montreal-edifices-patrimoniaux` | [Les édifices patrimoniaux de Montréal (archives)](https://donnees.montreal.ca/dataset/les-edifices-patrimoniaux-de-montreal), Ville de Montréal | CC BY 4.0 | Heritage buildings that have a historical summary: names, descriptions, addresses. This is the open-data version of the Grand répertoire du patrimoine bâti. |
| (descriptions only) | [Lieux et bâtiments à vocation publique](https://donnees.montreal.ca/dataset/lieux-batiments-vocation-publique), Ville de Montréal | CC BY 4.0 | Fills an empty `description` with the montreal.ca "Lieux" text when the name is the same and the two points are within 250 m. |
| (polygons) | [Grands parcs, parcs d'arrondissements et espaces publics](https://donnees.montreal.ca/dataset/grands-parcs-parcs-d-arrondissements-et-espaces-publics), Ville de Montréal | CC BY 4.0 | Park, campus and cemetery polygons (`espace_vert.json`) and park areas. |
| (service area) | [Limites terrestres de l'île de Montréal](https://donnees.montreal.ca/dataset/limites-terrestres), Ville de Montréal | CC BY 4.0 | 008 boundary. |
| `openstreetmap` | OpenStreetMap via the Overpass API | ODbL 1.0, "© OpenStreetMap contributors" | Optional. Used for a curated polygon (Saint Joseph's Oratory grounds) and for required places missing from the municipal data. Any row or polygon that comes from OSM gets `needs_review = true` and a `review_note` carrying the attribution. |

Attribution required by CC BY 4.0: "Contains data from Ville de Montréal (donnees.montreal.ca), CC BY 4.0." For any OSM content: "© OpenStreetMap contributors (ODbL)". The SQL headers carry the same attribution.

The script does not use Google Places or any other proprietary data.

## Decisions

### Scope of "Montréal Island"

The service area is every land polygon in the official *Limites terrestres* file. That covers the island of Montréal, Île Bizard, Île des Sœurs, Île Sainte-Hélène, Île Notre-Dame, Île de la Visitation and the other islets of the agglomeration.

- Islets under 2,000 m² and lakes or ponds under 2,000 m² are dropped. Dropping a lake hole only makes the area bigger, so the boundary never shrinks.
- Simplification is Douglas–Peucker at 5 m. The script would step up to 7.5 m and then 10 m only if the GeoJSON went over 1.4 MB; at 5 m it is 130 KB.
- The file is already WGS84 (`CRS84`). If a future version comes in NAD83 MTM zone 8 (EPSG:2950 or 32188), the script reprojects it with a pure-Python Krüger inverse transverse Mercator, tested to under 1 cm. NAD83 and WGS84 differ by about 1–2 m here, which is ignored.
- A landmark must fall inside the boundary, or within 60 m of the shore (quays, piers). Otherwise it is skipped and listed in the report.

### What counts as a place to discover (source A)

Kept, by the source `Type` field:

| Source type | Category |
|---|---|
| tourist attractions, public squares, pedestrian streets | `landmark` |
| historic or heritage buildings | `historic` |
| architecture / design buildings | `architecture` |
| museums and interpretation centres | `museum` |
| theatres, cinemas, galleries, municipal venues (maisons de la culture), public libraries | `culture` |
| public art | `public-art` |
| parks | `park` |
| public markets | `market` |
| cégeps and universities of level 1 or 2 | `campus` |

Dropped, with the reason recorded in the report:

- hotels and hostels
- shopping malls and commercial streets (a long street has no meaningful point)
- schools, and level 4 private or vocational colleges
- sports facilities (pools, arenas, sports centres)
- community organisations and leisure centres
- community gardens (allotment plots)
- health, emergency and government services
- municipal offices, eco-quartiers and recycling centres
- public toilets
- transport (metro stations, trains, taxi stands, mobility hubs)
- tourist information offices
- schoolyards ("Parc-école") and rest areas

A few dropped types hold real landmarks, such as the Olympic Park, Stade Saputo, the Bassin olympique, the Circuit Gilles-Villeneuve, the Palais des congrès, the Gare centrale and the Hôtel de ville. These are put back one by one with `include: true` in the overrides file.

Name rules then refine the category:

- `Église …`, `Basilique …`, `Chapelle …`, `Oratoire …` and similar names become `religious`. This also rescues churches whose source type is "community centre".
- `Belvédère …` and `Observatoire …` become `viewpoint`.
- `Musée …` becomes `museum`.
- `Cimetière …` becomes `historic`.

The `other` category exists in the contract but isn't used yet.

Heritage buildings are kept only when they have a name and a historical summary: 297 of the 1,336 records, and about 270 after dedupe. One named only by its street address is dropped.

- Typology `gratte-ciel`, `Tour d'habitation` or `Immeuble de bureaux` gives `architecture`.
- Places of worship give `religious`.
- Everything else gives `historic`.

### Names and fields

- Names are NFC-normalised, have control characters and HTML removed, and have whitespace collapsed. French accents are kept.
- Public art uses the source short name (the title of the work). The full "artist, title, year" text goes into `description`. A work called "Sans titre" gets the artist added in parentheses.
- `address` is the source civic number and street, then the city and postal code.
- `neighbourhood` is the borough or linked city, with the punctuation made consistent across sources.
- `description` is capped at 600 characters, cut at a sentence break.
- `h3_index` is left `null`.

### Duplicates

Records are processed in priority order: source A first, then lower `Classification` level, then source id. A later record is merged into an earlier one (the earlier one keeps its fields; an empty description or address is filled from the dropped record) when:

- the normalised name is the same and the points are within 75 m, or
- the points are within 150 m and the names are the same apart from articles and prepositions, or differ by a similarity of 0.88 or more with the same number of words, or one name is a word-prefix of the other (for example "Château Ramezay" and "Château Ramezay - Musée …"), with compatible categories.

The rules never merge names that differ by a numeral, a cardinal direction or a qualifier such as *vieux*, *ancien*, *nouveau* or *annexe*. That keeps "Vieux palais de justice" and "Palais de justice", or "Parc X-Nord" and "Parc X-Sud", apart. Every merge is listed in the report.

### Geofences

`geofence_radius_m` is an integer clamped to 15..2000. The first rule that applies wins:

1. A curated radius in `landmark_overrides.json`.
2. For parks: the radius of a circle with the park's area (from the matched polygon or the green-space attribute table) × 1.1, clamped to 40..1500 m.
3. The category default:

| Category | Default radius |
|---|---|
| `public-art` | 25 m |
| `culture`, `viewpoint` | 40 m |
| `historic`, `museum`, `other` | 50 m |
| `landmark`, `architecture`, `religious`, `market` | 60 m |
| `campus` | 100 m |
| `park` | 120 m |

`geofence_polygon` is attached only when the match is clear:

- **Parks:** a polygon group (features grouped by `NUM_INDEX`) whose name, without generic words like *parc*, *du* or *de la*, equals the park's, and which contains the point or lies within 100 m of it. The park must also be at least 1 ha; smaller parks keep a circle only. When several groups match and none contains the point, nothing is attached and the case is listed under "ambiguous".
- **Curated:** an `espace_vert_index` set in the overrides, such as the Jardin botanique, the cemeteries, McGill, UdeM, Loyola, the Olympic Park and the two islands of Parc Jean-Drapeau. It is attached only if the polygon is within 250 m of the point.
- **OpenStreetMap:** a curated `osm_polygon` lookup, attached only if the OSM way or relation contains the point and is under 3 km².

Polygons are simplified at 5 m. In SQL, every polygon is wrapped in `st_makevalid` → `st_collectionextract(…, 3)` → `st_multi`, so a simplified ring that self-intersects can't break the cast to `geography(MultiPolygon)`.

Large places:

| Place | Radius | Polygon |
|---|---|---|
| Saint Joseph's Oratory | 150 m (basilica and terraced grounds) | from OSM when Overpass answers; otherwise the 150 m circle |
| Parc du Mont-Royal | 900 m | 190 ha |
| Parc Jean-Drapeau | 900 m | 196 ha, both islands |
| Île Notre-Dame, Île Sainte-Hélène | 600 m each | one island each |
| Jardin botanique | 400 m | 73 ha |
| Cimetière Notre-Dame-des-Neiges | 700 m | yes |
| Cimetière Mont-Royal | 500 m | yes |
| Université de Montréal | 400 m | yes |
| McGill | 250 m | yes |
| Olympic Park | 250 m | yes |

### Slugs

A slug is the name, ASCII-folded and lowercased, with every other character turned into `-`, and at most 80 characters. When two places would get the same slug, the one that sorts first by source priority and then numeric `source_record_id` keeps the bare slug; the others get `-2`, `-3` and so on.

Because an upsert never overwrites `slug`, an existing row keeps its slug. One edge case: if a later run adds a new record with a *lower* source id and the same name as an existing row, its slug would clash with that row's. Fix it with a `name` override.

### needs_review

Set to `true` in these cases:

- rows or polygons from OpenStreetMap (licence and position to check)
- heritage records whose coordinates have fewer than 3 decimals
- points just outside the shoreline

The review list is in the report. A re-run sets the flag again, so clear a case by changing the overrides or the script, not only the database row.

## Curated inputs (`backend/data/landmark_overrides.json`)

- `records["<source_name>:<source_record_id>"]`: per-record `include`, `exclude`, `category`, `name`, `geofence_radius_m`, `espace_vert_index` (`NUM_INDEX` or `OBJECTID:<n>`), `osm_polygon`, and a `note` shown in the report.
- `name_rules`: regex → category, applied in order.
- `required`: places that must be in the catalogue (the Oratory, Mont-Royal, the Jardin botanique, Jean-Drapeau, the Notre-Dame Basilica). If one is missing, the script tries OpenStreetMap and adds it with `needs_review = true`.

## Known limitations

- `overpass-api.de` was unreachable (connection reset) while the committed files were generated. So no OSM polygon is attached yet; for the Oratory, that is the grounds polygon, and it uses a 150 m circle instead. Re-run when Overpass answers: the response is cached, and the polygon then appears with `needs_review = true`.
- The heritage dataset is an archive that is no longer updated, and is concentrated in Vieux-Montréal.
- *Lieux d'intérêt* covers the Ville de Montréal boroughs (plus a few Westmount records). The other linked cities on the island (West Island, Mont-Royal…) are represented only through heritage buildings.
