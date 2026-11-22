import { Link } from 'react-router'
import { Mascot } from '../components/illustrations/Mascot'
import { ArrowCell } from '../components/ui/Button'
import { arrowLabel, arrowRowClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="Error 404" title="Page not found" description="This page wandered off the map." />
      <Card className="mt-6 flex flex-wrap items-center gap-6">
        <Mascot pose="ponder" className="h-32" label />
        <Link to="/" className={arrowRowClasses}>
          <span className={arrowLabel}>Back to home</span>
          <ArrowCell />
        </Link>
      </Card>
    </>
  )
}
