// /styleguide: the MIGO design system at a glance (palette, type, components, icons, mascot poses).
// A reference for the team. Remove the route before a public launch if you don't want it visible.
import type { ReactNode } from 'react'
import Icon from '../components/icons/Icon'
import { ICON_NAMES } from '../components/icons/iconPaths'
import { Mascot, type MascotPose } from '../components/illustrations/Mascot'
import Avatar from '../components/ui/Avatar'
import { BrushSwatch, Sparkle, Starburst } from '../components/illustrations/Stickers'
import Badge from '../components/ui/Badge'
import Button, { ArrowCell } from '../components/ui/Button'
import { arrowLabel, arrowRowClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import Logo from '../components/ui/Logo'
import PageHeader from '../components/ui/PageHeader'
import Timer from '../components/ui/Timer'

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
          <Avatar avatar="banana" size="fill" className="w-40" accessories={{ head: 'explorer-hat', face: 'shades', neck: 'scarf' }} />
          <Avatar avatar="strawberry" size="fill" className="w-40" accessories={{ head: 'flower-crown', neck: 'camera' }} />
          <Avatar avatar="running-heart" size="fill" className="w-40" accessories={{ head: 'beret' }} />
        </div>
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
