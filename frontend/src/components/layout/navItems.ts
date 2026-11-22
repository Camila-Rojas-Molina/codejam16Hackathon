// The main destinations, in order, for every navigation surface (side nav, tablet rail, phone tab
// bar, the hunts tab bar and the scaffold pages' top bar), with their live counts.
import { useConversations } from '../../features/chat/useConversations'
import { useChallenges } from '../../features/quests/useChallenges'
import type { IconName } from '../icons/Icon'

export type NavItem = { to: string; label: string; icon: IconName | 'mascot'; badge?: number; badgeLabel?: string }

export function useNavItems(): NavItem[] {
  const { readyCount } = useChallenges()
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  return [
    { to: '/map', label: 'Map', icon: 'mascot' },
    { to: '/quests', label: 'Quests', icon: 'quest', badge: readyCount, badgeLabel: `${readyCount} reward${readyCount === 1 ? '' : 's'} to claim` },
    { to: '/chat', label: 'Chat', icon: 'chats', badge: unread, badgeLabel: `${unread} unread` },
    { to: '/profile', label: 'Profile', icon: 'smile' },
    { to: '/gallery', label: 'Gallery', icon: 'gallery' },
  ]
}

