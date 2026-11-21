// CHAT: your conversations, discovering compatible people, and individual threads.
//   /chat               Messages (default) or ?tab=discover
//   /chat/:personId     one conversation
// Live discovery and message delivery aren't built yet (see "People & messages" in api.ts).
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { MascotSays } from '../components/illustrations/Mascot'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import PersonCard from '../features/chat/components/PersonCard'
import { MESSAGE_MAX_LENGTH, type Conversation, type Person } from '../features/chat/types'
import { canMessage, useConversations } from '../features/chat/useConversations'
import { roleLabel } from '../features/onboarding/options'
import { toMatchProfile, type Compatibility } from '../features/profile/matching'
import { getPeopleToDiscover } from '../lib/api'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const when = (at: number) => (new Date(at).toDateString() === new Date().toDateString() ? timeFmt.format(at) : dayFmt.format(at))

function Tabs({ tab }: { tab: 'messages' | 'discover' }) {
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  const cls = (on: boolean) =>
    cn(
      'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-[3px] font-type text-sm tracking-wider uppercase transition-transform active:scale-95',
      on ? 'border-navy bg-sun text-ink' : 'border-transparent text-navy hover:bg-bubble-light',
    )
  return (
    <nav aria-label="Chat sections" className="flex gap-1.5 rounded-full border-[3px] border-navy bg-paper p-1.5">
      <Link to="/chat" aria-current={tab === 'messages' ? 'page' : undefined} className={cls(tab === 'messages')}>
        Messages
        {unread > 0 && <span className="rounded-full border-2 border-navy bg-red px-1.5 text-xs text-white">{unread}</span>}
      </Link>
      <Link to="/chat?tab=discover" aria-current={tab === 'discover' ? 'page' : undefined} className={cls(tab === 'discover')}>
        Discover
      </Link>
    </nav>
  )
}

function ConversationList({ conversations }: { conversations: Conversation[] }) {
  if (conversations.length === 0) {
    return (
      <div className="space-y-4">
        <MascotSays mood="think">
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
    <ul className="space-y-3">
      {conversations.map(({ person, last, unread }) => (
        <li key={person.id}>
          <Link
            to={`/chat/${encodeURIComponent(person.id)}`}
            className={cn(
              'flex items-center gap-3 rounded-[1.4rem_1.2rem_1.5rem_1.1rem] border-[3px] border-navy p-3 transition-transform active:scale-[0.98]',
              unread > 0 ? 'bg-sun text-ink' : 'bg-paper hover:bg-bubble-light',
            )}
          >
            <Avatar avatar={person.avatar} size="md" className="bg-bubble-light" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="truncate text-lg font-semibold">{person.name}</span>
                <span className="text-xs">{roleLabel(person.mode)}</span>
              </p>
              <p className="truncate text-sm">
                {last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : 'Teammates! Say hi 👋'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {last && <span className="text-xs">{when(last.at)}</span>}
              {unread > 0 && (
                <span className="rounded-full border-2 border-navy bg-red px-2 font-type text-xs text-white">
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
      <Card tone="bubble-light">
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

function Thread({ personId }: { personId: string }) {
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
        <Button variant="ghost" className="px-0" onClick={() => navigate('/chat')}>
          ← Messages
        </Button>
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
        <Link to="/chat" aria-label="Back to messages" className="grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-navy bg-paper font-type text-xl">
          <span aria-hidden>←</span>
        </Link>
        <Avatar avatar={person.avatar} size="md" className="bg-bubble-light" />
        <div className="min-w-0">
          <h1 className="truncate text-3xl leading-none text-navy">{person.name}</h1>
          <Badge tone="navy" className="mt-1">
            {roleLabel(person.mode)}
          </Badge>
        </div>
      </header>

      <p className="rounded-2xl border-2 border-dashed border-navy px-3 py-2 text-sm">
        {person.demo
          ? `${person.name} is a sample traveller from the demo pool, so they won’t reply. `
          : ''}
        Messages are saved on this device until MIGO messaging goes live.
      </p>

      <ol aria-label={`Conversation with ${person.name}`} aria-live="polite" className="flex flex-1 flex-col gap-2 rounded-[1.5rem] border-[3px] border-navy bg-paper p-4">
        {messages.length === 0 && <li className="m-auto text-center">You’re teammates! Say hi to {person.name} 👋</li>}
        {messages.map((m) => (
          <li key={m.id} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] rounded-[1.2rem] border-[3px] border-navy px-3 py-2',
                m.from === 'me' ? 'rounded-br-md bg-bubble text-navy' : 'rounded-bl-md bg-sun text-ink',
              )}
            >
              <p className="sr-only">{m.from === 'me' ? 'You' : person.name}:</p>
              <p className="break-words whitespace-pre-wrap">{m.text}</p>
              <p className="mt-0.5 text-right text-xs">{when(m.at)}</p>
            </div>
          </li>
        ))}
        <li ref={endRef} aria-hidden />
      </ol>

      <form onSubmit={send} className="sticky bottom-24 flex items-end gap-2 md:bottom-4">
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
          className="min-h-14 flex-1 resize-none rounded-[1.4rem] border-[3px] border-navy bg-paper px-4 py-3 text-navy placeholder:text-navy/60"
        />
        <Button type="submit" size="md" disabled={!text.trim() || busy} className="min-h-14">
          Send
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export default function ChatPage() {
  const { personId } = useParams()
  const [params] = useSearchParams()
  const conversations = useConversations()
  if (personId) return <Thread personId={personId} />
  const tab = params.get('tab') === 'discover' ? 'discover' : 'messages'
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-4xl text-navy sm:text-5xl">Chat</h1>
        <p className="mt-1">Find your kind of people, then plan something together.</p>
      </header>
      <Tabs tab={tab} />
      {tab === 'messages' ? <ConversationList conversations={conversations} /> : <Discover />}
    </div>
  )
}
