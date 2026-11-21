// TEMPORARY: design-system reference for build step 1. Delete this page and its route before the demo.
import { useEffect, useState, type ReactNode } from 'react'
import Badge from '../components/ui/Badge'
import BottomNav from '../components/ui/BottomNav'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import Logo from '../components/ui/Logo'
import Timer from '../components/ui/Timer'

const colours = [
  { name: 'sky', hex: '#6994C6', use: 'app background', swatch: 'bg-sky', text: 'text-navy' },
  { name: 'red', hex: '#E80C0C', use: 'buttons, logo, timer, CTAs', swatch: 'bg-red', text: 'text-white' },
  { name: 'red-rim', hex: '#FF2D2B', use: 'outer rim on pill buttons', swatch: 'bg-red-rim', text: 'text-ink' },
  { name: 'navy', hex: '#13175A', use: 'outlines, text on light', swatch: 'bg-navy', text: 'text-white' },
  { name: 'paper', hex: '#FFF2E6', use: 'cards and sheets', swatch: 'bg-paper', text: 'text-navy' },
  { name: 'bubble', hex: '#7BCFFB', use: 'secondary, hint circle, chips', swatch: 'bg-bubble', text: 'text-navy' },
  { name: 'bubble-light', hex: '#BDEAFF', use: 'alt surfaces, partner card', swatch: 'bg-bubble-light', text: 'text-navy' },
  { name: 'sun', hex: '#FFCC00', use: 'points, badges, success', swatch: 'bg-sun', text: 'text-ink' },
  { name: 'ink', hex: '#000000', use: 'sticker outlines, text on sun', swatch: 'bg-ink', text: 'text-white' },
]

type Rule = 'ok' | 'large' | 'display'

const contrast: { pair: string; ratio: string; rule: Rule; note?: string }[] = [
  { pair: 'navy on paper', ratio: '14.7', rule: 'ok' },
  { pair: 'ink on sun', ratio: '13.9', rule: 'ok' },
  { pair: 'navy on bubble-light', ratio: '12.6', rule: 'ok' },
  { pair: 'navy on bubble', ratio: '9.4', rule: 'ok' },
  { pair: 'ink on sky', ratio: '6.7', rule: 'ok' },
  { pair: 'navy on sky', ratio: '5.1', rule: 'ok', note: 'default text on bg' },
  { pair: 'white on red', ratio: '4.7', rule: 'ok', note: 'buttons, timer' },
  { pair: 'red on paper', ratio: '4.3', rule: 'large', note: 'large text only' },
  { pair: 'white on sky', ratio: '3.2', rule: 'large', note: 'large text only' },
  { pair: 'red on sky', ratio: '1.5', rule: 'display', note: 'big logo/display only' },
]

const ruleTone = { ok: 'sun', large: 'bubble', display: 'red' } as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-3xl">{title}</h2>
      {children}
    </section>
  )
}

function useDemoCountdown(start: number) {
  const [seconds, setSeconds] = useState(start)
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => (s <= 0 ? start : s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [start])
  return seconds
}

