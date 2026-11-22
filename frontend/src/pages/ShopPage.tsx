// SHOP: spend points on cosmetics for YOUR avatar (hats, eyewear, neckwear, backdrops). Tap any item
// to try it on in the fitting room before buying; buying asks for a quick confirm and puts the
// item straight on. Owned items can be put on and taken off here or in Profile.
// Phones: the fitting room sits above the catalogue, and every tile also previews the item on your
// avatar, so nothing needs scrolling back up. Desktop: big fitting room on the left, grid on the right.
import { useState } from 'react'
import { Link } from 'react-router'
import Icon from '../components/icons/Icon'
import type { Outfit } from '../components/illustrations/Accessories'
import { Mascot } from '../components/illustrations/Mascot'
import { Starburst } from '../components/illustrations/Stickers'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button, { ArrowCell } from '../components/ui/Button'
import { arrowLabel, arrowRowClasses } from '../components/ui/buttonStyles'
import PageHeader from '../components/ui/PageHeader'
import { pointsBalance } from '../features/profile/model'
import type { AccessorySlot, Rewards } from '../features/profile/types'
import { itemsForSale, SHOP_SLOTS, shopItem, SLOT_LABELS, type ShopItem } from '../features/rewards/shop'
import { DEFAULT_AVATAR } from '../lib/avatars'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

type Filter = 'all' | AccessorySlot
const FILTERS: Filter[] = ['all', ...SHOP_SLOTS]

const NO_REWARDS: Rewards = { ledger: [], owned: [], equipped: {} }

/** Buy / put on / take off for one item, with the buy confirm and a status line. */
function ItemActions({ item, rewards, onDone, compact = false }: { item: ShopItem; rewards: Rewards; onDone?: () => void; compact?: boolean }) {
  const { purchase, setEquipped } = useStore()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const owned = rewards.owned.includes(item.id)
  const wearing = rewards.equipped[item.slot] === item.id
  const short = item.price - pointsBalance(rewards)

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      setMessage(done)
      onDone?.()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  const buy = () =>
    run(async () => {
      await purchase(item.id)
      await setEquipped(item.id, true)
    }, `Bought the ${item.name}. It’s on!`)

  return (
    <div>
      {owned ? (
        <Button
          fullWidth
          variant={wearing ? 'secondary' : 'primary'}
          disabled={busy}
          onClick={() => run(() => setEquipped(item.id, !wearing), wearing ? `Took off the ${item.name}.` : `Now wearing the ${item.name}.`)}
          aria-label={`${wearing ? 'Take off' : 'Put on'} ${item.name}`}
        >
          {wearing ? 'Take off' : 'Put on'}
        </Button>
      ) : confirming ? (
        <div className="space-y-2" role="group" aria-label={`Confirm buying ${item.name}`}>
          <p className="text-sm font-bold">Spend {item.price} points?</p>
          <div className={cn('flex gap-2', compact && 'flex-col')}>
            <Button className="flex-1" disabled={busy} onClick={buy}>
              {busy ? 'Buying…' : 'Buy'}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setConfirming(false)} autoFocus>
              Cancel
            </Button>
          </div>
        </div>
      ) : short > 0 ? (
        <Button fullWidth variant="secondary" disabled aria-label={`${item.name}: ${short} more points needed`}>
          <Icon name="lock" accent="none" className="size-4" />
          {compact ? `${short} more` : `${short} more points needed`}
        </Button>
      ) : (
        <Button fullWidth onClick={() => setConfirming(true)} icon="bag" aria-label={`Buy ${item.name} for ${item.price} points`}>
          {compact ? 'Buy' : `Buy for ${item.price}`}
        </Button>
      )}
      <p className="mt-2 min-h-5 text-sm font-semibold empty:mt-0 empty:min-h-0" aria-live="polite">
        {message}
      </p>
    </div>
  )
}

