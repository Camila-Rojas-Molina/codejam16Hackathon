// PLACEHOLDER until build step 4 (hunt list). Exists so Welcome/Match have somewhere to land.
import { Link, Navigate, useNavigate } from 'react-router'
import Screen from '../components/layout/Screen'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import BottomNav from '../components/ui/BottomNav'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Logo from '../components/ui/Logo'
import { buttonClasses } from '../components/ui/buttonStyles'
import Icon from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
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
      <div className="flex items-center justify-between gap-3">
        <Logo size="sm" />
        <Link to="/map" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          <Icon name="arrow-left" accent="none" strokeWidth={2.4} className="size-4" />
          Back to MIGO
        </Link>
      </div>
      <ModeSwitch returnTo="/hunts" />
      <header>
        <p className="eyebrow mb-2">Photo hunts</p>
        <h1 className="text-4xl">Hunts</h1>
      </header>

      <Card tone="saffron-soft" lifted>
        <p className="eyebrow">Your team</p>
        <h2 className="mt-1 text-2xl">{team.name}</h2>
        <p className="mt-3 flex items-center gap-2" aria-label={`${team.members[0].name} and ${team.members[1].name}`}>
          <Avatar avatar={team.members[0].avatar} size="md" />
          <Icon name="plus" accent="none" strokeWidth={2.4} className="size-5" />
          <Avatar avatar={team.members[1].avatar} size="md" />
        </p>
        <p className="mt-2 font-semibold">
          {team.members[0].name} & {team.members[1].name}
        </p>
        <Badge className="mt-3" icon="coin">
          {team.points} pts
        </Badge>
      </Card>

      <Card className="flex items-center gap-4">
        <Mascot pose="ponder" className="h-20 shrink-0" />
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
