// Languages: common ones as chips, anything else typed in as a tag.
import Choices from '../../../components/ui/Choices'
import { TagInput } from '../../../components/ui/Fields'
import { LANGUAGE_MAX_LENGTH, LANGUAGE_OPTIONS, type Option } from '../options'

const COMMON: readonly string[] = LANGUAGE_OPTIONS
const commonOptions: Option<string>[] = LANGUAGE_OPTIONS.map((l) => ({ value: l, label: l }))
const canonical = (l: string) => COMMON.find((c) => c.toLowerCase() === l.toLowerCase())
const isCommon = (l: string) => canonical(l) !== undefined

type LanguageFieldsProps = {
  legend: string
  hint?: string
  values: string[]
  onChange: (values: string[]) => void
}

export default function LanguageFields({ legend, hint, values, onChange }: LanguageFieldsProps) {
  const common = values.filter(isCommon)
  const custom = values.filter((l) => !isCommon(l))
  return (
    <div className="space-y-4">
      <Choices
        multiple
        layout="chip"
        legend={legend}
        hint={hint}
        options={commonOptions}
        values={common}
        onChange={(next) => onChange([...next, ...custom])}
      />
      <TagInput
        label="Another language"
        placeholder="e.g. Swahili"
        values={custom}
        // Typing a common language ("french") just selects its chip.
        onChange={(next) => onChange([...new Set([...common, ...next.map((l) => canonical(l) ?? l)])])}
        maxLength={LANGUAGE_MAX_LENGTH}
        max={10}
      />
    </div>
  )
}
