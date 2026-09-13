# Forma

A personal training and coaching app for one athlete: gravel endurance, unhooked kite freestyle, strength, recovery and health. It installs on an iPhone as a home-screen web app and is coached by Claude through a private data repo.

## How it fits together

- **This repo (public): the app.** Every push to `main` runs the tests, builds, and deploys to GitHub Pages at <https://arnbusmanas-png.github.io/fitnessapp/>. The installed app updates itself the next time it opens.
- **`fitnessapp-data` (private): everything personal.** Profile, weekly plans, coach notes and questions, check-ins, workout sets, kite sessions, benchmarks, lab uploads. The app reads and writes it through the GitHub API with a fine-grained token that lives only on the phone. Claude coaches by reading and writing the same repo; its brief is `COACH.md` there.
- **Ownership split:** the app writes only `logs/` and `health/uploads/`; the coach writes everything else. Sync never has to merge content.

## Install on iPhone

1. Open <https://arnbusmanas-png.github.io/fitnessapp/> in Safari → Share → **Add to Home Screen**.
2. Open Forma from the Home Screen → Today → **Connect your data repo**.
3. Create the token (Settings explains it): GitHub → Settings → Fine-grained tokens → only `fitnessapp-data` → Contents: read and write. Paste it into the app.

Reminders: iOS doesn't let home-screen web apps send notifications without a push server, so Settings shows how to set up Shortcuts automations, or you can add `reminders.ics` to Calendar in one tap.

## Screens

- **Today:** readiness from the morning check-in, coach note, pinned coach questions, the day's plan around the fixed schedule, evening check-in.
- **Train:** calendar, the week's focus, every session with looping exercise photos, set-by-set logging (kg, reps, RPE) pre-filled from last time, rest timer, PR detection, Zwift sessions with interval profile and fuel plan.
- **Kite:** trick ladder (Learning → First land → 50%+ → Consistent → Comp-ready) from post-session tap counters, crash log.
- **Progress:** FTP, weight trend, W/kg, report card, recovery and sleep, benchmarks, top lifts, labs with reference and optimal ranges, supplement stack, cramp log.

## Iterating

Describe the change in an issue or ask Claude Code (desktop, web or phone) to make it. Push to `main` and it's live in about a minute.

## Develop

```bash
npm install
npm run dev      # serves ../fitnessapp-data locally, no token needed
npm test
npm run build
```

- `npm run exercises` rebuilds `public/exercises.json` from free-exercise-db plus `scripts/custom-exercises.json`.
- `npm run icons` renders the PNG icons from `public/icon.svg` (macOS).
- Data format: [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md) and `src/types.ts`.

Exercise photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense).
