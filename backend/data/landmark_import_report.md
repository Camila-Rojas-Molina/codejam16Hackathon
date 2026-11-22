# Landmark import report

Generated 2026-11-22 by `backend/scripts/import_landmarks.py`. Do not edit by hand; re-run the script.

## Warnings

- Overpass (OpenStreetMap) unavailable: https://overpass-api.de/api/interpreter: <urlopen error [Errno 104] Connection reset by peer>; OSM polygons/supplements skipped.

## Totals

- Landmarks written to 009: **1708**
- Source A (Lieux d'intérêt) read via: CKAN DataStore API (CSV resource)
- Records read: montreal-edifices-patrimoniaux 1336, montreal-lieux-interet 3231
- Skipped: 2838 (see reasons below and `landmark_import_skipped.csv`)
- Duplicates merged: 21
- Polygons attached: 325 from Montréal green spaces, 0 from OpenStreetMap
- Park radii derived from green-space area: 411
- Descriptions filled from montreal.ca 'Lieux' records: 351
- Flagged needs_review: 0

## By category

| category | count | radius (min/median/max) |
|---|---:|---|
| landmark | 114 | 60 / 60 / 500 |
| museum | 50 | 50 / 50 / 80 |
| park | 827 | 40 / 62 / 900 |
| historic | 303 | 50 / 50 / 700 |
| architecture | 39 | 60 / 60 / 150 |
| religious | 29 | 60 / 60 / 150 |
| culture | 200 | 40 / 40 / 40 |
| viewpoint | 5 | 40 / 40 / 50 |
| market | 5 | 60 / 60 / 60 |
| public-art | 106 | 25 / 25 / 25 |
| campus | 30 | 100 / 100 / 400 |

## By source

| source_name | licence | count |
|---|---|---:|
| montreal-edifices-patrimoniaux | CC-BY-4.0 | 267 |
| montreal-lieux-interet | CC-BY-4.0 | 1441 |

## Required places

| place | status | slug | lat, lng | radius | polygon |
|---|---|---|---|---:|---|
| Saint Joseph's Oratory (Oratoire Saint-Joseph du Mont-Royal) | present | `loratoire-saint-joseph-du-mont-royal` | 45.491883, -73.616501 | 150 | none |
| Parc du Mont-Royal | present | `parc-du-mont-royal` | 45.502956, -73.589180 | 900 | montreal 0225-000 |
| Jardin botanique de Montréal | present | `jardin-botanique-de-montreal` | 45.559693, -73.560816 | 400 | montreal 0084-000 |
| Parc Jean-Drapeau | present | `parc-jean-drapeau` | 45.509831, -73.532228 | 900 | montreal 0391-000 |
| Basilique Notre-Dame | present | `basilique-notre-dame-de-montreal` | 45.504591, -73.556408 | 70 | none |

## Island boundary (008)

- Input CRS EPSG:4326, 72 polygons, 37891 vertices, 497.165 km²
- Output: 45 polygons, 5501 vertices, 497.165 km² (tolerance 5 m, islets under 2000 m² dropped: 21488 m²), 127131 bytes

## Skipped by reason

| reason | count |
|---|---:|
| heritage building without a historical summary (low discoverability) | 1012 |
| not a discoverable place: school | 447 |
| not a discoverable place: community organisation / leisure centre | 256 |
| not a discoverable place: lodging (hotel, hostel) | 173 |
| not a discoverable place: sports facility (pool, arena, sports centre) | 156 |
| not a discoverable place: transport (metro, train, mobility hub) | 107 |
| not a discoverable place: transport (taxi stand) | 97 |
| not a discoverable place: community garden (allotment plots, not a public visit) | 90 |
| not a discoverable place: municipal service (offices, recycling, eco-quartier) | 86 |
| not a discoverable place: emergency service (fire, police) | 82 |
| not a discoverable place: government service office | 79 |
| not a discoverable place: health service | 77 |
| not a discoverable place: schoolyard / rest area | 37 |
| not a discoverable place: shopping mall | 31 |
| heritage building without a name | 30 |
| not a discoverable place: commercial street (linear, no meaningful point geofence) | 29 |
| not a discoverable place: minor private college / training school | 23 |
| heritage building named only by its address | 13 |
| not a discoverable place: public toilets | 8 |
| not a discoverable place: tourist information office | 4 |
| not a discoverable place: convention centre | 1 |

## Invalid or outside the island

None.

## Flagged for review (needs_review = true)

None.

## Polygons attached

| slug | from | ref | area (ha) |
|---|---|---|---:|
| `boise-de-roxboro` | montreal | 2715-000 | 4.4 |
| `boise-de-saint-sulpice` | montreal | 0129-000 | 7.2 |
| `boise-riverain` | montreal | 2922-000 | 3.5 |
| `campus-loyola-universite-concordia` | montreal | OBJECTID:3477 | 5.0 |
| `centre-sportif-george-springate` | montreal | 2698-000 | 15.9 |
| `champ-de-mars` | montreal | 0837-000 | 1.9 |
| `champ-des-possibles` | montreal | 1276-000 | 1.4 |
| `cimetiere-mont-royal` | montreal | 1816-200 | 65.2 |
| `cimetiere-notre-dame-des-neiges` | montreal | 1807-300 | 127.6 |
| `ile-notre-dame` | montreal | OBJECTID:3610 | 120.4 |
| `ile-sainte-helene` | montreal | OBJECTID:4725 | 75.3 |
| `jardin-botanique-de-montreal` | montreal | 0084-000 | 73.4 |
| `parc-adrien-d-archambault` | montreal | 2891-000 | 11.8 |
| `parc-ahuntsic` | montreal | 0018-000 | 14.3 |
| `parc-aime-caron` | montreal | 2796-000 | 2.0 |
| `parc-aime-leonard` | montreal | 2550-000 | 2.5 |
| `parc-alexander` | montreal | 2651-000 | 3.6 |
| `parc-alexis-nihon` | montreal | 2790-000 | 3.2 |
| `parc-andre-corbeil-dit-tranchemontagne` | montreal | 0967-000 | 3.3 |
| `parc-andre-laurendeau` | montreal | 2001-000 | 3.3 |
| `parc-angrignon` | montreal | 0341-000 | 96.1 |
| `parc-aragon` | montreal | 2653-000 | 1.5 |
| `parc-armand-bombardier` | montreal | 0961-000 | 7.3 |
| `parc-arthur-therrien` | montreal | 2893-000 | 16.2 |
| `parc-avila-vidal` | montreal | 0035-000 | 1.3 |
| `parc-baldwin` | montreal | 0046-000 | 6.0 |
| `parc-basile-routhier` | montreal | 1051-000 | 2.5 |
| `parc-bassin-de-la-brunante` | montreal | 2791-000 | 3.1 |
| `parc-beaubien` | montreal | 2601-000 | 2.7 |
| `parc-beaubien-2` | montreal | 0202-000 | 5.4 |
| `parc-beauclerk` | montreal | 0102-000 | 1.3 |
| `parc-beaudet` | montreal | 2792-000 | 1.4 |
| `parc-beaulac` | montreal | 2793-000 | 1.1 |
| `parc-belmont` | montreal | 1012-000 | 1.6 |
| `parc-benny` | montreal | 0159-000 | 3.6 |
| `parc-berthe-louard` | montreal | 0426-000 | 1.1 |
| `parc-beurling` | montreal | 2895-000 | 2.1 |
| `parc-bois-des-peres` | montreal | 0785-000 | 4.4 |
| `parc-bourbonniere` | montreal | 2795-000 | 1.6 |
| `parc-brook` | montreal | 2656-000 | 4.8 |
| `parc-campbell-ouest` | montreal | 0348-000 | 1.8 |
| `parc-carignan` | montreal | 2391-000 | 4.6 |
| `parc-carlos-dalcantara` | montreal | 1267-000 | 4.0 |
| `parc-ceres` | montreal | 2657-000 | 1.4 |
| `parc-chamberland` | montreal | 2797-000 | 1.1 |
| `parc-champdore` | montreal | 0950-001 | 4.5 |
| `parc-champetre` | montreal | 0076-000 | 5.4 |
| `parc-charleroi` | montreal | 2551-000 | 2.6 |
| `parc-cite-jardin` | montreal | 0210-000 | 3.9 |
| `parc-claudine-vallerand` | montreal | 0969-000 | 2.0 |
| `parc-clement-jette-nord` | montreal | 0111-000 | 4.2 |
| `parc-clementine-de-la-rousseliere` | montreal | 0704-000 | 6.1 |
| `parc-clifford` | montreal | 0342-000 | 2.6 |
| `parc-cloverdale` | montreal | 2659-000 | 1.8 |
| `parc-conrad-poirier` | montreal | 0964-000 | 2.4 |
| `parc-coubertin` | montreal | 2851-000 | 6.5 |
| `parc-cousineau` | montreal | 2798-000 | 3.0 |
| `parc-cyril-w-mcdonald` | montreal | 2672-000 | 1.6 |
| `parc-da-ma-baie` | montreal | 2660-000 | 2.3 |
| `parc-daniel-johnson` | montreal | 0699-000 | 8.0 |
| `parc-darcy-mcgee` | montreal | 0875-000 | 2.1 |
| `parc-dargenson` | montreal | 0262-000 | 2.1 |
| `parc-dauteuil` | montreal | 0412-000 | 2.7 |
| `parc-de-beausejour` | montreal | 0466-000 | 8.0 |
| `parc-de-deauville` | montreal | 2722-000 | 2.5 |
| `parc-de-dieppe` | montreal | 1257-000 | 4.2 |
| `parc-de-la-bruere` | montreal | 0492-000 | 1.8 |
| `parc-de-la-confederation` | montreal | 0160-000 | 5.7 |
| `parc-de-la-fontaine` | montreal | 2898-000 | 4.7 |
| `parc-de-la-louisiane` | montreal | 0209-000 | 8.3 |
| `parc-de-la-merci` | montreal | 0029-000 | 6.7 |
| `parc-de-la-molise` | montreal | 0923-000 | 1.2 |
| `parc-de-la-promenade-bellerive` | montreal | 0121-000 | 23.1 |
| `parc-de-la-reine-elisabeth` | montreal | 2913-000 | 3.5 |
| `parc-de-la-savane` | montreal | 0510-000 | 1.9 |
| `parc-de-la-verendrye` | montreal | 0351-000 | 3.9 |
| `parc-de-lheritage-equestre` | montreal | 2723-000 | 4.2 |
| `parc-de-lhonorable-george-oreilly` | montreal | 2907-000 | 31.5 |
| `parc-de-louisbourg` | montreal | 0459-000 | 5.0 |
| `parc-de-mesy` | montreal | 0004-000 | 2.0 |
| `parc-de-normanville` | montreal | 0407-000 | 1.7 |
| `parc-de-peterborough` | montreal | 2011-000 | 1.3 |
| `parc-de-roxboro` | montreal | 2710-000 | 1.3 |
| `parc-de-salaberry` | montreal | 0009-000 | 2.1 |
| `parc-de-talcy` | montreal | 2014-000 | 2.1 |
| `parc-de-turin` | montreal | 0406-000 | 1.2 |
| `parc-de-versailles` | montreal | 2663-000 | 1.3 |
| `parc-de-west-vancouver` | montreal | 2918-000 | 2.5 |
| `parc-decelles` | montreal | 2799-000 | 1.4 |
| `parc-delorme` | montreal | 2852-000 | 11.8 |
| `parc-des-anciens-combattants` | montreal | 2717-000 | 3.1 |
| `parc-des-bateliers` | montreal | 0031-001 | 5.0 |
| `parc-des-cageux` | montreal | 0806-000 | 6.4 |
| `parc-des-compagnons-de-saint-laurent` | montreal | 0049-000 | 1.8 |
| `parc-des-faubourgs` | montreal | 1269-000 | 3.0 |
| `parc-des-hirondelles` | montreal | 0025-000 | 15.2 |
| `parc-des-rapides` | montreal | 1215-000 | 30.1 |
| `parc-des-roseraies` | montreal | 2005-000 | 3.6 |
| `parc-des-royaux` | montreal | 0251-000 | 1.4 |
| `parc-des-veterans` | montreal | 0036-000 | 1.2 |
| `parc-dixie` | montreal | 2392-000 | 1.7 |
| `parc-dollard-morin` | montreal | 0978-000 | 3.3 |
| `parc-don-bosco` | montreal | 0970-000 | 7.5 |
| `parc-du-bassin-a-gravier` | montreal | 1293-000 | 1.0 |
| `parc-du-bassin-bonsecours` | montreal | 1806-119 | 5.1 |
| `parc-du-bois-des-caryers` | montreal | 2474-000 | 7.2 |
| `parc-du-bois-des-trottier` | montreal | 2655-000 | 1.4 |
| `parc-du-boise-jean-milot` | montreal | 1225-000 | 6.4 |
| `parc-du-bout-de-lile` | montreal | 0714-000 | 2.3 |
| `parc-du-chateau-pierrefonds` | montreal | 2668-000 | 2.5 |
| `parc-du-fort-de-pointe-aux-trembles` | montreal | 1140-000 | 1.0 |
| `parc-du-fort-rolland` | montreal | 2395-000 | 2.4 |
| `parc-du-mail` | montreal | 2008-000 | 1.9 |
| `parc-du-mont-royal` | montreal | 0225-000 | 189.5 |
| `parc-du-pelican` | montreal | 0212-000 | 5.3 |
| `parc-du-premier-chemin-de-fer` | montreal | 0519-000 | 1.1 |
| `parc-du-sault-au-recollet` | montreal | 0023-000 | 3.4 |
| `parc-du-vaisseau-dor` | montreal | 1266-000 | 1.0 |
| `parc-du-village-saint-louis` | montreal | 2413-000 | 2.4 |
| `parc-duff-court` | montreal | 2394-000 | 1.2 |
| `parc-dunkerque` | montreal | 0149-000 | 1.1 |
| `parc-duval` | montreal | 2669-000 | 7.8 |
| `parc-ernest-rouleau` | montreal | 0963-001 | 1.3 |
| `parc-etienne-desmarteau` | montreal | 0206-000 | 10.1 |
| `parc-eugene-dostie` | montreal | 2348-000 | 24.8 |
| `parc-felix-leclerc-2` | montreal | 2448-000 | 4.2 |
| `parc-felix-leclerc-3` | montreal | 0482-000 | 13.5 |
| `parc-ferdinand-biondi` | montreal | 0916-000 | 2.3 |
| `parc-ferland` | montreal | 2853-000 | 7.6 |
| `parc-francesca-cabrini` | montreal | 0494-000 | 6.0 |
| `parc-francois-perrault` | montreal | 0946-000 | 3.8 |
| `parc-francois-vaillancourt` | montreal | 0703-000 | 2.1 |
| `parc-frederic-back` | montreal | 0950-000 | 152.6 |
| `parc-gabriel-lalemant` | montreal | 0024-000 | 4.6 |
| `parc-gadbois` | montreal | 0167-000 | 4.5 |
| `parc-george-vernot` | montreal | 0941-000 | 3.4 |
| `parc-georges-saint-pierre` | montreal | 0166-000 | 2.4 |
| `parc-germaine-casaubon` | montreal | 1039-000 | 1.7 |
| `parc-gilbert-layton` | montreal | 0156-000 | 3.2 |
| `parc-giuseppe-garibaldi` | montreal | 2854-000 | 7.7 |
| `parc-gohier` | montreal | 2802-000 | 2.5 |
| `parc-gold` | montreal | 2803-000 | 1.1 |
| `parc-goncourt` | montreal | 2009-000 | 3.9 |
| `parc-graham` | montreal | 2671-000 | 2.4 |
| `parc-grier` | montreal | 2675-000 | 8.7 |
| `parc-grovehill` | montreal | 2396-000 | 3.8 |
| `parc-guillaume-bruneau` | montreal | 2805-000 | 2.1 |
| `parc-guillaume-couture` | montreal | 0493-000 | 1.3 |
| `parc-hans-selye` | montreal | 0998-000 | 2.5 |
| `parc-hartenstein` | montreal | 2807-000 | 3.2 |
| `parc-hayward` | montreal | 2450-000 | 2.4 |
| `parc-hebert-2` | montreal | 2855-000 | 6.8 |
| `parc-henri-bourassa` | montreal | 2564-000 | 3.0 |
| `parc-henri-julien` | montreal | 0411-000 | 12.5 |
| `parc-herb-trawick` | montreal | 0316-000 | 1.1 |
| `parc-hochelaga` | montreal | 0057-000 | 1.3 |
| `parc-houde` | montreal | 2808-000 | 1.1 |
| `parc-howard` | montreal | 0298-000 | 2.3 |
| `parc-idola-saint-jean` | montreal | 0221-000 | 1.7 |
| `parc-ignace-bourget` | montreal | 0345-000 | 12.1 |
| `parc-ile-perry` | montreal | 0451-000 | 1.7 |
| `parc-j-j-gagnier` | montreal | 0455-000 | 1.4 |
| `parc-jarry` | montreal | 0401-000 | 35.0 |
| `parc-jean-amyot` | montreal | 0097-000 | 2.9 |
| `parc-jean-brillant` | montreal | 0509-000 | 1.5 |
| `parc-jean-drapeau` | montreal | 0391-000 | 195.7 |
| `parc-jean-duceppe` | montreal | 1173-000 | 2.3 |
| `parc-jean-martucci` | montreal | 0425-000 | 4.9 |
| `parc-jeanne-lapierre` | montreal | 1074-000 | 1.0 |
| `parc-jeanne-mance` | montreal | 0224-000 | 14.6 |
| `parc-jeanne-sauve` | montreal | 0032-000 | 1.3 |
| `parc-jonathan-wilson` | montreal | 2350-000 | 4.0 |
| `parc-joseph-avila-proulx` | montreal | 2352-000 | 1.2 |
| `parc-joseph-pare` | montreal | 0211-000 | 4.6 |
| `parc-joyce` | montreal | 2606-000 | 2.3 |
| `parc-julie-dauth` | montreal | 2678-000 | 1.1 |
| `parc-julie-hamelin` | montreal | 0940-000 | 1.2 |
| `parc-kirkland` | montreal | 2397-000 | 2.5 |
| `parc-l-o-taillon` | montreal | 0114-001 | 2.5 |
| `parc-la-fontaine` | montreal | 0061-000 | 35.6 |
| `parc-lacharite` | montreal | 2456-000 | 3.9 |
| `parc-lacordaire` | montreal | 2555-000 | 1.7 |
| `parc-lacoursiere` | montreal | 2909-000 | 4.6 |
| `parc-ladauversiere` | montreal | 2856-000 | 6.2 |
| `parc-lady-alys-robi` | montreal | 0852-000 | 2.1 |
| `parc-lalancette` | montreal | 0188-000 | 3.5 |
| `parc-lasalle` | montreal | 2398-000 | 16.4 |
| `parc-le-ber` | montreal | 0256-000 | 6.3 |
| `parc-le-carignan` | montreal | 2556-000 | 1.9 |
| `parc-le-prevost` | montreal | 0402-000 | 1.2 |
| `parc-lefebvre` | montreal | 0002-000 | 1.2 |
| `parc-lefebvre-2` | montreal | 2459-000 | 5.8 |
| `parc-leon-provancher` | montreal | 0220-000 | 2.5 |
| `parc-leroux` | montreal | 2460-000 | 4.5 |
| `parc-liebert` | montreal | 0105-000 | 3.8 |
| `parc-louis-cyr` | montreal | 0279-000 | 1.2 |
| `parc-louis-hebert` | montreal | 0021-000 | 1.3 |
| `parc-louis-riel` | montreal | 0495-000 | 9.3 |
| `parc-loyola` | montreal | 0157-000 | 6.7 |
| `parc-lucie-bruneau` | montreal | 2010-000 | 8.2 |
| `parc-luigi-pirandello` | montreal | 2857-000 | 5.0 |
| `parc-macdonald` | montreal | 0172-000 | 3.2 |
| `parc-mackenzie-king` | montreal | 0138-000 | 5.6 |
| `parc-mahatma-gandhi` | montreal | 0145-000 | 3.2 |
| `parc-maisonneuve` | montreal | 0085-000 | 80.1 |
| `parc-marcel-laurin` | montreal | 2812-000 | 33.7 |
| `parc-marcel-leger` | montreal | 1001-000 | 1.8 |
| `parc-marcelin-wilson` | montreal | 0010-000 | 24.1 |
| `parc-marguerite-bourgeoys` | montreal | 0258-000 | 4.4 |
| `parc-marie-claire-daveluy` | montreal | 0974-000 | 2.6 |
| `parc-marie-gerin-lajoie` | montreal | 0513-000 | 1.5 |
| `parc-maurice-richard` | montreal | 0033-000 | 1.8 |
| `parc-mederic-martin` | montreal | 0252-000 | 2.4 |
| `parc-menard` | montreal | 2464-000 | 1.7 |
| `parc-michel-bourdon` | montreal | 1116-000 | 1.1 |
| `parc-mohawk` | montreal | 2465-000 | 1.6 |
| `parc-molson` | montreal | 0197-000 | 1.9 |
| `parc-monk-2` | montreal | 2684-000 | 1.4 |
| `parc-monseigneur-j-a-richard` | montreal | 2914-000 | 10.5 |
| `parc-montmartre` | montreal | 0692-000 | 1.5 |
| `parc-morgan` | montreal | 0077-000 | 1.9 |
| `parc-moulin-du-rapide` | montreal | 0995-000 | 1.4 |
| `parc-nature-de-bois-de-saraguay` | montreal | 9542-000 | 95.4 |
| `parc-nature-de-lile-de-la-visitation` | montreal | 9541-000 | 31.5 |
| `parc-nature-du-bois-de-liesse` | montreal | 9543-000 | 161.5 |
| `parc-nature-du-ruisseau-de-montigny` | montreal | 9570-000 | 30.3 |
| `parc-nelson-mandela` | montreal | 0151-000 | 3.4 |
| `parc-nicolas-tillemont` | montreal | 0199-000 | 2.4 |
| `parc-nicolas-viel` | montreal | 0015-000 | 3.1 |
| `parc-notre-dame-de-grace` | montreal | 0170-000 | 3.7 |
| `parc-olympia` | montreal | 2687-000 | 2.8 |
| `parc-olympique` | montreal | 0083-000 | 47.4 |
| `parc-oscar-peterson` | montreal | 0311-000 | 1.7 |
| `parc-ottawa` | montreal | 2559-000 | 1.7 |
| `parc-ouellette` | montreal | 2466-000 | 3.4 |
| `parc-outremont` | montreal | 2608-000 | 2.7 |
| `parc-ovila-legare` | montreal | 0952-000 | 1.7 |
| `parc-ovila-pelletier` | montreal | 0080-000 | 1.3 |
| `parc-painter` | montreal | 2815-000 | 1.8 |
| `parc-paquin` | montreal | 2688-000 | 1.2 |
| `parc-parent` | montreal | OBJECTID:4258 | 2.9 |
| `parc-parkinson` | montreal | 2689-000 | 1.2 |
| `parc-pasquale-gattuso` | montreal | 0971-000 | 10.7 |
| `parc-pehr-kalm` | montreal | 0924-000 | 3.2 |
| `parc-percy-walters` | montreal | 0226-000 | 1.1 |
| `parc-pere-marquette` | montreal | 0126-000 | 13.8 |
| `parc-philippe-laheurte` | montreal | 2826-000 | 13.6 |
| `parc-pie-xii` | montreal | 2858-000 | 7.7 |
| `parc-pierre-bedard` | montreal | 0094-000 | 5.3 |
| `parc-pierre-bernard` | montreal | 0110-000 | 5.8 |
| `parc-pierre-blanchet` | montreal | 0983-000 | 2.4 |
| `parc-pierre-payet` | montreal | 0764-000 | 3.3 |
| `parc-pilon` | montreal | 2552-000 | 3.5 |
| `parc-pratt` | montreal | 2609-000 | 1.8 |
| `parc-primeau` | montreal | 2553-000 | 1.2 |
| `parc-raimbault` | montreal | 0005-000 | 4.2 |
| `parc-raymond` | montreal | 2468-000 | 3.1 |
| `parc-raymond-prefontaine` | montreal | 0186-000 | 3.6 |
| `parc-rene-goupil` | montreal | 0937-000 | 1.7 |
| `parc-rene-levesque` | montreal | 2401-000 | 17.3 |
| `parc-rene-masson` | montreal | 0980-000 | 10.2 |
| `parc-renee-vautelet` | montreal | 0986-000 | 1.1 |
| `parc-riverside` | montreal | 2469-000 | 11.9 |
| `parc-robert-sauve` | montreal | 2357-000 | 1.2 |
| `parc-roger-rousseau` | montreal | 2012-000 | 18.5 |
| `parc-rosemary-brown` | montreal | 0173-000 | 1.2 |
| `parc-rosemont` | montreal | 0196-000 | 1.4 |
| `parc-rougemont` | montreal | 0098-000 | 1.4 |
| `parc-rutherford` | montreal | 0270-000 | 3.7 |
| `parc-saint-alphonse` | montreal | 0414-000 | 3.1 |
| `parc-saint-andre-apotre` | montreal | 0014-000 | 2.2 |
| `parc-saint-benoit` | montreal | 0012-000 | 3.9 |
| `parc-saint-charles` | montreal | 2696-000 | 1.2 |
| `parc-saint-clement` | montreal | 0091-000 | 2.0 |
| `parc-saint-donat` | montreal | 0101-000 | 5.9 |
| `parc-saint-emile` | montreal | 0187-000 | 2.3 |
| `parc-saint-gabriel` | montreal | 0260-001 | 1.0 |
| `parc-saint-georges` | montreal | 0698-000 | 1.4 |
| `parc-saint-jean-baptiste` | montreal | 0679-000 | 4.1 |
| `parc-saint-joseph` | montreal | 0976-000 | 3.7 |
| `parc-saint-laurent` | montreal | 2562-000 | 3.9 |
| `parc-saint-laurent-2` | montreal | 2818-000 | 6.9 |
| `parc-saint-louis` | montreal | 2403-000 | 1.7 |
| `parc-saint-marcel` | montreal | 0678-000 | 2.2 |
| `parc-saint-paul-de-la-croix` | montreal | 0413-000 | 3.7 |
| `parc-saint-roch` | montreal | 0296-000 | 1.4 |
| `parc-saint-simon-apotre` | montreal | 0011-000 | 3.2 |
| `parc-saint-valerien` | montreal | 0921-000 | 1.0 |
| `parc-saint-viateur` | montreal | 2610-000 | 1.5 |
| `parc-saint-victor` | montreal | 0115-000 | 2.8 |
| `parc-sainte-bernadette` | montreal | 0207-000 | 7.4 |
| `parc-sainte-lucie` | montreal | 0938-000 | 1.9 |
| `parc-sainte-marthe` | montreal | 0965-000 | 4.5 |
| `parc-sainte-odile` | montreal | 0006-000 | 7.5 |
| `parc-samuel-morse` | montreal | 0973-000 | 2.8 |
| `parc-sauve` | montreal | 2560-000 | 4.5 |
| `parc-sir-george-etienne-cartier` | montreal | 0278-001 | 1.8 |
| `parc-sir-wilfrid-laurier` | montreal | 0236-000 | 10.5 |
| `parc-stinson` | montreal | 2470-000 | 1.2 |
| `parc-stoney-point` | montreal | 2404-000 | 5.1 |
| `parc-summerlea` | montreal | 2405-000 | 3.7 |
| `parc-theodore` | montreal | 0088-000 | 1.7 |
| `parc-thomas-chapais` | montreal | 0109-000 | 15.1 |
| `parc-tolhurst` | montreal | 0013-000 | 2.4 |
| `parc-toussaint-louverture` | montreal | 0043-000 | 1.1 |
| `parc-trenholme` | montreal | 0158-000 | 4.7 |
| `parc-van-horne` | montreal | 0139-000 | 3.1 |
| `parc-victor-p-gray` | montreal | 2714-000 | 1.4 |
| `parc-villeray` | montreal | 0409-000 | 7.0 |
| `parc-villeret` | montreal | 2699-000 | 3.2 |
| `parc-vinet` | montreal | 0376-000 | 1.6 |
| `parc-wilfrid-bastien` | montreal | 2859-000 | 6.3 |
| `parc-william-bowie` | montreal | 0179-000 | 1.4 |
| `parc-wilson` | montreal | 2920-000 | 1.7 |
| `parc-wolfred-nelson` | montreal | 1162-000 | 1.6 |
| `parc-yuile` | montreal | 2701-000 | 6.9 |
| `parc-yves-theriault-sherbrooke` | montreal | 1122-000 | 1.8 |
| `parc-zotique-racicot` | montreal | 0030-000 | 3.0 |
| `parc-zotique-st-jean` | montreal | 0991-000 | 1.2 |
| `plage-de-lest` | montreal | 1274-000 | 1.6 |
| `promenade-du-rail` | montreal | 2417-000 | 2.0 |
| `promenade-pere-marquette` | montreal | 2406-000 | 3.7 |
| `square-saint-louis` | montreal | 0042-000 | 1.2 |
| `universite-de-montreal` | montreal | 1807-200 | 46.5 |
| `universite-mcgill` | montreal | 1806-200 | 7.8 |

## Duplicates merged

| kept | dropped | reason | distance (m) |
|---|---|---|---:|
| `basilique-notre-dame-de-montreal` (montreal-lieux-interet:2432) | Basilique Notre-Dame de Montréal (montreal-edifices-patrimoniaux:0040-32-8983-01) | same name | 19 |
| `chapelle-notre-dame-du-sacre-coeur` (montreal-lieux-interet:2564) | Chapelle Notre-Dame du Sacré-Coeur (montreal-edifices-patrimoniaux:0040-32-8983-02) | same name | 16 |
| `chateau-ramezay` (montreal-lieux-interet:2567) | Château Ramezay - Musée et site historique de Montréal (montreal-edifices-patrimoniaux:0040-67-0759-00) | name is a prefix of the other | 8 |
| `edifice-aldred` (montreal-lieux-interet:2609) | Édifice Aldred (montreal-edifices-patrimoniaux:0040-33-3473-00) | same name | 8 |
| `edifice-ernest-cormier` (montreal-lieux-interet:2616) | Édifice Ernest-Cormier (montreal-edifices-patrimoniaux:0040-55-2874-00) | same name | 11 |
| `edifice-grand-tronc` (montreal-lieux-interet:2620) | Édifice du Grand-Tronc (montreal-edifices-patrimoniaux:0039-37-1862-00) | same name except articles/prepositions | 13 |
| `edifice-la-presse` (montreal-edifices-patrimoniaux:0040-24-8997-00) | Édifice La Presse (montreal-edifices-patrimoniaux:0040-34-2286-00) | same name | 39 |
| `gare-dalhousie` (montreal-lieux-interet:2776) | Gare Dalhousie (montreal-edifices-patrimoniaux:0041-70-6093-00) | same name | 2 |
| `hotel-de-ville-de-montreal` (montreal-lieux-interet:2986) | Hôtel de ville de Montréal (montreal-edifices-patrimoniaux:0040-57-4069-00) | same name | 8 |
| `maison-antoine-beaudry` (montreal-lieux-interet:1504) | Maison Antoine-Beaudry (montreal-lieux-interet:1505) | same name | 0 |
| `maison-pierre-chartrand` (montreal-lieux-interet:1509) | Maison Pierre-Chartrand (montreal-lieux-interet:1510) | same name | 0 |
| `marche-bonsecours` (montreal-lieux-interet:2161) | Marché Bonsecours (montreal-edifices-patrimoniaux:0040-77-4486-00) | same name | 6 |
| `monument-sir-george-etienne-cartier` (montreal-lieux-interet:2174) | Monument à sir George-Étienne Cartier (montreal-lieux-interet:2792) | same name except articles/prepositions | 0 |
| `palais-de-justice-de-montreal` (montreal-lieux-interet:2194) | Palais de justice de Montréal (montreal-edifices-patrimoniaux:0040-35-8365-00) | same name | 32 |
| `place-du-village-de-la-pointe-aux-trembles` (montreal-lieux-interet:1630) | Place du Village-de-la-Pointe-aux-Trembles (montreal-lieux-interet:1655) | same name | 66 |
| `place-jacques-cartier` (montreal-lieux-interet:2851) | Place Jacques Cartier (montreal-lieux-interet:3004) | same name | 24 |
| `place-norman-bethune` (montreal-lieux-interet:2856) | Place Norman-Bethune (montreal-lieux-interet:3019) | same name | 33 |
| `place-royale` (montreal-lieux-interet:2858) | Place Royale (montreal-lieux-interet:3016) | same name | 10 |
| `station-de-pompage-dyouville` (montreal-lieux-interet:2937) | Station de pompage (montreal-edifices-patrimoniaux:0040-40-9092-00) | name is a prefix of the other | 8 |
| `tour-de-lhorloge` (montreal-lieux-interet:2964) | Tour de l'Horloge (montreal-edifices-patrimoniaux:0040-85-7973-14) | same name | 5 |
| `vieux-seminaire-de-saint-sulpice` (montreal-lieux-interet:2975) | Vieux séminaire de Saint-Sulpice (montreal-edifices-patrimoniaux:0040-32-7223-01) | same name | 17 |

## Curated overrides applied

| slug | radius | radius from | note |
|---|---:|---|---|
| `basilique-notre-dame-de-montreal` | 70 | curated | Basilique Notre-Dame (source type: museum). |
| `bassin-olympique` | 300 | curated | Bassin olympique (rowing basin, ~2 km long). |
| `belvedere-camillien-houde` | 50 | curated |  |
| `belvedere-kondiaronk` | 50 | curated |  |
| `biodome` | 80 | curated |  |
| `campus-loyola-universite-concordia` | 200 | curated | Campus Loyola (Concordia). |
| `chalet-du-mont-royal` | 60 | curated | Chalet du Mont-Royal. |
| `cimetiere-mont-royal` | 500 | curated | Cimetière Mont-Royal (~65 ha). |
| `cimetiere-notre-dame-des-neiges` | 700 | curated | Cimetière Notre-Dame-des-Neiges (~128 ha). |
| `circuit-gilles-villeneuve` | 400 | curated | Circuit Gilles-Villeneuve (loop on Île Notre-Dame). |
| `croix-du-mont-royal` | 60 | curated | Croix du mont Royal. |
| `gare-centrale-de-montreal` | 80 | curated | Gare centrale. |
| `hotel-de-ville-de-montreal` | 70 | curated | Hôtel de ville de Montréal. |
| `ile-notre-dame` | 600 | curated | Île Notre-Dame (part of Parc Jean-Drapeau). |
| `ile-sainte-helene` | 600 | curated | Île Sainte-Hélène (part of Parc Jean-Drapeau). |
| `insectarium-de-montreal` | 80 | curated |  |
| `jardin-botanique-de-montreal` | 400 | curated | Jardin botanique (~75 ha). |
| `la-ronde-six-flags` | 300 | curated | La Ronde amusement park. |
| `loratoire-saint-joseph-du-mont-royal` | 150 | curated | Saint Joseph's Oratory: basilica plus large terraced grounds on the mountain side, so 150 m instead of 60 m. |
| `marche-bonsecours` | 70 | curated | Marché Bonsecours (no longer a food market). |
| `palais-de-justice-de-montreal` | 80 | curated | Palais de justice de Montréal. |
| `palais-des-congres-de-montreal` | 120 | curated | Palais des congrès. |
| `parc-du-mont-royal` | 900 | curated | Parc du Mont-Royal (~190 ha). Polygon from espace vert dataset when available. |
| `parc-jean-drapeau` | 900 | curated | Parc Jean-Drapeau spans Île Sainte-Hélène and Île Notre-Dame. |
| `parc-maisonneuve` | 555 | park area | Parc Maisonneuve; the green-space dataset names it 'Maisonneuve, Golf municipal de Montréal'. |
| `parc-olympique` | 250 | curated | Parc olympique; source type is 'Centre sportif intérieur'. |
| `place-bonaventure` | 100 | curated | Place Bonaventure. |
| `planetarium-rio-tinto-alcan` | 60 | curated |  |
| `stade-iga` | 120 | curated | Stade IGA (tennis). |
| `stade-olympique` | 150 | curated | Stade olympique (stadium + tower). |
| `stade-percival-molson` | 100 | curated | Stade Percival-Molson. |
| `stade-saputo` | 120 | curated | Stade Saputo. |
| `universite-concordia` | 120 | curated | Concordia Sir George Williams campus (downtown buildings). |
| `universite-de-montreal` | 400 | curated | Université de Montréal main campus on the mountain. |
| `universite-du-quebec-a-montreal-uqam` | 150 | curated | UQAM (several downtown pavilions). |
| `universite-mcgill` | 250 | curated | Université McGill downtown campus. |
| `vieux-port-de-montreal` | 500 | curated | Vieux-Port de Montréal (2.5 km of waterfront). |

## Inputs

- `datastore-4731b64f-29cc-4e08-bc44-8752ae2fcafb.json` sha256 `84dcad6f27e31186344e20b10530b7e6a384c660eb97db8356157570c6759876`
- `datastore-a89dd7ad-ebb1-4d1e-97d5-e14724e50447.json` sha256 `1f3841a0f03a2a3c22145d95e29e04ced141bc3e234be9ebed6889954e8c197d`
- `datastore-edce22aa-f7cc-495e-9c53-b367f68309f6.json` sha256 `aa198082e27b97532c598449f0b7df2a7804c325b248a3471b1f3a915630aae7`
- `datastore-f34c3555-c285-4ef3-a55c-f0f5c440ad2d.json` sha256 `0d9c8a36647edf66c619d88877af6884f10294e1bdd6bb1a7d37218e54eb75d5`
- `espace_vert.json` sha256 `5d5086a6cb00bd6026a6fe4c52002a0175e7d249c30eada868dc35cda44ed152`
- `limites-terrestres.geojson` sha256 `225160c7d902d5cc8de7a02d84fd83465a4b930a8a891c65e2af61e4f5231a25`
