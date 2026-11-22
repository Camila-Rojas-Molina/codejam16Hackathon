// The latest conversation as an outlined speech bubble from the sender's avatar. Opens that chat.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Avatar from '../../../components/ui/Avatar'
import { cn } from '../../../lib/cn'
import { useConversations } from '../useConversations'

function Bubble({ highlight, children }: { highlight?: boolean; children: ReactNode }) {
  return (
    <div className={cn('relative min-w-0 flex-1 rounded-[1.2rem] border-2 border-ink px-3.5 py-2.5 text-sm text-ink', highlight ? 'bg-saffron' : 'bg-sheet')}>
      {/* Tail pointing at the avatar */}
      <svg viewBox="0 0 16 16" className="absolute bottom-2 -left-[14px] size-4" aria-hidden>
        <path d="M16 3 L1 13 L16 11 Z" fill={highlight ? 'var(--color-saffron)' : 'var(--color-sheet)'} />
        <path d="M15 3 L1 13 L15 11" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      {children}
    </div>
  )
}

export default function RecentMessage({ className }: { className?: string }) {
  const conversations = useConversations()
  const latest = conversations[0]

  if (!latest) {
    return (
      <Link to="/chat" className={cn('group flex items-end gap-3', className)} aria-label="Messages: none yet. Open Chat">
        <Bubble>
          <p className="eyebrow text-[0.65rem]">Messages</p>
          <p className="font-serif leading-snug">No messages yet. Connect with someone in Chat to start talking.</p>
        </Bubble>
      </Link>
    )
  }

  const { person, last, unread } = latest
  const preview = last ? (last.from === 'me' ? `You: ${last.text}` : last.text) : latest.connection ? 'You’re connected. Say hi!' : 'You’re teammates. Say hi!'
  return (
    <Link
      to={`/chat/${encodeURIComponent(person.id)}`}
      className={cn('group flex items-end gap-3', className)}
      aria-label={`${unread > 0 ? `${unread} unread from` : 'Latest chat with'} ${person.name}: ${preview}`}
    >
      <span className="relative">
        <Avatar avatar={person.avatar} size="sm" className="transition-transform group-hover:-rotate-6" />
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 grid min-w-5 place-items-center border-2 border-ink bg-ink px-1 text-[0.65rem] font-bold text-sheet shadow-[2px_2px_0_var(--color-sienna)]" aria-hidden>
            {unread}
          </span>
        )}
      </span>
      <Bubble highlight={unread > 0}>
        <p className="flex items-center gap-1.5 font-bold">
          {person.name}
          {unread > 0 && <span className="text-[0.62rem] tracking-[0.12em] uppercase">· new</span>}
        </p>
        <p className="line-clamp-2 font-serif leading-snug">{preview}</p>
      </Bubble>
    </Link>
  )
}
