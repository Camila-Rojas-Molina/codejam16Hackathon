// Builds public/data/trees.json: Montréal's public trees (Ville de Montréal open data, "Arbres
// publics", CC BY 4.0) in the central boroughs, as a compact [lng, lat, trunkDiameterCm][] list.
// Uses the portal's SQL API, so only the columns and area we need are downloaded.
//   node scripts/build-trees.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const RESOURCE = '64e28fe6-ef37-437a-972d-d1d3f1f7d891'
const API = 'https://donnees.montreal.ca/api/3/action/datastore_search_sql'
// Downtown, Old Montréal, Plateau, Mont-Royal, Mile End, Westmount edge, the Old Port.
const BBOX = { west: -73.625, east: -73.545, south: 45.49, north: 45.545 }
const PAGE = 10000

const where =
  `"Longitude" IS NOT NULL AND "Latitude" IS NOT NULL ` +
  `AND "Longitude"::float BETWEEN ${BBOX.west} AND ${BBOX.east} AND "Latitude"::float BETWEEN ${BBOX.south} AND ${BBOX.north}`

const rows = []
for (let afterId = 0; ; ) {
  const sql = `SELECT "_id", "Longitude", "Latitude", "DHP" FROM "${RESOURCE}" WHERE ${where} AND "_id" > ${afterId} ORDER BY "_id" LIMIT ${PAGE}`
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) })
  const json = await res.json()
  if (!json.success) throw new Error(JSON.stringify(json.error))
  const records = json.result.records
  for (const r of records) {
    const lng = Number(r.Longitude)
    const lat = Number(r.Latitude)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    const d = Math.max(0, Math.min(150, Math.round(Number(r.DHP) || 0)))
    rows.push([Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5, d])
  }
  console.log(`…${rows.length} trees`)
  if (records.length < PAGE) break
  afterId = records[records.length - 1]._id
}

mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../public/data/trees.json', import.meta.url), JSON.stringify(rows))
console.log(`Wrote public/data/trees.json with ${rows.length} trees`)
