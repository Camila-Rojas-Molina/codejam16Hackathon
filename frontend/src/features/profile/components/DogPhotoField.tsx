// Optional dog photo for the "Any four-legged amigos?" question. No existing photo input to reuse,
// so this is the smallest one possible, built from the shared field label and button styles.
// The image is shrunk to a small JPEG data URL so it fits comfortably in the stored profile.
import { useId, useState, type ChangeEvent } from 'react'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import { ErrorText, fieldLabel } from '../../../components/ui/Fields'

const MAX_SIDE = 320

async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.8)
}

type DogPhotoFieldProps = {
  dogName: string
  value: string | null
  onChange: (photo: string | null) => void
}

export default function DogPhotoField({ dogName, value, onChange }: DogPhotoFieldProps) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again after Remove
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      onChange(await shrink(file))
    } catch {
      setError('We couldn’t read that image. Try a JPG or PNG.')
    } finally {
      setBusy(false)
    }
  }

  const who = dogName.trim() || 'your dog'

  return (
    <div>
      <p className={fieldLabel}>
        Photo of {who}
        <span className="ml-2 font-medium tracking-normal normal-case">(optional)</span>
      </p>
      <div className="flex items-center gap-4">
        {value && (
          <img
            src={value}
            alt={`Photo of ${who}`}
            className="size-20 shrink-0 border-2 border-ink object-cover"
          />
        )}
        <div className="flex flex-wrap gap-2">
          {/* The label is the visible button; the real file input stays focusable for keyboards. */}
          <input id={id} type="file" accept="image/*" onChange={pick} className="peer sr-only" disabled={busy} />
          <label
            htmlFor={id}
            className={buttonClasses({
              variant: 'secondary',
              className:
                'cursor-pointer peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ink',
            })}
          >
            {busy ? 'Adding…' : value ? 'Change photo' : 'Add a photo'}
          </label>
          {value && (
            <button type="button" className={buttonClasses({ variant: 'ghost' })} onClick={() => onChange(null)}>
              Remove
            </button>
          )}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
