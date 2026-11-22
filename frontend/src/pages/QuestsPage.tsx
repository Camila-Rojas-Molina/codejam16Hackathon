// QUESTS: this week's challenge, today's three dailies, personalised travel adventures and the
// getting-started checklist, then quest history and points activity. Everything shown comes from
// the economy (server when signed in, else this device): progress, rewards, what's claimable,
// refreshes and reset times are its values. Each category has its own look: weekly = saffron
// poster, daily = sheet tickets, adventures = teal postcards, starter = a checklist.
// Layout follows the space the dashboard leaves (container queries), not the window.
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import Icon, { type IconName } from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { ErrorText } from '../components/ui/Fields'
import PageHeader from '../components/ui/PageHeader'
import PointsHistory from '../features/economy/components/PointsHistory'
import PointsSummary from '../features/economy/components/PointsSummary'
import AdventurePostcard from '../features/quests/components/AdventurePostcard'
import DailyTicket from '../features/quests/components/DailyTicket'
import QuestHistory from '../features/quests/components/QuestHistory'
import { TimeLeft } from '../features/quests/components/QuestCard'
import StarterChecklist from '../features/quests/components/StarterChecklist'
import WeeklyHero from '../features/quests/components/WeeklyHero'
import { personFrom } from '../features/quests/engine'
import { useChallenges } from '../features/quests/useChallenges'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

function SectionHead({ id, icon, title, blurb, aside }: { id: string; icon: IconName; title: string; blurb: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 text-2xl sm:text-3xl">
          <Icon name={icon} className="size-8 shrink-0" />
          {title}
        </h2>
        <div className="mt-1 text-sm">{blurb}</div>
      </div>
      {aside}
    </div>
  )
}

/** Placeholder cell for a section with nothing in it right now. */
function Empty({ children }: { children: ReactNode }) {
  return <p className="hatch-soft border-2 border-dashed border-ink bg-sheet p-4 text-sm font-semibold">{children}</p>
}

