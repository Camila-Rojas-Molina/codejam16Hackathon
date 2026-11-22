// Run: npm run build && npx vite preview --port 4173, then
//   SUPA=<VITE_SUPABASE_URL> node tests/e2e/capture_flow.cjs   (needs the playwright package + Chromium)
// Supabase is intercepted with mock responses: this tests the browser side of the flow, not the SQL
// (backend/tests/explore_test.sql covers that).
// End-to-end smoke test of the MIGO camera → GPS → check → upload → register → gallery flow in a
// real Chromium (phone emulation, fake camera, injected GPS). Supabase endpoints are intercepted.
const { chromium, devices } = require('playwright')
const BASE = 'http://localhost:4173'
const SUPA = process.env.SUPA
const UID = '11111111-2222-4333-8444-555555555555'
const PID = '99999999-8888-4777-8666-555555555555'
const ORAT = 'aaaaaaaa-0000-4000-8000-000000000353'
const OUT = process.env.OUT || require('node:path').join(require('node:os').tmpdir(), 'migo-e2e-shots')

require('node:fs').mkdirSync(OUT, { recursive: true })
const results = []
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`) }

async function scenario(browser, name, geo, checkResponse, run) {
  const ctx = await browser.newContext({
    ...devices['Pixel 7'],
    geolocation: { latitude: geo.lat, longitude: geo.lng, accuracy: geo.acc },
    permissions: ['geolocation', 'camera'],
  })
  const calls = { check: [], register: [], upload: [], del: [], sign: 0 }
  const photos = []
  await ctx.addInitScript(([uid]) => {
    localStorage.setItem('migo:auth:v1', JSON.stringify({ accessToken: 'test-token', refreshToken: 'r', expiresAt: Date.now() + 3600e3, user: { id: uid, email: 't@example.test' } }))
  }, [UID])
  await ctx.route(`${SUPA}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const p = url.pathname
    if (process.env.TRACE) console.log('REQ', Date.now()%100000, req.method(), p)
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    const body = () => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } }
    if (p.endsWith('/rpc/migo_my_profile') || p.endsWith('/rpc/migo_get_profile'))
      return json({ account: { id: PID, name: 'Tess', avatar: 'star', created_at: '2026-11-01T00:00:00Z' }, record: { accountId: PID, universal: { homeCity: 'Montréal', homeCityPlace: null, citiesDiscovered: [], personality: { energy: 'ambivert', newPeople: 'love-it', planning: 'loose-plan', decisions: 'together' }, interests: ['history'], companion: { qualities: ['curious'], idealAdventure: 'wander', idealAdventureNote: '', topics: ['travel'] }, exploration: { budget: { level: 'free', range: null }, pace: 'balanced', attractions: ['landmarks'], food: { styles: [], dietary: [], notes: '' }, transport: ['walking'], groupSize: 'small-group' }, languages: { spoken: ['en'], preferred: [] }, accessibility: { needs: [], notes: '', shareWithMatches: false }, dogs: { stance: 'neutral', dog: { name: '', size: null, vibe: null, goodWithDogs: null, photo: null } } }, universalCompletedAt: 1, activeMode: 'local', tourist: { trips: [], activeTripId: null }, local: null, rewards: { ledger: [], owned: [], equipped: {} }, likes: [], updatedAt: 1 } })
    if (p.endsWith('/rpc/explore_check_location')) { const b = body(); calls.check.push(b); return json(checkResponse(b)) }
    if (p === '/storage/v1/object/sign/gallery' && req.method() === 'POST') { calls.sign++; const b = body(); return json(b.paths.map((x) => ({ path: x, signedURL: `/object/sign/gallery/${x}?token=t`, error: null }))) }
    if (p.startsWith('/storage/v1/object/sign/')) return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><rect width="4" height="5" fill="teal"/></svg>' })
    if (p.startsWith('/storage/v1/object/gallery/') && req.method() === 'POST') { calls.upload.push({ path: p, type: req.headers()['content-type'], size: req.postDataBuffer()?.length }); return json({ Key: p }) }
    if (p.startsWith('/storage/v1/object/gallery/') && req.method() === 'DELETE') { calls.del.push(p); return json({}) }
    if (p.endsWith('/rpc/explore_register_capture')) {
      const b = body(); calls.register.push(b)
      if (name === 'register-fails') return json({ code: 'P0001', message: 'That location reading is too old. Get a fresh one.', hint: 'retry' }, 400)
      const lm = b.p_landmark_id || (checkResponse(b).resolved_landmark_id)
      const photo = { id: 'ph-' + photos.length, storage_path: b.p_storage_path, city_name: 'Montréal', country: 'Canada', country_code: 'CA', lat: null, lng: null, place_id: null, caption: null, quest_id: null, hunt_id: null, taken_at: b.p_captured_at, width: b.p_width, height: b.p_height, created_at: new Date().toISOString(), landmark_id: lm, association_status: lm ? 'landmark_visit' : 'montreal_unassigned', gps_accuracy_m: b.p_accuracy_m, file_size_bytes: b.p_file_size_bytes, landmark_name: lm ? 'L’Oratoire Saint-Joseph du Mont-Royal' : null, landmark_slug: lm ? 'loratoire-saint-joseph-du-mont-royal' : null }
      photos.unshift(photo)
      return json({ photo_id: photo.id, association_status: photo.association_status, landmark: lm ? { id: lm, name: photo.landmark_name, slug: photo.landmark_slug } : null, new_discovery: !!lm, first_visited_at: lm ? b.p_captured_at : null })
    }
    if (p.endsWith('/rpc/gallery_list')) return json(photos)
    if (p.endsWith('/rpc/explore_my_discoveries')) return json(photos.filter((x) => x.landmark_id).slice(0, 1).map((x) => ({ landmark_id: x.landmark_id, name: x.landmark_name, slug: x.landmark_slug, category: 'religious', first_visited_at: x.taken_at, first_photo_id: x.id, photo_count: 1 })))
    if (p.endsWith('/rpc/landmark_get')) return json({ id: ORAT, slug: 'loratoire-saint-joseph-du-mont-royal', name: 'L’Oratoire Saint-Joseph du Mont-Royal', category: 'religious', lat: 45.49188, lng: -73.6165, geofence_radius_m: 150, has_polygon: false, visited: false, visited_at: null, recommended: true, description: null, address: '3800 chemin Queen-Mary', neighbourhood: 'Côte-des-Neiges', polygon: null, source_name: 'montreal-lieux-interet', source_url: 'https://donnees.montreal.ca/dataset/lieux-d-interet', source_license: 'CC-BY-4.0', source_record_id: '353' })
    if (p.endsWith('/rpc/landmarks_in_view')) return json([{ id: ORAT, slug: 'loratoire-saint-joseph-du-mont-royal', name: 'L’Oratoire Saint-Joseph du Mont-Royal', category: 'religious', lat: 45.49188, lng: -73.6165, geofence_radius_m: 150, has_polygon: false, visited: photos.some((x) => x.landmark_id === ORAT), visited_at: null, recommended: true }, { id: 'bbbb', slug: 'parc-la-fontaine', name: 'Parc La Fontaine', category: 'park', lat: 45.5271, lng: -73.5695, geofence_radius_m: 300, has_polygon: true, visited: false, visited_at: null, recommended: false }])
    if (p.startsWith('/rest/v1/rpc/')) return json(null)
    return json([])
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (process.env.TRACE) page.on('framenavigated', (f) => f === page.mainFrame() && console.log('NAV', Date.now()%100000, f.url()))
  try {
    await run(page, calls)
  } catch (e) {
    ok(`${name}: ran without exception`, false, e.message.split('\n')[0])
    await page.screenshot({ path: `${OUT}/${name}-error.png` })
  }
  ok(`${name}: no page errors`, errors.length === 0, errors.join(' | '))
  await ctx.close()
}

