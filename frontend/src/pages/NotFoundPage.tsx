import { Link } from 'react-router'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Card>
        <Link to="/" className="font-medium text-brand-700 hover:underline">
          Back to home
        </Link>
      </Card>
    </>
  )
}
