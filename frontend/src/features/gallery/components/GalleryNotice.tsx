// Why there's no upload: photos need online storage and a login. Honest, with the way forward.
import { Link } from 'react-router'
import { Mascot } from '../../../components/illustrations/Mascot'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import type { GalleryAvailability } from '../useGallery'

export default function GalleryNotice({ availability }: { availability: Exclude<GalleryAvailability, 'online'> }) {
  return (
    <section aria-labelledby="gallery-notice" className="sheet-grain flex flex-col items-center gap-5 border-2 border-ink p-5 text-center sm:flex-row sm:p-6 sm:text-left">
      <Mascot pose="ponder" className="h-36 shrink-0 sm:h-44" />
      <div className="min-w-0">
        <p className="eyebrow mb-2">{availability === 'device' ? 'Device-only mode' : 'Signed out'}</p>
        <h2 id="gallery-notice" className="text-2xl sm:text-3xl">
          Photos need an online account
        </h2>
        {availability === 'device' ? (
          <div className="mt-2 max-w-xl space-y-2">
            <p>
              This copy of MIGO keeps your profile in this browser only, with no online storage for pictures, so photos can’t be
              saved here yet.
            </p>
            <p className="text-sm">
              When MIGO is connected to its online service and you sign in, the photos you take while exploring are kept with your
              account, with their city and date, on every device.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 max-w-xl">Sign in to see your photos and add new ones. They’re kept with your account.</p>
            <Link to="/login" className={buttonClasses({ className: 'mt-4' })}>
              Sign in
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
