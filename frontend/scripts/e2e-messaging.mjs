// Two-browser check of CHAT messaging (015_messages.sql): a tourist and a local, each in their own
// browser, match and message each other through Supabase.
//
//   MIGO_URL=http://localhost:8080 SUPABASE_URL=https://<project>.supabase.co SUPABASE_ANON_KEY=<anon key> \
//     node scripts/e2e-messaging.mjs
//
// Needs: the app at MIGO_URL running against that Supabase project, migrations up to 015 run there,
// and "Confirm email" off (Authentication → Providers → Email), because it signs up two throwaway
// logins (migo-e2e-…@example.com). At the end it deletes both MIGO accounts; the two logins stay in
// Authentication → Users (deleting those needs the service key), delete them there if you like.
// HEADED=1 shows the browsers. Exits non-zero on the first failed check.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const APP = (process.env.MIGO_URL ?? 'http://localhost:8080').replace(/\/$/, '')
const SB = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
const KEY = process.env.SUPABASE_ANON_KEY ?? ''
if (!SB || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (and MIGO_URL if the app is not on localhost:8080).')
  process.exit(2)
}

const run = Math.random().toString(36).slice(2, 8)
const PASSWORD = `Migo-e2e-${run}-pw!`
const TIMEOUT = 20_000

async function call(path, body, token) {
  const res = await fetch(`${SB}${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${token ?? KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${path}: ${res.status} ${json?.message ?? json?.msg ?? json?.error_description ?? text}`)
  return json
}

/** A login with a finished profile in the given mode, ready to use Chat. */
async function makePerson(name, mode) {
  const email = `migo-e2e-${name.split(' ')[0].toLowerCase()}-${run}@example.com`
  const s = await call('/auth/v1/signup', { email, password: PASSWORD })
  if (!s?.access_token) throw new Error('Signup returned no session: turn off "Confirm email" in Supabase for this test.')
  const token = s.access_token
  const account = await call('/rest/v1/rpc/migo_create_account', { p_name: name, p_avatar: 'strawberry' }, token)
  const now = Date.now()
  await call(
    '/rest/v1/rpc/migo_save_record',
    {
      p_profile_id: account.id,
      p_record: {
        accountId: account.id,
        activeMode: mode,
        universalCompletedAt: now,
        updatedAt: now,
        tutorial: { status: 'completed', at: now },
        universal: {
          interests: ['food', 'art', 'music', 'nature', 'history'],
          languages: { spoken: ['English', 'French'] },
          personality: { energy: 'ambivert', planning: 'flexible', decisions: 'together' },
          exploration: { pace: 'balanced', groupSize: 'pair' },
          dogs: { stance: 'neutral' },
        },
      },
    },
    token,
  )
  return { name, mode, email, token, id: account.id }
}

async function logIn(browser, person) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const page = await context.newPage()
  page.setDefaultTimeout(TIMEOUT)
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(person.email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'))
  return page
}

let step = 0
const check = async (what, fn) => {
  step++
  const t = Date.now()
  try {
    await fn()
    console.log(`  ok ${step}. ${what} (${Date.now() - t} ms)`)
  } catch (err) {
    throw new Error(`  FAILED ${step}. ${what}\n${err?.message ?? err}`)
  }
}

const browser = await chromium.launch({ headless: !process.env.HEADED })
const people = []
let failed = false
try {
  console.log(`MIGO messaging, two browsers: ${APP} (run ${run})`)
  const tourist = await makePerson(`Tess ${run}`, 'tourist')
  const local = await makePerson(`Luc ${run}`, 'local')
  people.push(tourist, local)
  const hello = `Bonjour Luc! Coffee at Jean-Talon tomorrow? (${run})`
  const reply = `Yes! 10am at the market entrance (${run})`

  const tp = await logIn(browser, tourist)
  const lp = await logIn(browser, local)

  await check('tourist finds the local in Discover and matches', async () => {
    await tp.goto(`${APP}/chat?tab=discover`)
    const match = tp.getByRole('button', { name: `Match with ${local.name}` })
    await tp.getByRole('heading', { name: 'Your top matches' }).waitFor()
    if (!(await match.isVisible())) await tp.getByRole('button', { name: /^Show \d+ more$/ }).click()
    await match.click()
    await tp.getByRole('heading', { name: 'It’s a match!' }).waitFor()
    await tp.getByRole('button', { name: 'Say hi' }).click()
    await tp.waitForURL(`**/chat/${local.id}`)
  })

  await check('tourist sends a message (to the server, no "this device" notice)', async () => {
    await tp.getByLabel(`Message ${local.name}`).fill(hello)
    await tp.getByLabel(`Message ${local.name}`).press('Enter')
    await tp.getByRole('list', { name: `Conversation with ${local.name}` }).getByText(hello).waitFor()
    if (await tp.getByText(/saved on this device/).isVisible()) throw new Error('The thread still says messages stay on this device.')
  })

  await check('local, in the other browser, gets "You’ve been matched!" and the message, unread', async () => {
    await lp.goto(`${APP}/chat`)
    await lp.getByRole('heading', { name: /You’ve been matched!/ }).waitFor()
    await lp.getByRole('link', { name: new RegExp(`${tourist.name}.*${run}.*1 unread`) }).waitFor()
    await lp.getByRole('link', { name: /^Chat/ }).first().getByText(/\d/).first().waitFor()
  })

  await check('local opens the conversation: message shown, unread cleared', async () => {
    await lp.getByRole('link', { name: new RegExp(tourist.name) }).first().click()
    await lp.getByRole('list', { name: `Conversation with ${tourist.name}` }).getByText(hello).waitFor()
    await lp.getByRole('link', { name: new RegExp(`${tourist.name}.*unread`) }).waitFor({ state: 'detached' })
  })

  await check('tourist sees "Seen" on their message (read state synced)', async () => {
    await tp.getByRole('list', { name: `Conversation with ${local.name}` }).getByText(/Seen/).waitFor()
  })

  await check('local replies; the reply reaches the tourist within a few seconds', async () => {
    await lp.getByLabel(`Message ${tourist.name}`).fill(reply)
    await lp.getByLabel(`Message ${tourist.name}`).press('Enter')
    await lp.getByRole('list', { name: `Conversation with ${tourist.name}` }).getByText(reply).waitFor()
    await tp.getByRole('list', { name: `Conversation with ${local.name}` }).getByText(reply).waitFor({ timeout: 12_000 })
  })

  await check('after a reload, both conversations come back from the server', async () => {
    await tp.reload()
    await tp.getByRole('list', { name: `Conversation with ${local.name}` }).getByText(reply).waitFor()
    await tp.getByRole('list', { name: `Conversation with ${local.name}` }).getByText(hello).waitFor()
    await lp.reload()
    await lp.getByRole('list', { name: `Conversation with ${tourist.name}` }).getByText(hello).waitFor()
  })

  await check('the server refuses messages between people who aren’t matched', async () => {
    const stranger = await makePerson(`Sam ${run}`, 'tourist')
    people.push(stranger)
    const err = await call('/rest/v1/rpc/migo_send_message', { p_to: local.id, p_text: 'hi' }, stranger.token).then(
      () => null,
      (e) => e,
    )
    if (!err) throw new Error('A stranger could message the local.')
  })

  console.log('All messaging checks passed')
} catch (err) {
  console.error(err?.message ?? err)
  failed = true
} finally {
  for (const p of people) {
    await call('/rest/v1/rpc/migo_delete_account', { p_profile_id: p.id }, p.token).catch((e) => console.warn(`  cleanup: ${e.message}`))
  }
  await browser.close()
}
process.exit(failed ? 1 : 0)
