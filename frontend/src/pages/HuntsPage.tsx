// PLACEHOLDER until build step 4 (hunt list). Exists so Welcome/Match have somewhere to land.
import { Navigate, useNavigate } from 'react-router'
import Screen from '../components/layout/Screen'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import BottomNav from '../components/ui/BottomNav'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Logo from '../components/ui/Logo'
import ModeSwitch from '../features/profile/components/ModeSwitch'
import { nextOnboardingStep } from '../features/profile/flow'
import { useStore } from '../store/useStore'

export default function HuntsPage() {
  const { account, profile, team, clearMatch } = useStore()
  const navigate = useNavigate()

  const next = nextOnboardingStep(account, profile)
  if (next) return <Navigate to={next} replace />
  // Each context (trip / Local mode) has its own teammate. None yet for this one: go find one.
  if (!team) return <Navigate to="/match" replace />

  return (
    <Screen withNav className="gap-6">
      <Logo size="sm" />
      <ModeSwitch returnTo="/hunts" />
      <h1 className="text-4xl text-navy">Hunts</h1>

      <Card tone="bubble-light" tilt="left">
        <p className="font-type text-xs tracking-wider uppercase">Your team</p>
        <h2 className="mt-1 text-2xl">{team.name}</h2>
        <p className="mt-2 flex items-center gap-2 text-3xl" aria-label={`${team.members[0].name} and ${team.members[1].name}`}>
          <Avatar avatar={team.members[0].avatar} size="md" /> + <Avatar avatar={team.members[1].avatar} size="md" />
        </p>
        <p className="mt-1">
          {team.members[0].name} & {team.members[1].name}
        </p>
        <Badge className="mt-3">{team.points} pts</Badge>
      </Card>

      <Card>
        <p>The hunt list arrives in build step 4.</p>
      </Card>

      <Button
        variant="secondary"
        onClick={() => {
          clearMatch()
          navigate('/match')
        }}
      >
        Find a new teammate
      </Button>

      <BottomNav />
    </Screen>
  )
}
