// CHAT: your conversations, connection requests, discovering locals, and individual threads.
//   /chat               Messages (default) or ?tab=discover
//   /chat/:personId     one conversation
// How people meet: a tourist taps Connect on a local in Discover; the local gets the request at the
// top of Messages and picks Connect or Not now; once connected, both see each other in Messages and
// no longer in Discover. Rules live in api.ts (People, connections & messages) and 013_connections.sql.
// Message delivery isn't built yet: messages are kept on this device.
//
// Phones and tablets: one view at a time (list, discover, or a thread). Laptops and up: two panes,
// conversations on the left and the open thread (or Discover) on the right.
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import Icon from '../components/icons/Icon'
import { Mascot, MascotSays } from '../components/illustrations/Mascot'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { inputBase } from '../components/ui/Fields'
import PageHeader from '../components/ui/PageHeader'
import PersonCard, { PersonDetails } from '../features/chat/components/PersonCard'
import { MESSAGE_MAX_LENGTH, type Connection, type Conversation, type Person } from '../features/chat/types'
import { useConnectionNews, useConversations } from '../features/chat/useConversations'
import { modeMeta, roleLabel } from '../features/onboarding/options'
import { toMatchProfile } from '../features/profile/matching'
import { discoverLocals, isSamplePerson } from '../lib/api'
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
  const unread = useConversations().reduce((n, c) => n + c.unread, 0) + useConnectionNews().badge
  const cls = (on: boolean) =>
    cn(
      'flex min-h-12 flex-1 items-center justify-center gap-1.5 px-2 text-xs font-bold tracking-[0.08em] uppercase transition-colors sm:gap-2 sm:text-sm sm:tracking-[0.1em]',
      on ? 'bg-saffron' : 'hover:bg-saffron-soft',
    )
  return (
    <nav aria-label="Chat sections" className="sheet-grain grid grid-cols-2 border-2 border-ink">
      <Link to="/chat" aria-current={tab === 'messages' ? 'page' : undefined} className={cls(tab === 'messages')}>
        Messages
        <Icon name="chats" accent={tab === 'messages' ? 'sheet' : 'saffron'} className="size-5" />
        {unread > 0 && (
          <span className="border-2 border-ink bg-ink px-1.5 text-xs text-sheet">
            {unread}
            <span className="sr-only"> new</span>
          </span>
        )}
      </Link>
      <Link to="/chat?tab=discover" aria-current={tab === 'discover' ? 'page' : undefined} className={cn(cls(tab === 'discover'), 'border-l-2 border-ink')}>
        <Icon name="search" accent={tab === 'discover' ? 'sheet' : 'saffron'} className="size-5" />
        Discover
      </Link>
    </nav>
  )
}