function PriceTag({ price }: { price: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 border-2 border-ink bg-saffron py-0.5 pr-2 pl-1 font-display text-base leading-tight">
      <Icon name="coin" accent="sheet" className="size-5" />
      {price}
      <span className="sr-only"> points</span>
    </span>
  )
}

/** Owned / wearing / locked / price, the same everywhere. */
function ItemStatus({ item, rewards }: { item: ShopItem; rewards: Rewards }) {
  const owned = rewards.owned.includes(item.id)
  const wearing = rewards.equipped[item.slot] === item.id
  if (wearing)
    return (
      <Badge tone="ink" icon="check">
        Wearing
      </Badge>
    )
  if (owned) return <Badge tone="teal">Owned</Badge>
  return <PriceTag price={item.price} />
}

type TileProps = {
  item: ShopItem
  rewards: Rewards
  avatar: string
  tryingOn: boolean
  onTry: () => void
}

function ItemTile({ item, rewards, avatar, tryingOn, onTry }: TileProps) {
  const owned = rewards.owned.includes(item.id)
  const locked = !owned && item.price > pointsBalance(rewards)
  // Each tile previews the item on your avatar, with the rest of your outfit as it is.
  const outfit: Outfit = { ...rewards.equipped, [item.slot]: item.id }
  return (
    <article aria-labelledby={`item-${item.id}`} className={cn('flex flex-col border-r-2 border-b-2 border-ink', tryingOn ? 'bg-saffron-soft' : 'sheet-grain')}>
      <button
        type="button"
        onClick={onTry}
        aria-pressed={tryingOn}
        aria-label={`Try on ${item.name}`}
        className="group relative grid place-items-center border-b-2 border-ink bg-teal-soft p-3 focus-visible:outline-3 focus-visible:-outline-offset-[6px] focus-visible:outline-ink sm:p-4"
      >
        <Avatar avatar={avatar} accessories={outfit} size="fill" className={cn('w-full max-w-36 transition-transform group-hover:-rotate-2', tryingOn && '-rotate-2')} />
        {locked && (
          <span className="absolute top-2 left-2 grid size-8 place-items-center border-2 border-ink bg-sheet" title="Not enough points yet">
            <Icon name="lock" accent="none" className="size-4" label="Locked" />
          </span>
        )}
        {tryingOn && (
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 border-2 border-ink bg-ink px-2 py-0.5 text-xs font-bold tracking-wider whitespace-nowrap text-sheet uppercase">
            Trying on
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="eyebrow mb-1 text-[0.65rem]">{SLOT_LABELS[item.slot]}</p>
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <h3 id={`item-${item.id}`} className="text-xl leading-tight sm:text-2xl">
            {item.name}
          </h3>
          <ItemStatus item={item} rewards={rewards} />
        </div>
        <p className="mt-1 hidden flex-1 text-sm sm:block">{item.description}</p>
        <div className="mt-auto pt-3">
          <ItemActions item={item} rewards={rewards} compact />
        </div>
      </div>
    </article>
  )
}

/** The big preview: your avatar in your outfit, plus whatever you're trying on. */
function FittingRoom({ rewards, avatar, name, tryingId, onReset }: { rewards: Rewards; avatar: string; name: string; tryingId: string | null; onReset: () => void }) {
  const trying = shopItem(tryingId)
  const outfit: Outfit = trying ? { ...rewards.equipped, [trying.slot]: trying.id } : rewards.equipped
  const worn = SHOP_SLOTS.map((slot) => shopItem(rewards.equipped[slot])).filter((i): i is ShopItem => !!i)
  return (
    <section aria-labelledby="fitting-title" className="sheet-grain border-2 border-ink lg:sticky lg:top-6">
      <h2 id="fitting-title" className="border-b-2 border-ink bg-ink px-4 py-2 font-sans text-sm font-bold tracking-[0.12em] text-sheet uppercase">
        Fitting room
      </h2>
      <div className="flex items-start gap-4 p-4 lg:flex-col lg:items-stretch lg:p-5">
        <div className="w-32 shrink-0 sm:w-44 lg:w-full">
          <Avatar
            avatar={avatar}
            accessories={outfit}
            size="fill"
            className="w-full"
            name={name}
          />
        </div>
        <div className="min-w-0 flex-1" aria-live="polite">
          {trying ? (
            <>
              <p className="eyebrow">Trying on · {SLOT_LABELS[trying.slot]}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-2xl leading-tight">{trying.name}</h3>
                <ItemStatus item={trying} rewards={rewards} />
              </div>
              <p className="mt-1 text-sm">{trying.description}</p>
              <div className="mt-3">
                <ItemActions key={trying.id} item={trying} rewards={rewards} />
              </div>
              <Button variant="ghost" icon="undo" className="mt-1 px-0" onClick={onReset}>
                Back to my outfit
              </Button>
            </>
          ) : (
            <>
              <p className="eyebrow">Your look</p>
              {worn.length === 0 ? (
                <p className="mt-1">Nothing on yet. Tap any item to try it on.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {worn.map((i) => (
                    <li key={i.id} className="flex items-baseline gap-2">
                      <span className="text-xs font-bold tracking-wider uppercase">{SLOT_LABELS[i.slot]}</span>
                      <span className="font-semibold">{i.name}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 hidden text-sm lg:block">Tap an item to see it on you before you buy.</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default function ShopPage() {
  const { account, profile } = useStore()
  const [tryingId, setTryingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const rewards = profile?.rewards ?? NO_REWARDS
  const avatar = account?.avatar ?? DEFAULT_AVATAR
  const balance = pointsBalance(rewards)
  // Everything: grouped by slot in shop order. A slot: just those.
  const items = filter === 'all' ? SHOP_SLOTS.flatMap((slot) => itemsForSale(slot)) : itemsForSale(filter)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Your avatar’s wardrobe"
        title="Shop"
        description="Hats, eyewear and more for your avatar. Earn points from quests, try things on, then treat yourself."
        aside={
          <div className="relative hidden place-items-center sm:grid">
            <Starburst tone="saffron" className="absolute size-36" />
            <Mascot pose="goodies" className="relative h-28" />
          </div>
        }
      />

      <div className="flex flex-wrap items-stretch gap-3">
        <span className="inline-flex items-center gap-2 border-2 border-ink bg-saffron px-3 py-1.5 font-bold sm:px-4 sm:py-2">
          <Icon name="coin" accent="sheet" className="size-6 sm:size-7" />
          <span className="font-display text-xl leading-none sm:text-2xl">{balance.toLocaleString()}</span> points
          <span className="hidden sm:inline">to spend</span>
        </span>
        <Link to="/quests" className={arrowRowClasses}>
          <span className={arrowLabel}>Earn more</span>
          <ArrowCell />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <FittingRoom rewards={rewards} avatar={avatar} name={account?.name ?? 'You'} tryingId={tryingId} onReset={() => setTryingId(null)} />

        <section aria-labelledby="catalogue-title" className="min-w-0">
          <h2 id="catalogue-title" className="sr-only">
            Catalogue
          </h2>
          <div role="group" aria-label="Show" className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'min-h-11 border-2 border-ink px-3 font-sans text-xs font-bold tracking-[0.08em] uppercase transition-colors sm:px-4',
                  filter === f ? 'bg-ink text-sheet' : 'sheet-grain text-ink hover:bg-saffron-soft',
                )}
              >
                {f === 'all' ? 'Everything' : SLOT_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 border-t-2 border-l-2 border-ink sm:grid-cols-3 lg:grid-cols-2 2xl:grid-cols-3">
            {items.map((item) => (
              <ItemTile
                key={item.id}
                item={item}
                rewards={rewards}
                avatar={avatar}
                tryingOn={tryingId === item.id}
                onTry={() => setTryingId(tryingId === item.id ? null : item.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
