// "You've been matched!": the notification a local gets when a tourist picks them from their top
// matches. Pinned over the app (above the phone tab bar, bottom-right on desktop) on every screen
// except Chat, which shows the same news at the top of Messages. Say hi keeps the match and opens
// the conversation; Not now closes it gently (the tourist is told once and picks someone else).
import { useState } from 'react'
import { useLocation } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { Mascot } from '../../../components/illustrations/Mascot'
import Avatar from '../../../components/ui/Avatar'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import { matchedCopy, useAnswerMatch } from '../useAnswerMatch'
import { useConnectionNews } from '../useConversations'

export default function MatchNotice() {
  const { matched } = useConnectionNews()
  const { pathname } = useLocation()
  const { answer, busy, error } = useAnswerMatch()
  // "Later" hides it for this visit only; it comes back next time, and the Chat badge stays.
  const [later, setLater] = useState<string[]>([])
  const c = matched.find((m) => !later.includes(m.id))
  if (!c || pathname.startsWith('/chat')) return null

  return (
    <aside
      aria-labelledby="match-notice-title"
      className={cn(
        'fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 animate-pop',
        'md:inset-x-auto md:right-6 md:bottom-6 md:w-[24rem]',
      )}
    >
      <div role="status" className="sheet-grain border-2 border-ink shadow-block">
        <div className="flex items-end gap-3 border-b-2 border-ink bg-saffron px-4 pt-2">
          <Mascot pose="cheer" className="-mb-px h-16 shrink-0" />
          <h2 id="match-notice-title" className="pb-2 text-2xl leading-none">
            You’ve been matched!
          </h2>
          <button
            type="button"
            aria-label="Remind me later"
            title="Later"
            onClick={() => setLater((l) => [...l, c.id])}
            className="mb-2 ml-auto grid size-9 shrink-0 place-items-center border-2 border-ink bg-sheet hover:bg-saffron-soft"
          >
            <Icon name="close" accent="none" className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Avatar avatar={c.person.avatar} size="md" />
          <p className="min-w-0 flex-1 text-sm">{matchedCopy(c)}</p>
        </div>
        <div className="flex flex-wrap gap-2 border-t-2 border-ink p-3">
          <button type="button" disabled={busy === c.id} onClick={() => answer(c, true)} className={buttonClasses({ size: 'sm' })}>
            <Icon name="chat" accent="sheet" className="size-5" />
            Say hi
          </button>
          <button type="button" disabled={busy === c.id} onClick={() => answer(c, false)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Not now
          </button>
          {matched.length > 1 && <span className="self-center text-xs font-semibold">+{matched.length - 1} more in Chat</span>}
        </div>
        {error && (
          <p role="alert" className="border-t-2 border-ink px-4 py-2 text-sm">
            {error}
          </p>
        )}
      </div>
    </aside>
  )
}
