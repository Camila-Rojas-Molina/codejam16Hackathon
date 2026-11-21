import { Link } from 'react-router'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Card>
        <Link to="/" className="font-type uppercase text-navy underline underline-offset-4">
          Back to home
        </Link>
      </Card>
    </>
  )
}
