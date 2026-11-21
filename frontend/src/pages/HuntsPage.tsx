// PLACEHOLDER until build step 4 (hunt list). Exists so Welcome/Match have somewhere to land.
import { Navigate, useNavigate } from 'react-router'
import Screen from '../components/layout/Screen'
import Badge from '../components/ui/Badge'
import BottomNav from '../components/ui/BottomNav'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Logo from '../components/ui/Logo'
import { useStore } from '../store/useStore'

export default function HuntsPage() {
  const { user, team, reset } = useStore()
  const navigate = useNavigate()

  if (!user) return <Navigate to="/onboarding" replace />
  if (!team) return <Navigate to="/match" replace />

  return (
    <Screen withNav className="gap-6">
      <Logo size="sm" />
      <h1 className="text-4xl text-navy">Hunts</h1>

      <Card tone="bubble-light" tilt="left">
        <p className="font-type text-xs tracking-wider uppercase">Your team</p>
        <h2 className="mt-1 text-2xl">{team.name}</h2>
        <p className="mt-2 text-3xl" aria-label={`${team.members[0].name} and ${team.members[1].name}`}>
          {team.members[0].avatar} + {team.members[1].avatar}
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
          reset()
          navigate('/', { replace: true })
        }}
      >
        Start over
      </Button>

      <BottomNav />
    </Screen>
  )
}