function ConversationList({ conversations, current }: { conversations: Conversation[]; current?: string }) {
  const { profile } = useStore()
  if (conversations.length === 0) {
    const local = profile?.activeMode === 'local'
    return (
      <div className="space-y-4">
        <MascotSays pose="ponder">
          <p>
            {local
              ? 'No chats yet! When a tourist asks to connect, you’ll see it here. Say yes and you can start chatting.'
              : 'No chats yet! Find a local in Discover and tap Connect. Once they say yes, you can chat here.'}
          </p>
        </MascotSays>
        <div className="flex flex-wrap gap-2">
          {!local && (
            <Link to="/chat?tab=discover" className={buttonClasses()}>
              <Icon name="search" accent="sheet" className="size-5" />
              Discover locals
            </Link>
          )}
          <Link to="/hunts" className={buttonClasses({ variant: 'secondary' })}>
            Find a teammate
          </Link>
        </div>
      </div>
    )
  }
  return (
    <ul className="border-t-2 border-l-2 border-ink shadow-block-sm">
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
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="max-w-full truncate text-lg font-bold">{person.name}</span>
                <Badge tone={person.mode === 'local' ? 'teal' : 'saffron'} icon={modeMeta(person.mode).icon}>
                  {roleLabel(person.mode)}
                </Badge>
              </p>
              <p className="truncate text-sm">
                {last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : person.demo ? 'Sample profile · say hi!' : 'You’re connected! Say hi.'}
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
  const { account, profile, connections, requestConnection, cancelConnection } = useStore()
  const conversations = useConversations()
  const [people, setPeople] = useState<Awaited<ReturnType<typeof discoverLocals>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const me = toMatchProfile(profile)
  // People already in your Messages never show up here.
  const inMessages = new Set(conversations.map((c) => c.person.id))
  const load = useEffectEvent(() => (account ? discoverLocals(account.id, me, inMessages) : Promise.resolve([])))
  const mode = profile?.activeMode ?? null
  // Reload when the mode changes, and whenever connections change (a yes moves someone to Messages).
  const reloadKey = `${mode}|${(connections ?? []).map((c) => `${c.id}:${c.status}`).join(',')}|${[...inMessages].join(',')}`

  useEffect(() => {
    let cancelled = false
    load()
      .then((p) => {
        if (cancelled) return
        setPeople(p)
        setError(null)
      })
      .catch(() => !cancelled && setError('Couldn’t load people right now.'))
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  async function connect(person: Person) {
    setBusy(person.id)
    setNotice(null)
    try {
      const c = await requestConnection(person)
      if (c.status === 'accepted') setNotice(`You and ${person.name} are connected! Find them in Messages.`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Couldn’t send that request.')
    } finally {
      setBusy(null)
    }
  }

  async function withdraw(person: Person) {
    const pending = connections?.find((c) => c.person.id === person.id && c.status === 'pending' && c.direction === 'outgoing')
    if (!pending) return
    setBusy(person.id)
    try {
      await cancelConnection(pending.id)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Couldn’t withdraw that request.')
    } finally {
      setBusy(null)
    }
  }

  if (mode !== 'tourist') {
    return (
      <Card tone="teal-soft" className="flex items-end gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <p>
            {mode === 'local'
              ? 'In Local mode, tourists find you. When someone asks to connect, the request shows up at the top of Messages, and you choose Connect or Not now.'
              : 'Pick Tourist or Local mode (top of the screen) to meet people.'}
          </p>
          {mode === 'local' && <p className="text-sm">Exploring somewhere new yourself? Switch to Tourist mode to browse locals.</p>}
          <Link to="/chat" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            <Icon name="chats" className="size-5" />
            Go to Messages
          </Link>
        </div>
        <Mascot pose="curious" className="hidden h-24 shrink-0 sm:block" />
      </Card>
    )
  }

  const hasSamples = people?.some((p) => p.person.demo)
  return (
    <div className="space-y-6">
      <Card tone="teal-soft" className="flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <p>Locals who share your vibe, ranked by what you have in common. Tap Connect and they’ll get your request.</p>
          {hasSamples && (
            <p className="mt-2 text-sm">
              <strong>Sample</strong> locals are from MIGO’s demo pool: they say yes straight away so you can try it out, but they won’t reply.
            </p>
          )}
        </div>
        <Mascot pose="curious" className="hidden h-24 shrink-0 sm:block" />
      </Card>
      {notice && (
        <p role="status" className="flex items-start gap-2 border-2 border-ink bg-saffron-soft px-4 py-2 font-semibold">
          <Icon name="info" accent="sheet" className="size-5" />
          {notice}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!people && !error && <p aria-live="polite">Finding locals…</p>}
      {people?.length === 0 && (
        <MascotSays pose="ponder">
          <p>You’ve met everyone around for now. Check back soon for new locals!</p>
        </MascotSays>
      )}
      {people?.map(({ person, match, pending }) => (
        <PersonCard
          key={person.id}
          person={person}
          match={match}
          pending={pending}
          busy={busy === person.id}
          onConnect={() => connect(person)}
          onWithdraw={() => withdraw(person)}
        />
      ))}
    </div>
  )
}

/** Requests waiting for your answer, and news about the ones you sent. Shown at the top of Messages. */
function ConnectionInbox() {
  const { respondToConnection, markConnectionsSeen } = useStore()
  const { incoming, answers } = useConnectionNews()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Answers are shown for this visit, then marked seen so they don't come back.
  const [shown, setShown] = useState<Connection[]>([])
  const answerIds = answers.map((c) => c.id).join(',')
  const showAnswers = useEffectEvent(() => {
    const ids = new Set(answers.map((c) => c.id))
    // Keep them on screen first, then tell the server they've been seen (async, after this effect).
    void Promise.resolve()
      .then(() => {
        setShown((prev) => [...prev.filter((p) => !ids.has(p.id)), ...answers])
        return markConnectionsSeen([...ids])
      })
      .catch(() => {})
  })

  useEffect(() => {
    if (answerIds) showAnswers()
  }, [answerIds])

  async function answer(c: Connection, accept: boolean) {
    setBusy(c.id)
    setError(null)
    try {
      await respondToConnection(c.id, accept)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t answer that. Try again.')
    } finally {
      setBusy(null)
    }
  }

  if (incoming.length === 0 && shown.length === 0) return null
  return (
    <section aria-labelledby="requests-title" className="space-y-3">
      {incoming.length > 0 && (
        <>
          <h2 id="requests-title" className="flex items-center gap-2 text-2xl">
            <Icon name="people2" className="size-7" />
            Requests
            <span className="border-2 border-ink bg-ink px-1.5 font-sans text-sm text-sheet">{incoming.length}</span>
          </h2>
          <ul className="space-y-3">
            {incoming.map((c) => (
              <li key={c.id} className="sheet-grain border-2 border-ink shadow-block-sm">
                <div className="flex items-center gap-3 p-3">
                  <Avatar avatar={c.person.avatar} size="md" />
                  <p className="min-w-0 flex-1">
                    <strong className="text-lg">{c.person.name}</strong>
                    <span className="block text-sm">would love to explore with you. Want to connect?</span>
                  </p>
                </div>
                <details className="border-t-2 border-dashed border-ink px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-bold">View {c.person.name}’s profile</summary>
                  <div className="pt-3">
                    <PersonDetails person={c.person} />
                  </div>
                </details>
                <div className="flex flex-wrap gap-2 border-t-2 border-ink p-3">
                  <button type="button" disabled={busy === c.id} onClick={() => answer(c, true)} className={buttonClasses({ size: 'sm' })}>
                    <Icon name="check" accent="none" strokeWidth={2.4} className="size-5" />
                    Connect
                  </button>
                  <button type="button" disabled={busy === c.id} onClick={() => answer(c, false)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                    Not now
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {shown.map((c) => (
        <p
          key={c.id}
          role="status"
          className={cn('flex items-center gap-3 border-2 border-ink px-3 py-2 text-sm font-semibold', c.status === 'accepted' ? 'bg-teal-soft' : 'sheet-grain')}
        >
          <Avatar avatar={c.person.avatar} size="sm" />
          <span className="min-w-0 flex-1">
            {c.status === 'accepted'
              ? `${c.person.name} said yes! You’re connected. Say hi below.`
              : `${c.person.name} can’t meet up this time. Plenty more locals to discover!`}
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setShown((prev) => prev.filter((p) => p.id !== c.id))}
            className="grid size-9 shrink-0 place-items-center border-2 border-ink hover:bg-saffron-soft"
          >
            <Icon name="close" accent="none" className="size-4" />
          </button>
        </p>
      ))}
    </section>
  )
}

function Thread({ personId, embedded = false }: { personId: string; embedded?: boolean }) {
  const { sendMessage, markRead, removeFromMessages } = useStore()
  const conversation = useConversations().find((c) => c.person.id === personId)
  const navigate = useNavigate()
  const [showProfile, setShowProfile] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
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
          <p className="mt-2">You can message people once you’re connected (a local said yes to your request, or you said yes to theirs) or you’ve teamed up on a hunt.</p>
        </Card>
      </div>
    )
  }

  const { person, messages } = conversation

  async function remove() {
    setRemoving(true)
    setError(null)
    try {
      await removeFromMessages(person.id)
      navigate('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t remove them. Try again.')
      setRemoving(false)
    }
  }

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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-expanded={showProfile}
          aria-controls="thread-profile"
          onClick={() => setShowProfile((o) => !o)}
          className={buttonClasses({ variant: 'secondary', size: 'sm' })}
        >
          <Icon name={showProfile ? 'minus' : 'eye'} className="size-5" />
          {showProfile ? 'Hide profile' : 'View profile'}
        </button>
        <button type="button" onClick={() => setConfirmRemove(true)} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          Remove from Messages
        </button>
      </div>

      {showProfile && (
        <section id="thread-profile" aria-label={`${person.name}’s profile`} className="sheet-grain border-2 border-ink p-4 shadow-block-sm">
          <PersonDetails person={person} />
        </section>
      )}

      {confirmRemove && (
        <div role="alertdialog" aria-labelledby="remove-title" className="border-2 border-sienna-deep bg-sienna-soft p-4">
          <p id="remove-title" className="font-bold">Remove {person.name} from your Messages?</p>
          <p className="mt-1 text-sm">
            You’ll stop seeing each other here, and they won’t be notified. Your messages are kept: if you connect again later,
            this conversation comes back.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={removing} onClick={remove} className={buttonClasses({ variant: 'danger', size: 'sm' })}>
              {removing ? 'Removing…' : 'Remove'}
            </button>
            <button type="button" disabled={removing} onClick={() => setConfirmRemove(false)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Keep chatting
            </button>
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 border-2 border-dashed border-ink px-3 py-2 text-sm">
        <Icon name="info" accent="sheet" className="size-5" />
        <span>
        {person.demo || isSamplePerson(person.id)
          ? `${person.name} is a sample profile from the demo pool, so they won’t reply. `
          : ''}
        Messages are saved on this device until MIGO messaging goes live.
        </span>
      </p>

      <ol aria-label={`Conversation with ${person.name}`} aria-live="polite" className="sheet-grain flex min-h-72 flex-1 flex-col gap-3 border-2 border-ink p-4 shadow-block">
        {messages.length === 0 && (
          <li className="m-auto flex flex-col items-center gap-2 text-center font-serif text-lg">
            <Mascot pose="hello" className="h-24" />
            {conversation.connection ? 'You’re connected!' : 'You’re teammates!'} Say hi to {person.name}.
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
    <div className="sheet-grain hatch-soft grid flex-1 place-items-center border-2 border-ink p-8 shadow-block-sm">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Mascot pose={hasChats ? 'hello' : 'ponder'} className="h-32" />
        <p className="font-serif text-xl leading-snug">
          {hasChats ? 'Pick a conversation to carry on where you left off.' : 'Your conversations will open here.'}
        </p>
        <Link to="/chat?tab=discover" className={buttonClasses({ variant: 'secondary' })}>
          <Icon name="search" className="size-5" />
          Discover locals
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
        {tab === 'messages' ? (
          <>
            <ConnectionInbox />
            <ConversationList conversations={conversations} />
          </>
        ) : (
          <Discover />
        )}
      </div>
    )
  }

  // Two panes: the list stays put while the right-hand pane shows a thread, Discover, or a prompt.
  const paneTab = personId ? 'messages' : tab
  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] gap-8 2xl:gap-10">
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        <Tabs tab={paneTab} />
        <ConnectionInbox />
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
