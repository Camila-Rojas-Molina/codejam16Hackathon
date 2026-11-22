# Quests

Two things live here:

1. **Challenges** (the QUESTS tab): weekly, daily, travel-adventure and getting-started quests that pay
   points. The points economy contract is `features/economy/types.ts`.
2. **Photo hunts** (`types.ts`): GPS-checked location hunts with a photo, time limit and trivia. Scoring
   lives in `features/scoring`.

## Challenges

| File | What |
| --- | --- |
| `catalog/{weekly,daily,adventures,starter}.ts` | Every quest definition. Plain data, no React: `npm run gen:economy` turns it into SQL seed data. |
| `catalog/index.ts` | `QUEST_DEFS`, `questDef(id)`, `questDefsIn(category)`, `conditionTarget(def)`, `fillCity()`, `catalogProblems()` (ids unique, rewards inside `REWARD_BANDS`). |
| `engine.ts` | The rules: periods (day / ISO week in a timezone), issuing (slots, personalisation, no repeats, seeded so a period is stable), the daily refresh, and `evaluateProgress()`. Used by device mode (`lib/economy/device.ts`); the server runs the same rules in SQL. |
| `view.ts` | One assignment as the screens show it (copy with `{city}` filled, icon, state, "why suggested"). |
| `useChallenges.ts` | The person's quests from the store's `economy`, grouped for the page and the sidebar; `readyCount` feeds the nav badge. |
| `components/` | `WeeklyHero` (saffron poster), `DailyTicket` (sheet tickets + refresh), `AdventurePostcard` (teal postcards), `StarterChecklist`, `QuestHistory`, `DailyQuestCard` (sidebar), shared bits in `QuestCard`. |

### Rules (keep the SQL in step)

- **Slots**: 1 weekly (`w:2026-W48`), 3 daily (`d:2026-11-23:<1-3>`), 3 adventures (`a:2026-W48:<1-3>`), every
  starter once (`starter`). Weeks start Monday 00:00, days at 00:00, in the person's timezone.
- **Progress** comes from stored facts only. Period quests count what happened inside their period;
  starter quests count all time. `photos` with `distinctCities`: the first photo from each city counts (up
  to `distinctCities`), further photos fill the rest of `count`; target = `max(count, distinctCities)`.
- **Personalisation** (score = interest overlap, mode, pace ↔ effort, + seeded jitter): quests whose
  `modes` don't include the active mode, or whose `avoidFor` hits one of the person's accessibility needs,
  are never offered. At most one companion-only quest per period, so there is always something you can do
  alone; a companion-only weekly needs a hunt with a teammate in your history. Quests from recent periods
  (3 days / 4 weeks / 2 weeks) are avoided while anything else fits.
- **Refresh**: one per day, on an unfinished active daily; the new one is never one already handed out
  that day.
- **Ids are saved in accounts**: never rename or delete a quest; set `retired: true`. `daily-hunt`,
  `starter-profile`, `starter-two-modes` and `starter-passport` come from the first version (old claims
  `challenge:<id>:<period>` count as completed).
- **`{city}`** in titles/descriptions = the trip destination (tourist) or home/hosting city (local).
