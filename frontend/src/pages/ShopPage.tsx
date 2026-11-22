// SHOP: spend points on accessories for Migo. Buying asks for a quick confirm; owned items can be
// put on and taken off here or in Profile → Avatar & Migo.
import { useState } from 'react'
import { Link } from 'react-router'
import Icon from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import { Starburst } from '../components/illustrations/Stickers'
import Badge from '../components/ui/Badge'
import Button, { ArrowCell } from '../components/ui/Button'
import { arrowLabel, arrowRowClasses } from '../components/ui/buttonStyles'
import PageHeader from '../components/ui/PageHeader'
import { pointsBalance } from '../features/profile/model'
import type { AccessorySlot } from '../features/profile/types'
import { SHOP_ITEMS, SLOT_LABELS, type ShopItem } from '../features/rewards/shop'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

const SLOTS: AccessorySlot[] = ['head', 'face', 'neck']

function ItemCard({ item }: { item: ShopItem }) {
  const { profile, purchase, setEquipped } = useStore()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const rewards = profile?.rewards
  const owned = rewards?.owned.includes(item.id) ?? false
  const wearing = rewards?.equipped[item.slot] === item.id
  const short = item.price - pointsBalance(rewards)

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      setMessage(done)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <article aria-labelledby={`item-${item.id}`} className={cn('flex flex-col border-r-2 border-b-2 border-ink', wearing ? 'bg-saffron-soft' : 'sheet-grain')}>
      <div className="relative grid h-48 place-items-center overflow-hidden border-b-2 border-ink bg-teal-soft">
        <Mascot pose="cheer" accessories={{ [item.slot]: item.id }} className="h-40" />
        {owned && (
          <Badge tone="ink" className="absolute top-3 left-3">
            {wearing ? 'Wearing' : 'Owned'}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 id={`item-${item.id}`} className="text-2xl">
            {item.name}
          </h3>
          {!owned && (
            <span className="inline-flex shrink-0 items-center gap-1 border-2 border-ink bg-saffron py-0.5 pr-2 pl-1 font-display text-base">
              <Icon name="coin" accent="sheet" className="size-5" />
              {item.price}
              <span className="sr-only"> points</span>
            </span>
          )}
        </div>
        <p className="mt-1 flex-1 text-sm">{item.description}</p>

        <div className="mt-4">
          {owned ? (
            <Button
              fullWidth
              variant={wearing ? 'secondary' : 'primary'}
              disabled={busy}
              onClick={() => run(() => setEquipped(item.id, !wearing), wearing ? `Took off the ${item.name}.` : `Migo is wearing the ${item.name}!`)}
            >
              {wearing ? 'Take off' : 'Put on'}
            </Button>
          ) : confirming ? (
            <div className="space-y-2" role="group" aria-label={`Confirm buying ${item.name}`}>
              <p className="text-sm font-bold">Spend {item.price} points?</p>
              <div className="flex gap-2">
                <Button className="flex-1" disabled={busy} onClick={() => run(() => purchase(item.id), `You bought the ${item.name}!`)}>
                  {busy ? 'Buying…' : 'Buy'}
                </Button>
                <Button className="flex-1" variant="secondary" onClick={() => setConfirming(false)} autoFocus>
                  Cancel
                </Button>
              </div>
            </div>
          ) : short > 0 ? (
            <Button fullWidth variant="secondary" disabled>
              {short} more points needed
            </Button>
          ) : (
            <Button fullWidth onClick={() => setConfirming(true)} icon="bag">
              Buy for {item.price}
            </Button>
          )}
          <p className="mt-2 min-h-5 text-sm font-semibold" aria-live="polite">
            {message}
          </p>
        </div>
      </div>
    </article>
  )
}

export default function ShopPage() {
  const { profile } = useStore()
  const balance = pointsBalance(profile?.rewards)
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      <PageHeader
        eyebrow="Migo’s wardrobe"
        title="Shop"
        description="Accessories for Migo, your exploring sidekick. Earn points from quests to unlock them."
        aside={
          <div className="flex items-end gap-3">
            <div className="relative grid place-items-center">
              <Starburst tone="saffron" className="absolute size-36" />
              <Mascot pose="goodies" className="relative h-28" />
            </div>
            <div className="relative grid size-32 place-items-center border-2 border-ink bg-teal-soft">
              <Mascot pose="cheer" accessories={profile?.rewards.equipped} className="h-28" label="Migo in your current outfit" />
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-stretch gap-3">
        <span className="inline-flex items-center gap-2 border-2 border-ink bg-saffron px-4 py-2 font-bold">
          <Icon name="coin" accent="sheet" className="size-7" />
          <span className="font-display text-2xl leading-none">{balance.toLocaleString()}</span> points to spend
        </span>
        <Link to="/quests" className={arrowRowClasses}>
          <span className={arrowLabel}>Earn more</span>
          <ArrowCell />
        </Link>
      </div>

      {SLOTS.map((slot) => (
        <section key={slot} aria-labelledby={`slot-${slot}`}>
          <h2 id={`slot-${slot}`} className="mb-4 text-3xl">
            {SLOT_LABELS[slot]}
          </h2>
          <div className="grid border-t-2 border-l-2 border-ink sm:grid-cols-2 xl:grid-cols-3">
            {SHOP_ITEMS.filter((i) => i.slot === slot).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
