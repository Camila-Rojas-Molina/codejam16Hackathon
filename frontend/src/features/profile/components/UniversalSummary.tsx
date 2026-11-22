// The universal profile at a glance, grouped by section, each answer tagged Public or Private.
// Used on the questionnaire's review screen and on the profile page.
import { SECTIONS, summaryRows, type SectionId } from '../../onboarding/questionnaire'
import type { UniversalProfile } from '../types'
import SummaryList from './SummaryList'

type UniversalSummaryProps = {
  universal: UniversalProfile
  /** Shows a Change button per answer, called with the question's step id. */
  onEdit?: (stepId: string) => void
  sections?: SectionId[]
}

export default function UniversalSummary({ universal, onEdit, sections = ['you', 'style'] }: UniversalSummaryProps) {
  const rows = summaryRows(universal)
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <SummaryList
          key={section}
          title={SECTIONS[section].title}
          onEdit={onEdit}
          items={rows
            .filter((r) => r.section === section)
            .map((r) => ({ id: r.stepId, label: r.label, value: r.value, visibility: r.visibility, icon: r.icon }))}
        />
      ))}
    </div>
  )
}
