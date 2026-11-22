// SHOP: spend points on cosmetics for YOUR avatar: wearables (hats, hair, face, ears, neck, back,
// hand) and backdrops. Browse by kind, then filter by category, rarity/tier and what you own; sort by
// price. Tapping an item tries it on in the fitting room (nothing is bought); try-ons combine across
// slots. Buying asks for a confirm that shows the balance afterwards, and does NOT put the item on:
// "Put it on" is a separate, explicit step. Owned items can be put on and taken off here or in Profile.
// Wearables that don't fit the person's avatar are hidden unless asked for (then shown disabled).
// Phones: a compact sticky fitting room above the catalogue. Desktop: preview column + grid.
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import Icon, { type IconName } from '../components/icons/Icon'
import type { Outfit } from '../components/illustrations/Accessories'
import { Mascot } from '../components/illustrations/Mascot'
import { Starburst } from '../components/illustrations/Stickers'
import Avatar from '../components/ui/Avatar'
import Badge, { type BadgeTone } from '../components/ui/Badge'
import Button, { ArrowCell } from '../components/ui/Button'
import { arrowLabel, arrowRowClasses } from '../components/ui/buttonStyles'
import { inputBase, Toggle } from '../components/ui/Fields'
import PageHeader from '../components/ui/PageHeader'
import PointsSummary from '../features/economy/components/PointsSummary'
import type { ShopSlot } from '../features/economy/types'
import Modal from '../features/gallery/components/Modal'
import { pointsBalance } from '../features/profile/model'
import {
  avatarShortName,
  browseItems,
  fitsAvatar,
  isOwned,
  itemGrade,
  itemState,
  OWNERSHIP_LABELS,
  pointsShort,
  RARITY_LABELS,
  RARITY_ORDER,
  SHOP_ITEMS,
  SHOP_SLOTS,
  shopItem,
  shopThemes,
  SLOT_LABELS,
  SORT_LABELS,
  themeLabel,
  TIER_LABELS,
  TIER_ORDER,
  WEAR_SLOTS,
  type OwnershipFilter,
  type ShopItemDef,
  type ShopSort,
} from '../features/rewards/shop'
import { DEFAULT_AVATAR } from '../lib/avatars'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

type Kind = ShopItemDef['kind']
type Equipped = Partial<Record<ShopSlot, string>>
type Inventory = { balance: number; owned: readonly string[]; equipped: Equipped }

const OWNERSHIP: OwnershipFilter[] = ['all', 'afford', 'owned', 'equipped', 'not-owned']
const SORTS: ShopSort[] = ['featured', 'price-asc', 'price-desc']

// ---- Data ---------------------------------------------------------------------------------------

/**
 * Balance, owned and equipped: from the economy state when the store has it, otherwise from the
 * profile's rewards mirror (device data, or while the economy is still loading).
 */
function useInventory(): Inventory {
  const { economy, profile } = useStore()
  const rewards = profile?.rewards
  return useMemo(() => {
    if (economy) return { balance: economy.balance, owned: economy.owned, equipped: economy.equipped }
    return { balance: pointsBalance(rewards), owned: rewards?.owned ?? [], equipped: (rewards?.equipped ?? {}) as Equipped }
  }, [economy, rewards])
}

const errorText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.')

// ---- Small pieces ------------------------------------------------------------------------------

function PriceTag({ price, className }: { price: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 border-2 border-ink bg-saffron py-0.5 pr-2 pl-1 font-display text-base leading-tight tabular-nums', className)}>
      <Icon name="coin" accent="sheet" className="size-5" />
      {price.toLocaleString()}
      <span className="sr-only"> points</span>
    </span>
  )
}

/** Rarity (wearables) / tier (backdrops): each step looks different, not just a different word. */
const GRADE_STYLE: { tone: BadgeTone; icon?: IconName }[] = [
  { tone: 'outline' },
  { tone: 'teal', icon: 'leaf' },
  { tone: 'sienna', icon: 'star' },
  { tone: 'ink', icon: 'gem' },
]