export default function QuestsPage() {
  const { profile, economy, economyError, reloadEconomy, recordVisit } = useStore()
  const board = useChallenges()
  const { hash } = useLocation()
  const target = hash.startsWith('#') ? decodeURIComponent(hash.slice(1)) : null
  const person = personFrom(profile)

  // Opening Quests counts for "visit" quests.
  useEffect(() => {
    recordVisit('quests')
  }, [recordVisit])

  // Arriving from a link (the sidebar card, another quest): bring that quest or section into view.
  useEffect(() => {
    if (target && board.ready) document.getElementById(target)?.scrollIntoView({ block: 'start' })
  }, [target, board.ready])

  const loading = !economy && !economyError
  const failed = !economy && !!economyError

  return (
    <div className="@container mx-auto w-full max-w-7xl space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow="Challenges & rewards"
        title="Quests"
        description={
          <>
            Explore, complete challenges, earn points, then spend them in the{' '}
            <Link to="/shop" className="font-semibold underline decoration-2 underline-offset-2 hover:decoration-sienna">
              shop
            </Link>
            .
          </>
        }
        aside={<Mascot pose="play" className="hidden h-28 sm:block" />}
      />

      {loading && (
        <div role="status" className="sheet-grain flex items-center gap-4 border-2 border-ink p-5">
          <Mascot pose="search" className="h-20" />
          <p className="font-semibold">Loading your quests…</p>
        </div>
      )}

      {failed && (
        <div className="space-y-3 border-2 border-sienna-deep bg-sienna-soft p-5">
          <p className="flex items-start gap-2 font-semibold">
            <Icon name="alert" accent="sienna" className="mt-0.5 size-6 shrink-0" />
            We couldn’t load your quests. {economyError}
          </p>
          <Button variant="secondary" icon="undo" onClick={() => void reloadEconomy()}>
            Try again
          </Button>
        </div>
      )}

      {economy && (
        <>
          {economyError && <ErrorText>{economyError}</ErrorText>}

          {/* Phone: the balance up top. Desktop shows the full summary beside the weekly hero. */}
          <div className="space-y-2 @4xl:hidden">
            <PointsSummary compact />
            {economy.source === 'device' && (
              <p className="flex items-start gap-2 text-xs font-semibold">
                <Icon name="info" className="size-4 shrink-0" />
                Points are saved on this device only.
              </p>
            )}
          </div>

          {board.readyCount > 0 && (
            <p role="status" className="flex items-center gap-3 border-2 border-ink bg-teal-soft px-4 py-2 font-semibold">
              <Icon name="trophy" className="size-7 shrink-0" />
              {board.readyCount} reward{board.readyCount === 1 ? '' : 's'} ready to claim!
            </p>
          )}

          {/* WEEKLY CHALLENGE + side column (desktop). */}
          <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_20rem] @6xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-labelledby="weekly" className="min-w-0 space-y-4">
              <SectionHead
                id="weekly"
                icon="calendar"
                title="Weekly challenge"
                blurb={
                  <>
                    The big one. <TimeLeft until={economy.nextWeeklyReset} prefix="New challenge in" />
                  </>
                }
              />
              {board.weekly ? (
                <WeeklyHero view={board.weekly} highlight={target === `quest-${board.weekly.a.id}`} />
              ) : (
                <Empty>No weekly challenge right now. A new one arrives with the weekly reset.</Empty>
              )}
            </section>

            <aside aria-label="Your points" className="hidden space-y-4 @4xl:block">
              <PointsSummary />
              <div className="sheet-grain space-y-2 border-2 border-ink p-4 text-sm">
                <p className="eyebrow">Today</p>
                <p className="font-bold">
                  {board.dailyDoneCount} of {board.daily.length || 3} dailies done
                </p>
                <TimeLeft until={economy.nextDailyReset} prefix="Dailies reset in" />
                <p>
                  <RefreshIndicator available={economy.dailyRefreshAvailable} />
                </p>
              </div>
            </aside>
          </div>

          {/* DAILY CHALLENGES */}
          <section aria-labelledby="daily-title" id="daily" className="scroll-mt-24 space-y-4">
            <SectionHead
              id="daily-title"
              icon="sun"
              title="Daily challenges"
              blurb={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold">
                    {board.dailyDoneCount} of {board.daily.length || 3} done
                  </span>
                  <TimeLeft until={economy.nextDailyReset} prefix="New ones in" />
                </span>
              }
              aside={<RefreshIndicator available={economy.dailyRefreshAvailable} />}
            />
            {board.daily.length > 0 ? (
              <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
                {board.daily.map((v) => (
                  <DailyTicket key={v.a.id} view={v} canRefresh={economy.dailyRefreshAvailable} highlight={target === `quest-${v.a.id}`} />
                ))}
              </div>
            ) : (
              <Empty>Today’s challenges are on their way. Check back in a moment.</Empty>
            )}
          </section>

          {/* TRAVEL ADVENTURES */}
          <section aria-labelledby="adventures-title" id="adventures" className="scroll-mt-24 space-y-4">
            <SectionHead
              id="adventures-title"
              icon="backpack"
              title="Travel adventures"
              blurb={
                <>
                  Picked for you{board.city ? ` in ${board.city}` : ''}, from your interests, pace and needs.{' '}
                  <TimeLeft until={economy.nextWeeklyReset} prefix="New picks in" />
                </>
              }
              aside={
                <Link to="/profile?tab=answers" className="text-sm font-semibold underline decoration-2 underline-offset-2 hover:decoration-sienna">
                  Tune your interests
                </Link>
              }
            />
            {board.adventures.length > 0 ? (
              <div className="grid gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
                {board.adventures.map((v) => (
                  <AdventurePostcard key={v.a.id} view={v} person={person} city={board.city} highlight={target === `quest-${v.a.id}`} />
                ))}
              </div>
            ) : (
              <Empty>No adventures right now. New picks arrive with the weekly reset.</Empty>
            )}
          </section>

          {/* GETTING STARTED + history & points activity */}
          <div className="grid gap-8 @4xl:grid-cols-2">
            <section aria-labelledby="starter-title" id="starter" className={cn('scroll-mt-24 space-y-4')}>
              <SectionHead id="starter-title" icon="clipboard" title="Getting started" blurb="One-time rewards for trying each part of MIGO." />
              <StarterChecklist todo={board.starter} done={board.starterDone} highlightId={target} />
            </section>

            <div className="space-y-8">
              <section aria-labelledby="history-title" className="space-y-4">
                <SectionHead id="history-title" icon="trophy" title="Quest history" blurb="Everything you’ve completed." />
                <QuestHistory items={board.history} />
              </section>
              <section aria-labelledby="points-title" className="space-y-4">
                <SectionHead
                  id="points-title"
                  icon="coins"
                  title="Points activity"
                  blurb={
                    <>
                      Earned and spent, newest first.{' '}
                      <Link to="/shop" className="font-semibold underline decoration-2 underline-offset-2 hover:decoration-sienna">
                        Visit the shop
                      </Link>
                    </>
                  }
                />
                <PointsHistory limit={10} runningBalance />
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function RefreshIndicator({ available }: { available: boolean }) {
  return available ? (
    <Badge tone="teal" icon="shuffle">
      1 refresh left today
    </Badge>
  ) : (
    <Badge tone="outline" icon="clock">
      Refresh used — back tomorrow
    </Badge>
  )
}