const oratoryCheck = (b) => ({ status: 'ok', reason: null, message: 'You’re at L’Oratoire Saint-Joseph du Mont-Royal.', candidates: [{ id: ORAT, name: 'L’Oratoire Saint-Joseph du Mont-Royal', category: 'religious', distance_m: 42, match: 'radius', visited: false }], resolved_landmark_id: ORAT, ambiguous: false, limits: { max_accuracy_m: 50, max_position_age_s: 120, max_capture_gap_s: 30 } })
const limits = { max_accuracy_m: 50, max_position_age_s: 120, max_capture_gap_s: 30 }

async function shoot(page) {
  await page.goto(`${BASE}/camera`)
  const start = page.getByRole('button', { name: /start camera/i })
  await page.waitForTimeout(800)
  if (await start.isVisible().catch(() => false)) await start.click()
  const shutter = page.getByRole('button', { name: 'Take photo' })
  await shutter.waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForFunction(() => { const v = document.querySelector('video'); return v && v.readyState >= 2 && v.videoWidth > 0 }, null, { timeout: 10000 })
  await shutter.click()
}

;(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })

  // Scenario 1: first landmark visit at the Oratory.
  await scenario(browser, 'oratory', { lat: 45.4921, lng: -73.6170, acc: 12 }, oratoryCheck, async (page, calls) => {
    await shoot(page)
    await page.getByText(/Oratoire/).first().waitFor({ timeout: 15000 })
    await page.screenshot({ path: `${OUT}/1-oratory-ready.png` })
    ok('oratory: GPS sent on shutter', calls.check.length === 1 && Math.abs(calls.check[0].p_lat - 45.4921) < 1e-6, JSON.stringify(calls.check[0]))
    const gap = Math.abs(Date.parse(calls.check[0].p_captured_at) - Date.parse(calls.check[0].p_position_at))
    ok('oratory: fix and capture timestamps close', gap < 5000, `${gap} ms`)
    ok('oratory: nothing uploaded before saving', calls.upload.length === 0)
    const save = page.getByRole('button', { name: /save/i }).first()
    await save.click()
    await page.getByText(/new discovery|saved/i).first().waitFor({ timeout: 15000 })
    await page.screenshot({ path: `${OUT}/1-oratory-saved.png` })
    ok('oratory: uploaded one JPEG to own folder', calls.upload.length === 1 && calls.upload[0].path.includes(`/gallery/${UID}/`) && calls.upload[0].type === 'image/jpeg', JSON.stringify(calls.upload))
    const r = calls.register[0] || {}
    ok('oratory: registered with fix + path', r.p_storage_path?.startsWith(UID + '/') && r.p_accuracy_m === 12 && r.p_file_size_bytes > 0 && r.p_width <= 1600, JSON.stringify({ ...r, p_storage_path: r.p_storage_path }))
    const tracks = await page.evaluate(() => { const v = document.querySelector('video'); const s = v && v.srcObject; return s ? s.getTracks().filter((t) => t.readyState === 'live').length : 0 })
    ok('oratory: camera stopped after capture', tracks === 0, `${tracks} live tracks`)
    await page.getByRole('link', { name: /gallery/i }).first().click()
    await page.waitForURL(/\/gallery/)
    await page.getByText(/Oratoire/).first().waitFor({ timeout: 10000 })
    await page.screenshot({ path: `${OUT}/1-gallery.png`, fullPage: true })
    ok('gallery: photo shown with landmark + signed URL', calls.sign >= 1)
  })

  if (process.env.ONLY) { await browser.close(); console.log(results.join('\n')); return }
  // Scenario 2: inside Montréal, no landmark.
  await scenario(browser, 'memory', { lat: 45.46, lng: -73.64, acc: 9 }, () => ({ status: 'ok', reason: null, message: 'No MIGO place right here.', candidates: [], resolved_landmark_id: null, ambiguous: false, limits }), async (page, calls) => {
    await shoot(page)
    await page.getByText('No MIGO place here').first().waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: /save/i }).first().click()
    await page.getByText(/Montréal memory/).first().waitFor({ timeout: 15000 })
    ok('memory: registered without landmark', calls.register.length === 1 && calls.register[0].p_landmark_id == null)
    await page.screenshot({ path: `${OUT}/2-memory-saved.png` })
  })

  // Scenario 4: inaccurate GPS → retry, photo kept, nothing uploaded.
  let n = 0
  await scenario(browser, 'poor-gps', { lat: 45.4921, lng: -73.617, acc: 400 }, (b) => (++n === 1 || b.p_accuracy_m > 50)
    ? { status: 'retry', reason: 'poor_accuracy', message: 'Your GPS is only accurate to about 400 m (we need 50 m or better).', candidates: [], resolved_landmark_id: null, ambiguous: false, limits }
    : oratoryCheck(b), async (page, calls) => {
    await shoot(page)
    const retry = page.getByRole('button', { name: /retry location/i })
    await retry.waitFor({ timeout: 15000 })
    await page.screenshot({ path: `${OUT}/4-poor-gps.png` })
    ok('poor-gps: nothing uploaded', calls.upload.length === 0 && calls.register.length === 0)
    ok('poor-gps: photo still shown', await page.locator('img[src^="blob:"]').count() > 0)
    await page.context().setGeolocation({ latitude: 45.4921, longitude: -73.617, accuracy: 10 })
    await retry.click()
    await page.getByText(/Oratoire/).first().waitFor({ timeout: 15000 })
    ok('poor-gps: retry took a fresh reading', calls.check.length === 2 && calls.check[1].p_accuracy_m === 10, JSON.stringify(calls.check.map((c) => c.p_accuracy_m)))
    ok('poor-gps: retry kept capture time', calls.check[0].p_captured_at === calls.check[1].p_captured_at)
  })

  // Scenario 5: outside the island.
  await scenario(browser, 'outside', { lat: 45.6066, lng: -73.7124, acc: 10 }, () => ({ status: 'outside_area', reason: 'outside_area', message: 'This photo was taken outside the Island of Montréal.', candidates: [], resolved_landmark_id: null, ambiguous: false, limits }), async (page, calls) => {
    await shoot(page)
    await page.getByText('Outside Montréal Island').first().waitFor({ timeout: 15000 })
    await page.screenshot({ path: `${OUT}/5-outside.png` })
    ok('outside: nothing uploaded or registered', calls.upload.length === 0 && calls.register.length === 0)
  })

  // Ambiguous: two candidates, user must pick.
  await scenario(browser, 'ambiguous', { lat: 45.5, lng: -73.57, acc: 6 }, () => ({ status: 'ok', reason: null, message: 'Pick one', candidates: [{ id: 'c1', name: 'Statue A', category: 'public-art', distance_m: 4, match: 'radius', visited: false }, { id: 'c2', name: 'Statue B', category: 'public-art', distance_m: 6, match: 'radius', visited: false }], resolved_landmark_id: null, ambiguous: true, limits }), async (page, calls) => {
    await shoot(page)
    await page.getByText('Several MIGO places nearby').first().waitFor({ timeout: 15000 })
    await page.screenshot({ path: `${OUT}/6-ambiguous.png` })
    await page.getByText('Statue B').click()
    const save = page.getByRole('button', { name: /save/i }).first()
    await save.click()
    await page.waitForTimeout(1500)
    ok('ambiguous: chosen landmark sent', calls.register[0]?.p_landmark_id === 'c2', JSON.stringify(calls.register[0]?.p_landmark_id))
  })

  // Server refuses at registration → uploaded file deleted (no orphan).
  await scenario(browser, 'register-fails', { lat: 45.4921, lng: -73.617, acc: 10 }, oratoryCheck, async (page, calls) => {
    await shoot(page)
    await page.getByText(/Oratoire/).first().waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: /save/i }).first().click()
    await page.getByRole('button', { name: /retry location/i }).waitFor({ timeout: 15000 })
    ok('register-fails: orphan file deleted', calls.upload.length === 1 && calls.del.length === 1 && calls.del[0] === calls.upload[0].path, JSON.stringify(calls.del))
    await page.screenshot({ path: `${OUT}/7-register-fails.png` })
  })

  // Map without a Maps key: full catalogue list + deep link.
  await scenario(browser, 'map', { lat: 45.5, lng: -73.57, acc: 10 }, oratoryCheck, async (page) => {
    await page.goto(`${BASE}/camera`)
    await page.waitForTimeout(1500)
    await page.evaluate(() => { history.pushState({}, '', '/map?landmark=loratoire-saint-joseph-du-mont-royal'); dispatchEvent(new PopStateEvent('popstate')) })
    await page.getByText(/Parc La Fontaine/).first().waitFor({ timeout: 15000 })
    await page.screenshot({ path: `${OUT}/8-map.png` })
    ok('map: non-recommended landmark listed', await page.getByText(/Parc La Fontaine/).count() > 0)
    ok('map: deep-linked landmark sheet open', await page.getByRole('link', { name: /open camera/i }).count() + await page.getByRole('button', { name: /open camera/i }).count() > 0)
  })

  await browser.close()
  console.log(results.join('\n'))
  console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
})()