function GradeBadge({ item }: { item: ShopItemDef }) {
  const g = itemGrade(item)
  // Backdrop tiers are 3 steps: standard/detailed/premium map to steps 0/2/3.
  const step = item.kind === 'backdrop' ? [0, 2, 3][g.rank] : g.rank
  const style = GRADE_STYLE[step] ?? GRADE_STYLE[0]
  return (
    <Badge tone={style.tone} icon={style.icon}>
      <span className="sr-only">{item.kind === 'backdrop' ? 'Tier: ' : 'Rarity: '}</span>
      {g.label}
    </Badge>
  )
}

/** Equipped ✓ / Owned / Affordable / Locked "N more points" / Doesn't fit. */
function StateLine({ item, inv, avatar, compact = false }: { item: ShopItemDef; inv: Inventory; avatar: string; compact?: boolean }) {
  if (!fitsAvatar(item, avatar))
    return (
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Icon name="no" accent="sienna" className="size-4 shrink-0" />
        Doesn’t fit your {avatarShortName(avatar)}
      </p>
    )
  const state = itemState(item, inv)
  if (state === 'equipped')
    return (
      <Badge tone="ink" icon="check">
        Equipped
      </Badge>
    )
  if (state === 'owned') return <Badge tone="teal">Owned</Badge>
  // On tiles the Buy button already says it.
  if (state === 'affordable' && compact) return null
  if (state === 'affordable')
    return (
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Icon name="check" accent="teal" className="size-4 shrink-0" />
        You can afford it
      </p>
    )
  return (
    <p className="flex items-center gap-1.5 text-sm font-bold">
      <Icon name="lock" accent="none" className="size-4 shrink-0" />
      {pointsShort(item, inv.balance).toLocaleString()} more points
    </p>
  )
}

type Actions = {
  onBuy: (item: ShopItemDef) => void
  onEquip: (item: ShopItemDef, on: boolean) => void
  busyId: string | null
}

/** The one main action for an item: Buy (opens the confirm) · Put on · Take off · locked. */
function ItemAction({ item, inv, avatar, actions, compact = false }: { item: ShopItemDef; inv: Inventory; avatar: string; actions: Actions; compact?: boolean }) {
  if (!fitsAvatar(item, avatar)) return null
  const state = itemState(item, inv)
  const busy = actions.busyId === item.id
  const size = compact ? 'sm' : 'md'
  const tall = compact ? 'min-h-11' : undefined
  if (state === 'equipped')
    return (
      <Button fullWidth size={size} className={tall} variant="secondary" disabled={busy} onClick={() => actions.onEquip(item, false)} aria-label={`Take off ${item.name}`}>
        {busy ? 'Taking off…' : 'Take off'}
      </Button>
    )
  if (state === 'owned')
    return (
      <Button fullWidth size={size} className={tall} variant="dark" disabled={busy} onClick={() => actions.onEquip(item, true)} aria-label={`Put on ${item.name}`}>
        {busy ? 'Putting on…' : 'Put on'}
      </Button>
    )
  if (state === 'affordable')
    return (
      <Button fullWidth size={size} className={tall} icon="bag" onClick={() => actions.onBuy(item)} aria-label={`Buy ${item.name} for ${item.price} points`}>
        {compact ? 'Buy' : `Buy for ${item.price.toLocaleString()}`}
      </Button>
    )
  const short = pointsShort(item, inv.balance)
  return (
    <Button fullWidth size={size} className={tall} variant="secondary" disabled aria-label={`${item.name}: ${short} more points needed`}>
      <Icon name="lock" accent="none" className="size-4" />
      {compact ? `${short.toLocaleString()} more` : `${short.toLocaleString()} more points`}
    </Button>
  )
}

// ---- Catalogue tile ----------------------------------------------------------------------------

type TileProps = {
  item: ShopItemDef
  inv: Inventory
  avatar: string
  trying: boolean
  onTry: (item: ShopItemDef) => void
  actions: Actions
}

