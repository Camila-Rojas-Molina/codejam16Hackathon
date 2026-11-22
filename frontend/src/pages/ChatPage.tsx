// CHAT: your conversations, discovering compatible people, and individual threads.
//   /chat               Messages (default) or ?tab=discover
//   /chat/:personId     one conversation
// Live discovery and message delivery aren't built yet (see "People & messages" in api.ts).
//
// Phones and tablets: one view at a time (list, discover, or a thread). Laptops and up: two panes,
// conversations on the left and the open thread (or Discover) on the right.
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { MascotSays } from '../components/illustrations/Mascot'
import Icon from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { inputBase } from '../components/ui/Fields'
import PageHeader from '../components/ui/PageHeader'
import PersonCard from '../features/chat/components/PersonCard'
import { MESSAGE_MAX_LENGTH, type Conversation, type Person } from '../features/chat/types'
import { canMessage, useConversations } from '../features/chat/useConversations'
import { modeMeta, roleLabel } from '../features/onboarding/options'
import { toMatchProfile, type Compatibility } from '../features/profile/matching'
import { getPeopleToDiscover } from '../lib/api'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const when = (at: number) => (new Date(at).toDateString() === new Date().toDateString() ? timeFmt.format(at) : dayFmt.format(at))

// Two panes from Tailwind's lg breakpoint (64rem).
const WIDE = '(min-width: 64rem)'
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia?.(WIDE)
  mq?.addEventListener('change', cb)
  return () => mq?.removeEventListener('change', cb)
}
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia?.(WIDE).matches ?? false, () => false)

function Tabs({ tab }: { tab: 'messages' | 'discover' }) {
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  const cls = (on: boolean) =>
    cn(
      'flex min-h-12 flex-1 items-center justify-center gap-2 text-sm font-bold tracking-[0.1em] uppercase transition-colors',
      on ? 'bg-saffron' : 'hover:bg-saffron-soft',
    )
  return (
    <nav aria-label="Chat sections" className="sheet-grain grid grid-cols-2 border-2 border-ink">
      <Link to="/chat" aria-current={tab === 'messages' ? 'page' : undefined} className={cls(tab === 'messages')}>
        Messages
        <Icon name="chats" accent={tab === 'messages' ? 'sheet' : 'saffron'} className="size-5" />
        {unread > 0 && <span className="border-2 border-ink bg-ink px-1.5 text-xs text-sheet">{unread}</span>}
      </Link>
      <Link to="/chat?tab=discover" aria-current={tab === 'discover' ? 'page' : undefined} className={cn(cls(tab === 'discover'), 'border-l-2 border-ink')}>
        <Icon name="search" accent={tab === 'discover' ? 'sheet' : 'saffron'} className="size-5" />
        Discover
      </Link>
    </nav>
  )
}

