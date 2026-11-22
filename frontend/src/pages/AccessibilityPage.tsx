import PageHeader from '../components/ui/PageHeader'
import { Mascot } from '../components/illustrations/Mascot'
import Card from '../components/ui/Card'

export default function AccessibilityPage() {
  return (
    <>
      <PageHeader title="Accessible Places" description="Recommendations based on your accessibility needs." />
      <Card>
        <div className="flex items-center gap-4">
          <Mascot pose="ponder" className="h-20" />
          <p className="font-semibold">Coming soon.</p>
        </div>
      </Card>
    </>
  )
}
