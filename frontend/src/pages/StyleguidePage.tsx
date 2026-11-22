// /styleguide: the MIGO design system at a glance (palette, type, components, icons, mascot poses).
// A reference for the team. Remove the route before a public launch if you don't want it visible.
import { useState, type ReactNode } from 'react'
import Icon from '../components/icons/Icon'
import { ICON_NAMES } from '../components/icons/iconPaths'
import { Mascot, type MascotPose } from '../components/illustrations/Mascot'
import type { Outfit } from '../components/illustrations/Accessories'
import { BrushSwatch, Sparkle, Starburst } from '../components/illustrations/Stickers'
import Avatar, { AVATAR_ART_FRAME } from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button, { ArrowCell } from '../components/ui/Button'
import { arrowLabel, arrowRowClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import Logo from '../components/ui/Logo'
import PageHeader from '../components/ui/PageHeader'
import Timer from '../components/ui/Timer'
import type { AccessoryDef } from '../features/economy/types'
import { ACCESSORIES } from '../features/rewards/catalog/accessories'
import { AVATAR_CATALOG } from '../lib/avatars'

const colours = [
  { name: 'ink', hex: '#264653', use: 'text, rules, outlines', swatch: 'bg-ink', text: 'text-sheet' },
  { name: 'teal', hex: '#2A9D8F', use: 'Local mode, success (fills only)', swatch: 'bg-teal', text: 'text-ink' },
  { name: 'saffron', hex: '#E9C46A', use: 'primary actions, selection', swatch: 'bg-saffron', text: 'text-ink' },
  { name: 'sandy', hex: '#F4A261', use: 'secondary accent', swatch: 'bg-sandy', text: 'text-ink' },
  { name: 'sienna', hex: '#E76F51', use: 'pins, alerts, starbursts (fills only)', swatch: 'bg-sienna', text: 'text-ink' },
  { name: 'paper', hex: '#F3EBD5', use: 'page background', swatch: 'paper-grain', text: 'text-ink' },
  { name: 'sheet', hex: '#FBF6E8', use: 'cards and cells', swatch: 'sheet-grain', text: 'text-ink' },
]

const poses: MascotPose[] = ['hello', 'glide', 'leap', 'read', 'goodies', 'play', 'curious', 'cheer', 'search', 'ponder']

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-3xl">{title}</h2>
      {children}
    </section>
  )
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-12 px-5 py-10">
      <PageHeader eyebrow="Design system" title="MIGO style guide" description="Printed-menu retro: ruled cells, cream paper, ink lines, saffron highlights." aside={<Logo size="md" />} />

      <Section title="Palette">
        <div className="grid border-t-2 border-l-2 border-ink sm:grid-cols-2 lg:grid-cols-4">
          {colours.map((c) => (
            <div key={c.name} className="border-r-2 border-b-2 border-ink">
              <div className={`h-20 ${c.swatch} border-b-2 border-ink ${c.text} grid place-items-center font-display text-xl uppercase`}>{c.name}</div>
              <p className="px-3 py-2 text-sm">
                <strong>{c.hex}</strong> · {c.use}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <Card className="space-y-4">
          <p className="eyebrow">Eyebrow · Montserrat Alternates 700 caps</p>
          <h1 className="text-5xl">Page headline</h1>
          <h2 className="text-3xl">Section title · Bowlby One</h2>
          <h4>Subheading · Alternates bold caps</h4>
          <p>Body copy in Montserrat Alternates: readable, geometric, with the retro single-storey a and rounded w.</p>
          <p className="font-serif text-2xl">Speech and quotes in Fraunces.</p>
          <p className="title-retro font-display text-4xl">Masthead title</p>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="dark">Dark</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button icon="heart">With icon</Button>
          <Button disabled>Disabled</Button>
          <button type="button" className={arrowRowClasses}>
            <span className={arrowLabel}>Arrow row</span>
            <ArrowCell />
          </button>
        </div>
      </Section>

      <Section title="Badges & timer">
        <div className="flex flex-wrap items-center gap-3">
          {(['saffron', 'teal', 'sienna', 'sandy', 'ink', 'outline'] as const).map((t) => (
            <Badge key={t} tone={t} icon="star">
              {t}
            </Badge>
          ))}
          <Badge stamp>Done</Badge>
          <Timer seconds={245} size="sm" />
          <Timer seconds={42} size="sm" />
        </div>
      </Section>

      <Section title={`Icons (${ICON_NAMES.length})`}>
        <ul className="grid grid-cols-4 border-t-2 border-l-2 border-ink sm:grid-cols-8 lg:grid-cols-10">
          {ICON_NAMES.map((name) => (
            <li key={name} className="flex flex-col items-center gap-1 border-r-2 border-b-2 border-ink p-2 text-center">
              <Icon name={name} className="size-8" />
              <span className="text-[0.6rem] font-semibold break-all">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Mascot poses">
        <ul className="grid grid-cols-2 border-t-2 border-l-2 border-ink sm:grid-cols-5">
          {poses.map((p) => (
            <li key={p} className="flex flex-col items-center gap-2 border-r-2 border-b-2 border-ink p-3">
              <Mascot pose={p} className="h-28" label />
              <span className="eyebrow">{p}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-6">
          <Mascot pose="cheer" accessories={{ head: 'explorer-hat', face: 'shades', neck: 'scarf' }} className="h-40" label="Migo dressed up" />
          <Mascot pose="cheer" accessories={{ head: 'flower-crown', neck: 'camera' }} className="h-40" label="Migo in a flower crown" />
          <Mascot pose="cheer" accessories={{ head: 'beret' }} className="h-40" label="Migo in a beret" />
        </div>
      </Section>

      <Section title="Accessory fitting">
        <AccessoryFitting />
      </Section>

      <Section title="Print details">
        <div className="hatch-band" />
        <div className="relative flex items-center gap-6">
          <Starburst tone="sienna" className="size-28" />
          <Starburst tone="teal-soft" className="size-28" />
          <Sparkle className="size-10" />
          <BrushSwatch className="h-20 w-60" />
        </div>
      </Section>
    </main>
  )
}

// ---- Accessory fitting QA -----------------------------------------------------------------------
// Every accessory on every avatar (features/rewards/catalog/accessories.ts `fits`), large, plus
// full outfits. Screenshotted page by page by the fitting QA script ([data-fit-page]).

const FIT_AVATARS = AVATAR_CATALOG.filter((a) => a.landmarks)
const FIT_PAGE_SIZE = 6

/** Full outfits: hat + eyewear + neckwear + something on the back or in hand, on every avatar. */
const COMBOS: { name: string; outfit: Outfit }[] = [
  { name: 'Explorer', outfit: { head: 'explorer-hat', face: 'shades', neck: 'scarf', back: 'backpack', backdrop: 'backdrop-sunburst' } },
  { name: 'Trekker', outfit: { head: 'beanie', ears: 'headphones', face: 'round-specs', neck: 'bandana', back: 'hiking-pack' } },
  { name: 'Royal', outfit: { head: 'crown', face: 'heart-shades', neck: 'pearls', back: 'butterfly-wings', hand: 'balloon' } },
  { name: 'Beach', outfit: { head: 'sun-hat', face: 'aviators', neck: 'lei', hair: 'hibiscus', hand: 'tote-bag' } },
  { name: 'Party', outfit: { head: 'party-hat', face: 'masquerade-mask', neck: 'bow-tie', hair: 'star-clips', hand: 'ice-cream' } },
  { name: 'Winter', outfit: { head: 'santa-hat', ears: 'earmuffs', face: 'cat-eye-shades', neck: 'medal', back: 'backpack' } },
  { name: 'Angel', outfit: { head: 'halo', face: 'cat-eye-shades', neck: 'locket', hair: 'hair-bow', hand: 'map-scroll' } },
  { name: 'Traveller', outfit: { head: 'baseball-cap', ears: 'hoop-earrings', face: 'snorkel-mask', neck: 'passport-lanyard', back: 'backpack' } },
]

function FitCell({ avatar, outfit, fits, debug, label }: { avatar: string; outfit: Outfit; fits: boolean; debug: boolean; label: string }) {
  return (
    <div className="relative border-r-2 border-b-2 border-ink p-1.5" data-fit-cell={label}>
      <Avatar avatar={avatar} size="fill" className={fits ? 'w-full' : 'w-full opacity-35'} accessories={fits ? outfit : undefined} />
      {fits && debug && <FitAnchors avatar={avatar} outfit={outfit} />}
      {!fits && <span className="absolute inset-x-1 bottom-2 bg-sheet px-1 text-center text-[0.6rem] font-bold uppercase">doesn’t fit</span>}
    </div>
  )
}

/** Anchor crosshairs over the picture frame (same geometry as <Avatar>). */
function FitAnchors({ avatar, outfit }: { avatar: string; outfit: Outfit }) {
  const items = ACCESSORIES.filter((a) => Object.values(outfit).includes(a.id) && a.fits[avatar])
  return (
    <span className="pointer-events-none absolute inset-1.5 grid place-items-center">
      <span className={AVATAR_ART_FRAME}>
        <svg viewBox="0 0 100 100" className="size-full" overflow="visible" aria-hidden>
          {items.map((a) => (
            <path key={a.id} d={`M${a.fits[avatar].x * 100 - 3} ${a.fits[avatar].y * 100} h6 M${a.fits[avatar].x * 100} ${a.fits[avatar].y * 100 - 3} v6`} stroke="var(--day-sienna-deep)" strokeWidth="0.8" />
          ))}
        </svg>
      </span>
    </span>
  )
}

function FitHeader() {
  return (
    <>
      <div className="border-r-2 border-b-2 border-ink bg-paper p-2 text-xs font-bold uppercase">Item</div>
      {FIT_AVATARS.map((a) => (
        <div key={a.id} className="border-r-2 border-b-2 border-ink bg-paper p-2 text-center text-xs font-bold">
          {a.id}
        </div>
      ))}
    </>
  )
}

function FitRowLabel({ item }: { item: AccessoryDef }) {
  return (
    <div className="flex flex-col justify-center gap-0.5 border-r-2 border-b-2 border-ink p-2 text-xs">
      <strong className="text-sm leading-tight">{item.name}</strong>
      <span>{item.id}</span>
      <span className="uppercase">
        {item.slot} · {item.rarity} · {item.price}
      </span>
      <span>{Object.keys(item.fits).length}/{FIT_AVATARS.length} fit</span>
    </div>
  )
}

const FIT_GRID = 'grid min-w-[60rem] grid-cols-[9rem_repeat(8,minmax(0,1fr))] border-t-2 border-l-2 border-ink bg-sheet'

function AccessoryFitting() {
  const [debug, setDebug] = useState(false)
  const pages: AccessoryDef[][] = []
  for (let i = 0; i < ACCESSORIES.length; i += FIT_PAGE_SIZE) pages.push(ACCESSORIES.slice(i, i + FIT_PAGE_SIZE))
  return (
    <div className="space-y-6">
      <p className="max-w-prose">
        Every accessory on every avatar, using the per-avatar <code>fits</code> in <code>features/rewards/catalog/accessories.ts</code>. Faded cells are avatars
        the item deliberately doesn’t fit. Below: full outfits on every avatar.
      </p>
      <label className="flex min-h-11 items-center gap-2 font-semibold">
        <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} className="size-5" />
        Show anchor points
      </label>
      <div className="overflow-x-auto">
        <div className="space-y-6">
          {pages.map((page, i) => (
            <div key={i} className={FIT_GRID} data-fit-page={`items-${i + 1}`}>
              <FitHeader />
              {page.map((item) => (
                <FitRow key={item.id} item={item} debug={debug} />
              ))}
            </div>
          ))}
          <div className={FIT_GRID} data-fit-page="combos">
            <FitHeader />
            {COMBOS.map((c) => (
              <div key={c.name} className="contents">
                <div className="flex items-center border-r-2 border-b-2 border-ink p-2 text-sm font-bold">{c.name}</div>
                {FIT_AVATARS.map((a) => (
                  <FitCell key={a.id} avatar={a.id} outfit={c.outfit} fits debug={debug} label={`${c.name}:${a.id}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FitRow({ item, debug }: { item: AccessoryDef; debug: boolean }) {
  return (
    <div className="contents">
      <FitRowLabel item={item} />
      {FIT_AVATARS.map((a) => (
        <FitCell key={a.id} avatar={a.id} outfit={{ [item.slot]: item.id }} fits={a.id in item.fits} debug={debug} label={`${item.id}:${a.id}`} />
      ))}
    </div>
  )
}
