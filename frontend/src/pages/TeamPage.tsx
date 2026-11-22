import PageHeader from '../components/ui/PageHeader'
import { Mascot } from '../components/illustrations/Mascot'
import Card from '../components/ui/Card'

export default function TeamPage() {
  return (
    <>
      <PageHeader title="Team" description="Your team, members and score." />
      <Card>
        <div className="flex items-center gap-4">
          <Mascot pose="ponder" className="h-20" />
          <p className="font-semibold">Coming soon.</p>
        </div>
      </Card>
    </>
  )
}