function ItemTile({ item, inv, avatar, trying, onTry, actions }: TileProps) {
  const fits = fitsAvatar(item, avatar)
  const owned = isOwned(item, inv.owned)
  const locked = fits && !owned && pointsShort(item, inv.balance) > 0
  // Each tile shows the item on YOUR avatar, with the rest of your outfit as it is.
  const outfit: Outfit = fits ? { ...inv.equipped, [item.slot]: item.id } : inv.equipped
  const nameId = `item-${item.id}`
  return (
    <article
      aria-labelledby={nameId}
      className={cn(
        'flex flex-col border-r-2 border-b-2 border-ink [contain-intrinsic-size:auto_20rem] [content-visibility:auto]',
        trying ? 'bg-saffron-soft' : 'sheet-grain',
      )}
    >
      <button
        type="button"
        onClick={() => onTry(item)}
        disabled={!fits}
        aria-pressed={fits ? trying : undefined}
        aria-label={fits ? `${trying ? 'Stop trying on' : 'Try on'} ${item.name}` : `${item.name} doesn’t fit your ${avatarShortName(avatar)}`}
        className={cn(
          'group relative grid place-items-center border-b-2 border-ink bg-teal-soft p-2.5 focus-visible:outline-3 focus-visible:-outline-offset-[6px] focus-visible:outline-ink sm:p-3',
          !fits && 'cursor-not-allowed',
        )}
      >
        <Avatar
          avatar={avatar}
          accessories={outfit}
          size="fill"
          className={cn('w-full max-w-36 transition-transform', fits && 'group-hover:-rotate-2', trying && '-rotate-2', !fits && 'opacity-45 grayscale')}
        />
        {!fits && <span className="hatch-soft absolute inset-0" aria-hidden />}
        {locked && (
          <span className="absolute top-1.5 left-1.5 grid size-8 place-items-center border-2 border-ink bg-sheet" aria-hidden>
            <Icon name="lock" accent="none" className="size-4" />
          </span>
        )}
        {owned && (
          <span className="absolute top-1.5 right-1.5 grid size-8 place-items-center border-2 border-ink bg-ink text-saffron" aria-hidden>
            <Icon name={inv.equipped[item.slot] === item.id ? 'check' : 'bag'} accent="none" strokeWidth={3} className="size-4" />
          </span>
        )}
        {trying && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 border-2 border-ink bg-ink px-2 py-0.5 text-[0.65rem] font-bold tracking-wider whitespace-nowrap text-sheet uppercase">
            Trying on
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        <p className="eyebrow text-[0.62rem] leading-tight">
          {item.kind === 'backdrop' ? (item.theme ? themeLabel(item.theme) : 'Backdrop') : SLOT_LABELS[item.slot]}
          {item.retired && ' · Retired'}
        </p>
        <h3 id={nameId} className="text-lg leading-tight break-words sm:text-xl">
          {item.name}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <GradeBadge item={item} />
          {!owned && <PriceTag price={item.price} />}
        </div>
        <p className="hidden text-sm sm:block">{item.description}</p>
        <div className="mt-auto space-y-2 pt-1">
          <StateLine item={item} inv={inv} avatar={avatar} compact />
          <ItemAction item={item} inv={inv} avatar={avatar} actions={actions} compact />
        </div>
      </div>
    </article>
  )
}

// ---- Fitting room ------------------------------------------------------------------------------

type FittingRoomProps = {
  inv: Inventory
  avatar: string
  name: string
  tryOn: Equipped
  focusId: string | null
  onRemoveTry: (slot: ShopSlot) => void
  onReset: () => void
  actions: Actions
  notice: string | null
}

function FittingRoom({ inv, avatar, name, tryOn, focusId, onRemoveTry, onReset, actions, notice }: FittingRoomProps) {
  const [expanded, setExpanded] = useState(false)
  const outfit: Outfit = { ...inv.equipped, ...tryOn }
  const tried = SHOP_SLOTS.map((s) => shopItem(tryOn[s])).filter((i): i is ShopItemDef => !!i)
  const worn = SHOP_SLOTS.map((s) => shopItem(inv.equipped[s])).filter((i): i is ShopItemDef => !!i)
  const focus = shopItem(focusId) ?? tried[tried.length - 1]
  const panelId = useId()
  const changed = tried.length > 0

  return (
    <section
      aria-labelledby="fitting-title"
      className={cn(
        'sheet-grain z-10 -mx-4 border-y-2 border-ink sm:mx-0 sm:border-x-2',
        // Phones/tablets: stuck under the top bar while collapsed. Desktop: the sticky left column.
        !expanded && 'sticky top-[calc(max(0.5rem,env(safe-area-inset-top))+3.25rem+2px)]',
        'lg:sticky lg:top-[calc(max(0.5rem,env(safe-area-inset-top))+4.75rem)] lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto xl:top-8 xl:max-h-[calc(100dvh-4rem)]',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-ink bg-ink px-3 py-1.5 text-sheet max-lg:sr-only">
        <h2 id="fitting-title" className="font-sans text-sm font-bold tracking-[0.12em] uppercase">
          Fitting room
        </h2>
        {changed && <span className="text-xs font-bold tracking-wider uppercase">Preview only</span>}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-2.5 sm:p-3 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-4 lg:p-4">
        <div className={cn('shrink-0 transition-[width]', expanded ? 'w-44 sm:w-52' : 'w-[4.5rem] sm:w-24', 'lg:w-full')}>
          <Avatar avatar={avatar} accessories={outfit} size="fill" className="w-full" name={changed ? `${name}, trying things on` : name} />
        </div>

        {/* Phones: a one-line summary + the focused item's action. */}
        <div className={cn('min-w-0 flex-1 lg:hidden', expanded && 'hidden')}>
          <p className="eyebrow text-[0.62rem]" aria-hidden>
            Fitting room{changed ? ' · preview' : ''}
          </p>
          {focus ? (
            <p className="truncate font-bold">
              {focus.name}
              {tried.length > 1 && <span className="font-semibold"> +{tried.length - 1}</span>}
            </p>
          ) : (
            <p className="text-sm font-semibold">Tap an item to try it on.</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            {focus && (
              <div className="min-w-0 flex-1">
                <ItemAction item={focus} inv={inv} avatar={avatar} actions={actions} compact />
              </div>
            )}
            {changed && (
              <Button size="sm" variant="secondary" icon="undo" className="min-h-11 shrink-0 px-2.5" onClick={onReset} aria-label="Reset to my outfit">
                <span className="max-[379px]:sr-only">Reset</span>
              </Button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="ml-auto grid size-11 shrink-0 place-items-center self-start border-2 border-ink sheet-grain hover:bg-saffron-soft lg:hidden"
        >
          <Icon name="chevron-down" accent="none" className={cn('size-5 transition-transform', expanded && 'rotate-180')} />
          <span className="sr-only">{expanded ? 'Show less of the fitting room' : 'Show more of the fitting room'}</span>
        </button>

        {/* Full details: always on desktop, on phones when expanded. */}
        <div id={panelId} className={cn('min-w-0 space-y-4 max-lg:basis-full', expanded ? 'max-lg:w-full' : 'max-lg:hidden')}>
          {focus && (
            <div>
              <p className="eyebrow">Trying on · {focus.kind === 'backdrop' ? 'Backdrop' : SLOT_LABELS[focus.slot]}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-2xl leading-tight">{focus.name}</h3>
                <GradeBadge item={focus} />
              </div>
              <p className="mt-1 text-sm">{focus.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!isOwned(focus, inv.owned) && <PriceTag price={focus.price} />}
                <StateLine item={focus} inv={inv} avatar={avatar} />
              </div>
              <div className="mt-3">
                <ItemAction item={focus} inv={inv} avatar={avatar} actions={actions} />
              </div>
            </div>
          )}

          {tried.length > 0 && (
            <div>
              <p className="eyebrow mb-1">Trying on ({tried.length})</p>
              <ul className="border-t-2 border-ink">
                {tried.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 border-b-2 border-ink py-1">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.65rem] font-bold tracking-wider uppercase">{i.kind === 'backdrop' ? 'Backdrop' : SLOT_LABELS[i.slot]}</span>
                      <span className="block truncate font-semibold">{i.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveTry(i.slot)}
                      className="grid size-11 shrink-0 place-items-center border-2 border-transparent hover:border-ink"
                      aria-label={`Stop trying on ${i.name}`}
                    >
                      <Icon name="close" accent="none" className="size-5" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" icon="undo" fullWidth className="mt-2" onClick={onReset}>
                Reset to my outfit
              </Button>
            </div>
          )}

          <div>
            <p className="eyebrow mb-1">You’re wearing</p>
            {worn.length === 0 ? (
              <p className="text-sm">Nothing yet. Buy something, then put it on.</p>
            ) : (
              <ul className="border-t-2 border-ink">
                {worn.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 border-b-2 border-ink py-1">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.65rem] font-bold tracking-wider uppercase">{i.kind === 'backdrop' ? 'Backdrop' : SLOT_LABELS[i.slot]}</span>
                      <span className="block truncate font-semibold">{i.name}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-11 shrink-0 px-2"
                      disabled={actions.busyId === i.id}
                      onClick={() => actions.onEquip(i, false)}
                      aria-label={`Take off ${i.name}`}
                    >
                      Take off
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <p role="status" aria-live="polite" className="border-t-2 border-ink px-3 py-1.5 text-sm font-semibold empty:hidden">
        {notice}
      </p>
    </section>
  )
}

// ---- Buy dialog --------------------------------------------------------------------------------

type BuyDialogProps = {
  item: ShopItemDef | null
  inv: Inventory
  avatar: string
  onClose: () => void
  purchase: (itemId: string) => Promise<unknown>
  equip: (item: ShopItemDef) => Promise<void>
}

function BuyDialog({ item, inv, avatar, onClose, purchase, equip }: BuyDialogProps) {
  const titleId = useId()
  const descId = useId()
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descId}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] max-w-none border-2 border-ink bg-transparent p-0 shadow-block"
    >
      {item && <BuyFlow key={item.id} item={item} inv={inv} avatar={avatar} titleId={titleId} descId={descId} onClose={onClose} purchase={purchase} equip={equip} />}
    </Modal>
  )
}

function BuyFlow({ item, inv, avatar, titleId, descId, onClose, purchase, equip }: Omit<BuyDialogProps, 'item'> & { item: ShopItemDef; titleId: string; descId: string }) {
  const [step, setStep] = useState<'confirm' | 'bought'>(() => (isOwned(item, inv.owned) ? 'bought' : 'confirm'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The balance as it was when the dialog opened (the live one changes once the purchase lands).
  const [startBalance] = useState(inv.balance)
  const after = startBalance - item.price
  const current = shopItem(inv.equipped[item.slot])
  const wearing = inv.equipped[item.slot] === item.id
  const preview: Outfit = { ...inv.equipped, [item.slot]: item.id }

  async function buy() {
    setBusy(true)
    setError(null)
    try {
      await purchase(item.id)
      setStep('bought')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function putOn() {
    setBusy(true)
    setError(null)
    try {
      await equip(item)
      onClose()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <div className="sheet-grain">
      <div className="flex items-center justify-between gap-2 border-b-2 border-ink bg-ink py-1 pr-1 pl-4 text-sheet">
        <p className="font-sans text-sm font-bold tracking-[0.12em] uppercase">{step === 'confirm' ? 'Buy this?' : 'It’s yours'}</p>
        <button type="button" onClick={onClose} className="grid size-11 place-items-center" aria-label="Close">
          <Icon name="close" accent="none" className="size-5" />
        </button>
      </div>
      <div className="flex gap-4 p-4">
        <Avatar avatar={avatar} accessories={preview} size="fill" className="w-24 shrink-0 sm:w-28" />
        <div className="min-w-0">
          <h2 id={titleId} className="text-2xl leading-tight break-words">
            {item.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <GradeBadge item={item} />
            <Badge tone="outline">{item.kind === 'backdrop' ? 'Backdrop' : SLOT_LABELS[item.slot]}</Badge>
          </div>
          <p className="mt-2 text-sm">{item.description}</p>
        </div>
      </div>

      {step === 'confirm' ? (
        <div className="space-y-4 px-4 pb-4">
          <dl id={descId} className="border-2 border-ink">
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-3 py-2">
              <dt className="font-semibold">Price</dt>
              <dd>
                <PriceTag price={item.price} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-3 py-2">
              <dt className="font-semibold">Your balance</dt>
              <dd className="font-display text-lg tabular-nums">{startBalance.toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 bg-saffron-soft px-3 py-2">
              <dt className="font-bold">Balance after</dt>
              <dd className="font-display text-lg tabular-nums">{after.toLocaleString()}</dd>
            </div>
          </dl>
          <p className="text-sm">Buying doesn’t put it on. You can wear it straight after, or any time later.</p>
          {error && (
            <p role="alert" className="border-2 border-sienna-deep bg-sienna-soft px-3 py-2 text-sm font-semibold">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button className="flex-1" icon="bag" disabled={busy || after < 0} onClick={buy}>
              {busy ? 'Buying…' : `Buy for ${item.price.toLocaleString()}`}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={onClose} autoFocus>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4 pb-4">
          <p id={descId} className="flex items-start gap-2 border-2 border-ink bg-teal-soft px-3 py-2 font-semibold" role="status">
            <Icon name="check" accent="none" strokeWidth={3} className="mt-0.5 size-5 shrink-0" />
            <span>
              {item.name} is in your wardrobe. {wearing ? 'You’re wearing it.' : 'It isn’t on yet.'}
            </span>
          </p>
          {!wearing && current && <p className="text-sm">Putting it on swaps out your {current.name}.</p>}
          {error && (
            <p role="alert" className="border-2 border-sienna-deep bg-sienna-soft px-3 py-2 text-sm font-semibold">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            {!wearing && (
              <Button className="flex-1" variant="dark" disabled={busy} onClick={putOn} autoFocus>
                {busy ? 'Putting on…' : 'Put it on'}
              </Button>
            )}
            <Button className="flex-1" variant="secondary" onClick={onClose} autoFocus={wearing}>
              {wearing ? 'Done' : 'Not now'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Filters -----------------------------------------------------------------------------------

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = useId()
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="eyebrow mb-1 block text-[0.65rem]">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputBase, 'min-h-11 px-2 text-sm font-semibold')}>
        {children}
      </select>
    </div>
  )
}

const chip = (on: boolean) =>
  cn(
    'min-h-11 border-2 border-ink px-3 font-sans text-xs font-bold tracking-[0.08em] uppercase transition-colors',
    on ? 'bg-ink text-sheet' : 'sheet-grain text-ink hover:bg-saffron-soft',
  )

// ---- Page --------------------------------------------------------------------------------------

export default function ShopPage() {
  const { account, purchase, setEquipped, recordVisit, economyError } = useStore()
  const inv = useInventory()
  const avatar = account?.avatar ?? DEFAULT_AVATAR
  const avatarName = avatarShortName(avatar)

  // Opening the shop counts for "visit the shop" quests (recorded once per day by the store).
  useEffect(() => {
    if (account) recordVisit('shop')
  }, [account, recordVisit])

  const [kind, setKind] = useState<Kind>('accessory')
  const [category, setCategory] = useState('all')
  const [grade, setGrade] = useState('all')
  const [ownership, setOwnership] = useState<OwnershipFilter>('all')
  const [sort, setSort] = useState<ShopSort>('featured')
  const [showUnfit, setShowUnfit] = useState(false)

  const [tryOn, setTryOn] = useState<Equipped>({})
  const [focusId, setFocusId] = useState<string | null>(null)
  const [buying, setBuying] = useState<ShopItemDef | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const items = useMemo(
    () => browseItems({ kind, category, grade, ownership, sort, avatar, showUnfit }, inv),
    [kind, category, grade, ownership, sort, avatar, showUnfit, inv],
  )
  const counts = useMemo(() => {
    const visible = (k: Kind) => SHOP_ITEMS.filter((i) => i.kind === k && (!i.retired || inv.owned.includes(i.id)) && fitsAvatar(i, avatar)).length
    return { accessory: visible('accessory'), backdrop: visible('backdrop') }
  }, [inv.owned, avatar])
  const hiddenUnfit = useMemo(
    () => (kind === 'accessory' && !showUnfit ? browseItems({ kind, category, grade, ownership, sort, avatar, showUnfit: true }, inv).length - items.length : 0),
    [kind, category, grade, ownership, sort, avatar, showUnfit, inv, items.length],
  )

  const categories = kind === 'accessory' ? WEAR_SLOTS.filter((s) => SHOP_ITEMS.some((i) => i.kind === 'accessory' && i.slot === s)) : shopThemes('backdrop')
  const filtered = category !== 'all' || grade !== 'all' || ownership !== 'all' || sort !== 'featured'

  // Sections: by slot (wearables) or theme (backdrops) in the default view; one grid otherwise.
  const groups = useMemo(() => {
    if (sort !== 'featured' || category !== 'all') return [{ key: 'all', title: null as string | null, items }]
    const out: { key: string; title: string | null; items: ShopItemDef[] }[] = []
    for (const i of items) {
      const unfit = !fitsAvatar(i, avatar)
      const key = unfit ? 'unfit' : kind === 'accessory' ? i.slot : (i.theme ?? 'other')
      const title = unfit ? `Doesn’t fit your ${avatarName}` : kind === 'accessory' ? SLOT_LABELS[i.slot] : i.theme ? themeLabel(i.theme) : 'More backdrops'
      let g = out.find((x) => x.key === key)
      if (!g) out.push((g = { key, title, items: [] }))
      g.items.push(i)
    }
    return out
  }, [items, sort, category, kind, avatar, avatarName])

  function switchKind(k: Kind) {
    setKind(k)
    setCategory('all')
    setGrade('all')
  }
  function clearFilters() {
    setCategory('all')
    setGrade('all')
    setOwnership('all')
    setSort('featured')
  }

  function toggleTry(item: ShopItemDef) {
    if (!fitsAvatar(item, avatar)) return
    if (tryOn[item.slot] === item.id) {
      const next = { ...tryOn }
      delete next[item.slot]
      setTryOn(next)
      setFocusId(null)
    } else {
      setTryOn({ ...tryOn, [item.slot]: item.id })
      setFocusId(item.id)
    }
  }
  function removeTry(slot: ShopSlot) {
    const next = { ...tryOn }
    if (shopItem(next[slot])?.id === focusId) setFocusId(null)
    delete next[slot]
    setTryOn(next)
  }
  function resetTry() {
    setTryOn({})
    setFocusId(null)
  }

  async function equip(item: ShopItemDef, on: boolean) {
    setBusyId(item.id)
    setNotice(null)
    try {
      await setEquipped(item.id, on)
      // Once it's really on (or off), the try-on for that slot is no longer a preview.
      if (tryOn[item.slot]) removeTry(item.slot)
      setNotice(on ? `Now wearing the ${item.name}.` : `Took off the ${item.name}.`)
    } catch (e) {
      setNotice(errorText(e))
    } finally {
      setBusyId(null)
    }
  }

  const actions: Actions = {
    onBuy: (item) => {
      setNotice(null)
      setBuying(item)
    },
    onEquip: (item, on) => void equip(item, on),
    busyId,
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Your avatar’s wardrobe"
        title="Shop"
        description="Try anything on for free, buy with quest points, then put it on."
        aside={
          <div className="relative hidden place-items-center sm:grid">
            <Starburst tone="saffron" className="absolute size-36" />
            <Mascot pose="goodies" className="relative h-28" />
          </div>
        }
      />

      <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
        <div data-testid="shop-balance" className="min-w-0 flex-1 sm:flex-none">
          <PointsSummary compact className="h-full" />
        </div>
        <Link to="/quests#points-title" className={cn(arrowRowClasses, 'flex-1 sm:flex-none')}>
          <span className={arrowLabel}>
            <span className="sm:hidden">History</span>
            <span className="max-sm:hidden">Earn more · points history</span>
          </span>
          <ArrowCell />
        </Link>
      </div>
      {economyError && (
        <p role="alert" className="border-2 border-sienna-deep bg-sienna-soft px-3 py-2 text-sm font-semibold">
          {economyError}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <FittingRoom
          inv={inv}
          avatar={avatar}
          name={account?.name ?? 'You'}
          tryOn={tryOn}
          focusId={focusId}
          onRemoveTry={removeTry}
          onReset={resetTry}
          actions={actions}
          notice={notice}
        />

        <section aria-labelledby="catalogue-title" className="min-w-0 space-y-4">
          <h2 id="catalogue-title" className="sr-only">
            Catalogue
          </h2>

          {/* Kind: wearables or backdrops. */}
          <div role="group" aria-label="What to browse" className="grid grid-cols-2 border-2 border-ink">
            {(['accessory', 'backdrop'] as const).map((k, n) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => switchKind(k)}
                className={cn(
                  'flex min-h-12 items-center justify-center gap-2 px-2 font-sans text-sm font-bold tracking-[0.08em] uppercase transition-colors',
                  n === 1 && 'border-l-2 border-ink',
                  kind === k ? 'bg-ink text-sheet' : 'sheet-grain text-ink hover:bg-saffron-soft',
                )}
              >
                <Icon name={k === 'accessory' ? 'smile' : 'frame'} accent={kind === k ? 'saffron' : 'teal'} className="size-5 max-[359px]:hidden" />
                {k === 'accessory' ? 'Accessories' : 'Backdrops'}
                <span className="font-display text-xs tabular-nums">{counts[k]}</span>
              </button>
            ))}
          </div>

          {/* Phones: one swipeable row of chips instead of two wrapped rows. */}
          <div role="group" aria-label="Show" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
            {OWNERSHIP.map((o) => (
              <button key={o} type="button" aria-pressed={ownership === o} onClick={() => setOwnership(o)} className={cn(chip(ownership === o), 'shrink-0 whitespace-nowrap')}>
                {OWNERSHIP_LABELS[o]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <SelectField label={kind === 'accessory' ? 'Category' : 'Theme'} value={category} onChange={setCategory}>
              <option value="all">{kind === 'accessory' ? 'All categories' : 'All themes'}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {kind === 'accessory' ? SLOT_LABELS[c as ShopSlot] : themeLabel(c)}
                </option>
              ))}
            </SelectField>
            <SelectField label={kind === 'accessory' ? 'Rarity' : 'Tier'} value={grade} onChange={setGrade}>
              <option value="all">{kind === 'accessory' ? 'Any rarity' : 'Any tier'}</option>
              {kind === 'accessory'
                ? RARITY_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {RARITY_LABELS[r]}
                    </option>
                  ))
                : TIER_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABELS[t]}
                    </option>
                  ))}
            </SelectField>
            <div className="col-span-2 sm:col-span-1">
              <SelectField label="Sort" value={sort} onChange={(v) => setSort(v as ShopSort)}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {kind === 'accessory' && (
            <Toggle
              label={`Show items that don’t fit your ${avatarName}`}
              description="Some pieces are only made for certain avatars. They show greyed out."
              checked={showUnfit}
              onChange={setShowUnfit}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink pt-2">
            <p className="text-sm font-semibold" aria-live="polite">
              {items.length} {items.length === 1 ? 'item' : 'items'}
              {hiddenUnfit > 0 && ` · ${hiddenUnfit} hidden (don’t fit)`}
            </p>
            {filtered && (
              <Button size="sm" variant="ghost" className="min-h-11 px-1" icon="undo" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="sheet-grain border-2 border-dashed border-ink p-6 text-center">
              <p className="font-bold">Nothing here with these filters.</p>
              <p className="mt-1 text-sm">
                {ownership === 'afford' ? 'Earn more points from quests, or try another filter.' : ownership === 'owned' || ownership === 'equipped' ? 'Buy something first, then it shows here.' : 'Try another filter.'}
              </p>
              {filtered && (
                <Button size="sm" variant="secondary" className="mt-3 min-h-11" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="space-y-2">
                {g.title && (
                  <h3 className="flex items-baseline gap-2 font-sans text-sm font-bold tracking-[0.12em] uppercase">
                    {g.title}
                    <span className="text-xs font-semibold tracking-normal normal-case">({g.items.length})</span>
                  </h3>
                )}
                <div className="grid grid-cols-2 border-t-2 border-l-2 border-ink sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {g.items.map((item) => (
                    <ItemTile key={item.id} item={item} inv={inv} avatar={avatar} trying={tryOn[item.slot] === item.id} onTry={toggleTry} actions={actions} />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <BuyDialog
        item={buying}
        inv={inv}
        avatar={avatar}
        onClose={() => setBuying(null)}
        purchase={purchase}
        equip={async (item) => {
          await setEquipped(item.id, true)
          if (tryOn[item.slot]) removeTry(item.slot)
          setNotice(`Now wearing the ${item.name}.`)
        }}
      />
    </div>
  )
}
