# Data repo schema

The app and the coach share one private repo. TypeScript shapes live in [`src/types.ts`](../src/types.ts); this page is the map. Dates are local `YYYY-MM-DD`, weeks are ISO (`2026-W38`, Monday first), times are `HH:MM` 24-hour.

## Layout and ownership

| Path | Written by | Shape |
| --- | --- | --- |
| `COACH.md` | coach | Coaching brief: athlete, goals, constraints, procedures |
| `profile.json` | coach | `Profile`: goals, fixed schedule, habits, food checklist, tricks, benchmark definitions |
| `plans/YYYY-Www.json` | coach | `WeekPlan`: phase, focus, workout templates, days → blocks |
| `coach/feed.json` | coach | `CoachFeed`: notes (newest shows on Today), questions, weekly report cards |
| `health/labs.json` | coach | `Labs`: panels of markers with `ref` and `optimal` ranges |
| `health/supplements.json` | coach | `Supplements`: the stack with status |
| `zwift/*.zwo` | coach | Zwift workouts referenced from `PlanBlock.bike.zwo` |
| `logs/days/YYYY-MM-DD.json` | app | `DayLog`: morning and evening check-ins, block statuses, answers to questions |
| `logs/workouts/<id>.json` | app | `WorkoutLog`: every set (kg, reps, sec, RPE, done) |
| `logs/kite/<id>.json` | app | `KiteLog`: spot, wind, kite, per-trick tries/lands, crashes |
| `logs/benchmarks/<id>.json` | app | `BenchmarkLog`: one test result |
| `logs/cramps/<id>.json` | app | `CrampLog`: when, which muscle, fuel and sodium |
| `health/uploads/*` | app | Raw PDFs and photos of lab results |

Each side writes only its own paths, so sync is conflict-free. The app pushes changed logs as a single commit (`app: sync N files`) and pulls anything whose git blob SHA changed. A coach file with invalid JSON is skipped and shown as a sync error.

## Plans

```jsonc
{
  "week": "2026-W39",
  "phase": "Block 1 · Build 1",
  "focus": "What this week is for, in two or three sentences.",
  "templates": { "gymA": { "hero": "Trap_Bar_Deadlift", "warmup": "…", "items": [/* WorkoutItem */], "cooldown": "…" } },
  "days": {
    "2026-09-21": {
      "note": "Optional line shown above the day.",
      "blocks": [
        {
          "id": "2026-09-21-gym-a",          // stable and unique: date + slug
          "time": "11:00", "durationMin": 85,
          "kind": "strength",                 // strength | power | mobility | bike | ride | kite | test | recovery | ritual
          "title": "Gym A · Heavy lower",
          "intensity": "hard",                // easy | moderate | hard; hard blocks get readiness adjustments
          "workout": "gymA",                  // template key, or an inline Workout
          "tests": ["ftp"],                   // benchmark ids to log from this block
          "lowRecovery": "Optional replacement text when recovery is red",
          "bike": { "summary": "…", "zwo": "zwift/….zwo", "segments": [{ "min": 12, "pct": 0.95, "label": "12′ @ 95%" }], "fuel": { "carbsGPerH": 80, "fluidMlPerH": 700, "sodiumMgPerH": 800 } }
        }
      ]
    }
  }
}
```

`WorkoutItem`: `{ exerciseId, sets, reps, load?, restSec?, tempo?, cue?, group?, track? }`. `exerciseId` is an id from `public/exercises.json` (free-exercise-db ids like `Trap_Bar_Deadlift`, or custom drills prefixed `x_`). `reps` is free text (`"5"`, `"8/side"`, `"30s"`); `track` forces the logging columns (`weight`: kg/reps/RPE, `reps`: reps/RPE, `time`: seconds/RPE).

Segment `pct` is a fraction of FTP. A `[from, to]` pair is a ramp; `free: true` means all-out with ERG off.

## Readiness rules (built into the app)

WHOOP recovery ≥67 green, 34–66 yellow, ≤33 red. Under 6 h of sleep, soreness ≥4 or energy ≤2 pull the day down to at least yellow; under 5 h of sleep makes it red. On yellow, hard blocks show "cap at RPE 8, drop the last set or interval". On red they show `lowRecovery` or a default swap.

## Trick ladder

Computed from kite logs, most recent sessions first: **Consistent** means at least 80% landed over the last 10+ attempts; **Comp-ready** means at least 90% over the last 20+ attempts across 3+ sessions.