export default function StyleguidePage() {
  const live = useDemoCountdown(75)
  const [popKey, setPopKey] = useState(0)

  return (
    <div className="mx-auto max-w-md space-y-10 px-4 pt-8 pb-36">
      <header className="space-y-3">
        <Badge tone="bubble-light">Temporary · step 1</Badge>
        {/* Red on sky is 1.5:1 — allowed only at this huge logo/display size. */}
        <Logo />
        <p>Hand-drawn scrapbook / zine. Every token and base component in one place.</p>
      </header>

      <hr className="trail-divider" />

      <Section title="Colour">
        <ul className="grid grid-cols-2 gap-3">
          {colours.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-2xl border-[3px] border-navy">
              <div className={`${c.swatch} ${c.text} flex h-20 items-end p-2 font-type text-xs`}>{c.hex}</div>
              <div className="bg-paper p-2 text-navy">
                <p className="font-type text-sm uppercase">{c.name}</p>
                <p className="text-xs leading-snug">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>

        <Card title="Contrast" tilt="right">
          <ul className="space-y-2 text-sm">
            {contrast.map((c) => (
              <li key={c.pair} className="flex items-center justify-between gap-2">
                <span>
                  {c.pair}
                  {c.note && <span className="block text-xs opacity-90">{c.note}</span>}
                </span>
                <Badge tone={ruleTone[c.rule]}>{c.ratio}:1</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs">
            Sun = passes 4.5:1 · Bubble = large text only · Red = logo/display only. Body text goes on paper in navy,
            or white on red/navy.
          </p>
        </Card>
      </Section>

      <hr className="trail-divider" />

      <Section title="Type">
        <Card>
          <div className="space-y-3">
            <p className="font-display text-5xl leading-none text-red uppercase">Find the place.</p>
            <p className="font-display text-3xl uppercase">Find your people.</p>
            <p className="font-type text-xs tracking-wider uppercase">Rubik Dirt · logo + headings</p>
            <hr className="trail-divider" />
            <p className="font-type text-2xl tracking-wider uppercase">Selfie time · 08:42</p>
            <p className="font-type text-xs tracking-wider uppercase">Special Elite · buttons, labels, timer</p>
            <hr className="trail-divider" />
            <p>Body copy is DM Sans. Put your phone away and explore the city with someone who knows it.</p>
            <p className="font-type text-xs tracking-wider uppercase">DM Sans · body</p>
          </div>
        </Card>
      </Section>

      <hr className="trail-divider" />

      <Section title="Button">
        <p className="text-sm">Fat pills that squish when pressed. All at least 48 px tall.</p>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="sun">Sun</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
        <Button size="lg" fullWidth>
          Start a quest
        </Button>
        <a href="#top" className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
          Link styled as a button
        </a>
      </Section>

      <hr className="trail-divider" />

      <Section title="Card">
        <Card title="Paper card">
          <p>Paper fill, 3 px navy border, slightly uneven corners.</p>
        </Card>
        <Card title="Tilted left" tilt="left">
          <p>tilt=&quot;left&quot; rotates -1°. tilt=&quot;right&quot; rotates +1°.</p>
        </Card>
        <Card title="Interactive" interactive tilt="right">
          <p>Squishes on tap. Use when the whole card is clickable.</p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card tone="bubble-light">
            <p className="font-type text-sm uppercase">Bubble-light</p>
            <p className="text-sm">partner card</p>
          </Card>
          <Card tone="bubble">
            <p className="font-type text-sm uppercase">Bubble</p>
            <p className="text-sm">secondary</p>
          </Card>
          <Card tone="sun">
            <p className="font-type text-sm uppercase">Sun</p>
            <p className="text-sm">points</p>
          </Card>
          <Card tone="navy">
            <p className="font-type text-sm uppercase">Navy</p>
            <p className="text-sm">Phone Away</p>
          </Card>
        </div>
      </Section>

      <hr className="trail-divider" />

      <Section title="Badge">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>+250 pts</Badge>
          <Badge tone="bubble">easy</Badge>
          <Badge tone="bubble-light">medium</Badge>
          <Badge tone="red">hard</Badge>
          <Badge tone="navy">Local 📍</Badge>
          <Badge tone="outline">Tourist 🧳</Badge>
        </div>
        <Card className="flex items-center gap-6">
          <Badge stamp>✓ Found</Badge>
          <Badge stamp>+250 pts</Badge>
        </Card>
      </Section>

      <hr className="trail-divider" />

      <Section title="Timer">
        <div className="flex flex-wrap items-center gap-4">
          <Timer seconds={live} />
          <span className="text-sm">live: turns red under 1:00</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Timer seconds={8 * 60 + 42} size="sm" />
          <Timer seconds={42} size="sm" />
          <Timer seconds={0} size="sm" />
        </div>
      </Section>

      <hr className="trail-divider" />

      <Section title="Motion">
        <p className="text-sm">
          Bouncy for game moments, slow for Phone Away. Both switch off with prefers-reduced-motion.
        </p>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span
              key={popKey}
              className="grid size-16 animate-pop place-items-center rounded-full border-[3px] border-ink bg-sun text-2xl"
            >
              ⭐
            </span>
            <Button variant="secondary" onClick={() => setPopKey((k) => k + 1)}>
              Pop
            </Button>
          </div>
          <div className="grid size-28 place-items-center rounded-3xl border-[3px] border-navy bg-navy">
            <span className="size-14 animate-breathe rounded-full bg-bubble" />
          </div>
        </div>
      </Section>

      <hr className="trail-divider" />

      <Section title="BottomNav">
        <p className="text-sm">
          Fixed to the bottom of this page. Hunts · Leaderboard · Profile; the active tab becomes a mini red pill.
          Those routes are built in later steps.
        </p>
      </Section>

      <BottomNav />
    </div>
  )
}
