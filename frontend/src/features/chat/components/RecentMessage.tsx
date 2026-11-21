// The latest conversation as a speech bubble from the sender's avatar. Opens that chat.
import { Link } from 'react-router'
import Avatar from '../../../components/ui/Avatar'
import { cn } from '../../../lib/cn'
import { useConversations } from '../useConversations'

export default function RecentMessage({ className }: { className?: string }) {
  const conversations = useConversations()
  const latest = conversations[0]

  const bubble = 'relative min-w-0 flex-1 rounded-[1.2rem_1rem_1.3rem_0.4rem] border-[3px] border-navy bg-paper px-3 py-2 text-sm text-navy'

  if (!latest) {
    return (
      <Link to="/chat" className={cn('group flex items-end gap-2', className)} aria-label="Messages: none yet. Open Chat">
        <div className={bubble}>
          <p className="font-type text-[0.65rem] tracking-wider uppercase">Messages</p>
          <p className="leading-snug">No messages yet. Team up on a hunt to start chatting.</p>
        </div>
      </Link>
    )
  }

  const { person, last, unread } = latest
  const preview = last ? (last.from === 'me' ? `You: ${last.text}` : last.text) : `You’re teammates. Say hi 👋`
  return (
    <Link
      to={`/chat/${encodeURIComponent(person.id)}`}
      className={cn('group flex items-end gap-2', className)}
      aria-label={`${unread > 0 ? `${unread} unread from` : 'Latest chat with'} ${person.name}: ${preview}`}
    >
      <span className="relative">
        <Avatar avatar={person.avatar} size="sm" className="bg-bubble-light transition-transform group-hover:-rotate-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full border-2 border-navy bg-red px-1 font-type text-[0.65rem] text-white" aria-hidden>
            {unread}
          </span>
        )}
      </span>
      <div className={cn(bubble, unread > 0 && 'bg-sun text-ink')}>
        {/* Tail pointing at the avatar */}
        <svg viewBox="0 0 16 16" className="absolute bottom-[-3px] -left-[13px] size-4" aria-hidden>
          <path d="M16 2 L1 14 L16 13 Z" fill={unread > 0 ? 'var(--color-sun)' : 'var(--color-paper)'} />
          <path d="M15 3 L1 14 L15 13" fill="none" stroke="var(--color-navy)" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <p className="flex items-center gap-1.5 font-semibold">
          {person.name}
          {unread > 0 && <span className="font-type text-[0.65rem] tracking-wider uppercase">· new</span>}
        </p>
        <p className="line-clamp-2 leading-snug">{preview}</p>
      </div>
    </Link>
  )
}
