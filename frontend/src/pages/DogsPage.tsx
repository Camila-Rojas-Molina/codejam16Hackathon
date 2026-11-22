import PageHeader from '../components/ui/PageHeader'
import { Mascot } from '../components/illustrations/Mascot'
import Card from '../components/ui/Card'

export default function DogsPage() {
  return (
    <>
      <PageHeader title="Dog Park Quests" description="Match a local and a tourist to find a dog park together." />
      <Card>
        <div className="flex items-center gap-4">
          <Mascot pose="ponder" className="h-20" />
          <p className="font-semibold">Coming soon.</p>
        </div>
      </Card>
    </>
  )
}
