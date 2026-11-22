// The main destinations, in order, for every navigation surface (side nav, tablet rail, phone tab
// bar, the hunts tab bar and the scaffold pages' top bar), with their live counts.
import { useConnectionNews, useConversations } from '../../features/chat/useConversations'
import { useChallenges } from '../../features/quests/useChallenges'
import type { IconName } from '../icons/Icon'

export type NavItem = { to: string; label: string; icon: IconName; badge?: number; badgeLabel?: string }

export function useNavItems(): NavItem[] {
  const { readyCount } = useChallenges()
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  // Chat's badge also counts requests waiting for your answer and "they said yes" news.
  const news = useConnectionNews().badge
  const chat = unread + news
  const chatLabel = [unread && `${unread} unread`, news && `${news} connection update${news === 1 ? '' : 's'}`].filter(Boolean).join(', ')
  return [
    { to: '/map', label: 'Map', icon: 'migo' },
    { to: '/quests', label: 'Quests', icon: 'quest', badge: readyCount, badgeLabel: `${readyCount} reward${readyCount === 1 ? '' : 's'} to claim` },
    { to: '/chat', label: 'Chat', icon: 'chats', badge: chat, badgeLabel: chatLabel },
    { to: '/gallery', label: 'Gallery', icon: 'gallery' },
    { to: '/profile', label: 'Profile', icon: 'smile' },
  ]
}

