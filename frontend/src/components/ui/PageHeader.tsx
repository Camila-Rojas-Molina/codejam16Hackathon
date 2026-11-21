type PageHeaderProps = {
  title: string
  description?: string
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl md:text-4xl">{title}</h1>
      {description && <p className="mt-1 text-navy">{description}</p>}
    </header>
  )
}