function ConversationList({ conversations, current }: { conversations: Conversation[]; current?: string }) {
  if (conversations.length === 0) {
    return (
      <div className="space-y-4">
        <MascotSays pose="ponder">
          <p>No chats yet! Team up with someone on a hunt and you’ll be able to message them here.</p>
        </MascotSays>
        <div className="flex flex-wrap gap-2">
          <Link to="/hunts" className={buttonClasses()}>
            Find a teammate
          </Link>
          <Link to="/chat?tab=discover" className={buttonClasses({ variant: 'secondary' })}>
            Discover people
          </Link>
        </div>
      </div>
    )
  }
  return (
    <ul className="border-t-2 border-l-2 border-ink">
      {conversations.map(({ person, last, unread }) => (
        <li key={person.id}>
          <Link
            to={`/chat/${encodeURIComponent(person.id)}`}
            aria-current={current === person.id ? 'page' : undefined}
            className={cn(
              'relative flex min-h-[4.5rem] items-center gap-3 border-r-2 border-b-2 border-ink p-3 transition-colors',
              current === person.id ? 'bg-teal-soft shadow-[inset_6px_0_0_var(--color-ink)]' : unread > 0 ? 'bg-saffron' : 'sheet-grain hover:bg-saffron-soft',
            )}
          >
            <Avatar avatar={person.avatar} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="truncate text-lg font-bold">{person.name}</span>
                <Badge tone={person.mode === 'local' ? 'teal' : 'saffron'} icon={modeMeta(person.mode).icon}>
                  {roleLabel(person.mode)}
                </Badge>
              </p>
              <p className="truncate text-sm">
                {last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : 'Teammates! Say hi.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {last && <span className="text-xs font-semibold">{when(last.at)}</span>}
              {unread > 0 && (
                <span className="border-2 border-ink bg-ink px-2 text-xs font-bold text-sheet">
                  {unread}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Discover() {
  const { profile, setLiked } = useStore()
  const likes = profile?.likes ?? []
  const conversations = useConversations()
  const [people, setPeople] = useState<{ person: Person; match: Compatibility }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const me = toMatchProfile(profile)
  const load = useEffectEvent(() => getPeopleToDiscover(me))
  const mode = profile?.activeMode ?? null

  useEffect(() => {
    let cancelled = false
    load()
      .then((p) => !cancelled && setPeople(p))
      .catch(() => !cancelled && setError('Couldn’t load people right now.'))
    return () => {
      cancelled = true
    }
  }, [mode])

  async function toggle(personId: string, liked: boolean) {
    setBusy(personId)
    try {
      await setLiked(personId, liked)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card tone="teal-soft" className="flex items-end gap-4">
        <div className="min-w-0 flex-1">
        <p>
          {mode === 'tourist'
            ? 'Locals who share your vibe, ranked by what you have in common.'
            : mode === 'local'
              ? 'Visitors who’d love your city, ranked by what you have in common.'
              : 'Pick Tourist or Local mode (top of the screen) to see people to explore with.'}
        </p>
        <p className="mt-2 text-sm">
          <strong>Preview:</strong> these are sample travellers from MIGO’s demo pool. Real people appear here once live
          discovery is switched on.
        </p>
        </div>
        <Mascot pose="curious" className="hidden h-24 shrink-0 sm:block" />
      </Card>
      {error && <p role="alert">{error}</p>}
      {!people && !error && <p aria-live="polite">Finding people…</p>}
      {people?.map(({ person, match }) => (
        <PersonCard
          key={person.id}
          person={person}
          match={match}
          liked={likes.includes(person.id)}
          busy={busy === person.id}
          onToggleLike={() => toggle(person.id, !likes.includes(person.id))}
          canMessage={canMessage(conversations, person.id)}
        />
      ))}
    </div>
  )
}

function Thread({ personId, embedded = false }: { personId: string; embedded?: boolean }) {
  const { sendMessage, markRead } = useStore()
  const conversation = useConversations().find((c) => c.person.id === personId)
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLLIElement>(null)
  const unread = conversation?.unread ?? 0
  const count = conversation?.messages.length ?? 0

  useEffect(() => {
    if (unread > 0) void markRead(personId)
  }, [unread, personId, markRead])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [count])

  if (!conversation) {
    return (
      <div className="space-y-4">
        {!embedded && (
          <Button variant="ghost" icon="arrow-left" className="px-0" onClick={() => navigate('/chat')}>
            Messages
          </Button>
        )}
        <Card>
          <h1 className="text-2xl">Can’t message them yet</h1>
          <p className="mt-2">You can message people once you’re matched as teammates, or you both show interest.</p>
        </Card>
      </div>
    )
  }

  const { person, messages } = conversation

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await sendMessage(person, text)
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send that.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center gap-3">
        {!embedded && (
          <Link to="/chat" aria-label="Back to messages" className="grid size-12 shrink-0 place-items-center border-2 border-ink bg-sheet transition-colors hover:bg-saffron">
            <Icon name="arrow-left" accent="none" strokeWidth={2.4} className="size-5" />
          </Link>
        )}
        <Avatar avatar={person.avatar} size="md" />
        <div className="min-w-0">
          <h1 className="truncate text-3xl leading-none">{person.name}</h1>
          <Badge tone={person.mode === 'local' ? 'teal' : 'saffron'} icon={modeMeta(person.mode).icon} className="mt-1">
            {roleLabel(person.mode)}
          </Badge>
        </div>
      </header>

      <p className="flex items-start gap-2 border-2 border-dashed border-ink px-3 py-2 text-sm">
        <Icon name="info" accent="sheet" className="size-5" />
        <span>
        {person.demo
          ? `${person.name} is a sample traveller from the demo pool, so they won’t reply. `
          : ''}
        Messages are saved on this device until MIGO messaging goes live.
        </span>
      </p>

      <ol aria-label={`Conversation with ${person.name}`} aria-live="polite" className="sheet-grain flex min-h-72 flex-1 flex-col gap-3 border-2 border-ink p-4">
        {messages.length === 0 && (
          <li className="m-auto flex flex-col items-center gap-2 text-center font-serif text-lg">
            <Mascot pose="hello" className="h-24" />
            You’re teammates! Say hi to {person.name}.
          </li>
        )}
        {messages.map((m) => (
          <li key={m.id} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] rounded-[1.1rem] border-2 border-ink px-3.5 py-2',
                m.from === 'me' ? 'rounded-br-none bg-teal-soft' : 'rounded-bl-none bg-saffron',
              )}
            >
              <p className="sr-only">{m.from === 'me' ? 'You' : person.name}:</p>
              <p className="break-words whitespace-pre-wrap">{m.text}</p>
              <p className="mt-0.5 text-right text-xs font-semibold">{when(m.at)}</p>
            </div>
          </li>
        ))}
        <li ref={endRef} aria-hidden />
      </ol>

      <form onSubmit={send} className="sticky bottom-20 flex items-stretch md:bottom-4">
        <label htmlFor="composer" className="sr-only">
          Message {person.name}
        </label>
        <textarea
          id="composer"
          rows={1}
          value={text}
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder={`Message ${person.name}…`}
          className={cn(inputBase, 'min-h-14 flex-1 resize-none px-4 py-3')}
        />
        <Button type="submit" size="md" disabled={!text.trim() || busy} className="-ml-[2px] min-h-14">
          <Icon name="plane" accent="sheet" className="size-5" />
          Send
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

/** Wide screens, nothing open yet: a prompt in the thread pane. */
function PickAChat({ hasChats }: { hasChats: boolean }) {
  return (
    <div className="sheet-grain hatch-soft grid flex-1 place-items-center border-2 border-ink p-8">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Mascot pose={hasChats ? 'hello' : 'ponder'} className="h-32" />
        <p className="font-serif text-xl leading-snug">
          {hasChats ? 'Pick a conversation to carry on where you left off.' : 'Your conversations will open here.'}
        </p>
        <Link to="/chat?tab=discover" className={buttonClasses({ variant: 'secondary' })}>
          <Icon name="search" className="size-5" />
          Discover people
        </Link>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { personId } = useParams()
  const [params] = useSearchParams()
  const conversations = useConversations()
  const wide = useWide()
  const tab = params.get('tab') === 'discover' ? 'discover' : 'messages'
  const header = <PageHeader eyebrow="People" title="Chat" description="Find your kind of people, then plan something together." />

  if (!wide) {
    if (personId) return <Thread personId={personId} />
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {header}
        <Tabs tab={tab} />
        {tab === 'messages' ? <ConversationList conversations={conversations} /> : <Discover />}
      </div>
    )
  }

  // Two panes: the list stays put while the right-hand pane shows a thread, Discover, or a prompt.
  const paneTab = personId ? 'messages' : tab
  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] gap-8 2xl:gap-10">
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        <Tabs tab={paneTab} />
        <ConversationList conversations={conversations} current={personId} />
      </div>
      <div className="flex min-w-0 flex-col">
        {personId ? (
          <Thread key={personId} personId={personId} embedded />
        ) : tab === 'discover' ? (
          <Discover />
        ) : (
          <PickAChat hasChats={conversations.length > 0} />
        )}
      </div>
    </div>
  )
}
