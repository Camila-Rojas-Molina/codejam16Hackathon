// SHOP: spend points on accessories for Migo. Buying asks for a quick confirm; owned items can be
// put on and taken off here or in Profile → Avatar & Migo.
import { useState } from 'react'
import { Link } from 'react-router'
import { PointsIcon } from '../components/illustrations/Icons'
import { Mascot } from '../components/illustrations/Mascot'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
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
    <article
      aria-labelledby={`item-${item.id}`}
      className={cn('flex flex-col rounded-[1.5rem_1.3rem_1.6rem_1.2rem] border-[3px] border-navy p-4', wearing ? 'bg-sun text-ink' : 'bg-paper')}
    >
      <div className="grid h-36 place-items-center rounded-2xl border-[3px] border-navy bg-bubble-light">
        <Mascot mood="cheer" accessories={{ [item.slot]: item.id }} className="h-28" />
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 id={`item-${item.id}`} className="text-2xl leading-tight">
          {item.name}
        </h3>
        {owned ? (
          <Badge tone="navy">{wearing ? 'Wearing' : 'Owned'}</Badge>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-navy bg-sun py-0.5 pr-2.5 pl-1 font-type text-sm text-ink">
            <PointsIcon className="size-5" />
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
            variant={wearing ? 'secondary' : 'sun'}
            disabled={busy}
            onClick={() => run(() => setEquipped(item.id, !wearing), wearing ? `Took off the ${item.name}.` : `Migo is wearing the ${item.name}!`)}
          >
            {wearing ? 'Take off' : 'Put on'}
          </Button>
        ) : confirming ? (
          <div className="space-y-2" role="group" aria-label={`Confirm buying ${item.name}`}>
            <p className="text-sm font-semibold">Spend {item.price} points?</p>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => run(() => purchase(item.id), `You bought the ${item.name}!`)}>
                {busy ? 'Buying…' : 'Buy'}
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => setConfirming(false)} autoFocus>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button fullWidth variant={short > 0 ? 'secondary' : 'primary'} disabled={short > 0} onClick={() => setConfirming(true)}>
            {short > 0 ? `${short} more points needed` : `Buy for ${item.price}`}
          </Button>
        )}
        <p className="mt-2 min-h-5 text-sm" aria-live="polite">
          {message}
        </p>
      </div>
    </article>
  )
}

export default function ShopPage() {
  const { profile } = useStore()
  const balance = pointsBalance(profile?.rewards)
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="flex flex-wrap items-center gap-5">
        <div className="grid size-32 shrink-0 place-items-center rounded-[1.6rem] border-[3px] border-navy bg-paper">
          <Mascot mood="wave" accessories={profile?.rewards.equipped} className="h-28" label="Migo in your current outfit" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl text-navy sm:text-5xl">Shop</h1>
          <p className="mt-1">Accessories for Migo, your exploring sidekick. Earn points from quests to unlock them.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-navy bg-paper py-1 pr-4 pl-1.5 font-type">
              <PointsIcon className="size-8" />
              {balance.toLocaleString()} points to spend
            </span>
            <Link to="/quests" className={buttonClasses({ variant: 'ghost', size: 'md' })}>
              Earn more →
            </Link>
          </div>
        </div>
      </header>

      {SLOTS.map((slot) => (
        <section key={slot} aria-labelledby={`slot-${slot}`}>
          <h2 id={`slot-${slot}`} className="mb-3 text-3xl text-navy">
            {SLOT_LABELS[slot]}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SHOP_ITEMS.filter((i) => i.slot === slot).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
