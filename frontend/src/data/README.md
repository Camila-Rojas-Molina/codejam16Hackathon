# Bundled data

- `cities.json`: world cities for the "Where have you explored?" search, as
  `[geonamesId, name, countryCode, admin1Code, lat, lng]` rows, largest first. Every city with
  60,000+ people plus every national capital (7,680 places). Source: GeoNames
  (https://www.geonames.org, CC BY 4.0) via the all-the-cities package (MIT). Loaded lazily, only
  when someone opens the city search.
- `../features/places/worldLand.ts`: Natural Earth 1:110m land outlines (public domain) via the
  world-atlas package (ISC), pre-projected to an SVG path for the profile atlas.
