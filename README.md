# Aura — AI Smart Productivity Assistant

Aura is a unified AI executive assistant that combines email generation, meeting summarization, task planning, and intelligent scheduling into one seamless workspace. Information flows automatically between modules — turn an email into a task, a meeting into a schedule, or a task into a planned day.

![Aura](https://opus-ai-planner.lovable.app/og-image.png)

## Features

- **Smart Email Generator** — Compose, reply, rewrite, shorten, expand, or improve emails in any tone. Aura automatically extracts follow-up tasks from the generated draft.
- **Meeting Notes Summarizer** — Paste notes or transcripts and get key points, decisions, action items, deadlines, and next steps. Action items can be added to the task board in one click.
- **AI Task Planner** — Turn messy notes into structured, prioritized tasks with categories, estimates, and due dates. Manage work on a Kanban-style board.
- **Intelligent Schedule Manager** — Plan your day with AI. Drag tasks onto the calendar, avoid busy blocks, and keep deep work in the right slots.
- **Unified Dashboard** — See a daily snapshot, quick actions, productivity stats, and AI recommendations from your personal Chief of Staff.
- **Cross-Module Flow** — Emails and meetings create tasks; tasks become schedule blocks; everything stays in sync.

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) — full-stack React 19 with SSR and server functions
- **Styling:** Tailwind CSS v4 with custom semantic design tokens
- **AI:** Lovable AI Gateway with structured JSON outputs via Zod
- **Language:** TypeScript
- **Runtime:** Edge-first serverless (Cloudflare Workers)

## Project Structure

```text
src/
  components/app/    # Shell, task cards, theme, shared UI
  lib/               # AI schemas, server functions, store, types
  routes/            # TanStack Router routes (Dashboard, Email, Meetings, Tasks, Schedule)
  routes/__root.tsx  # App shell and layout
  styles.css         # Tailwind v4 theme tokens
```

Key files:

- `src/lib/ai.functions.ts` — TanStack Start server functions for all AI operations
- `src/lib/ai-schemas.ts` — Zod schemas that guarantee structured AI outputs
- `src/lib/store.tsx` — Global state provider with localStorage persistence
- `src/lib/types.ts` — Domain types for tasks, emails, meetings, and action items
- `src/lib/ai-gateway.server.ts` — Secure AI gateway wrapper
- `src/lib/ai-run.server.ts` — Structured-output AI runner

## Getting Started

Make sure you have [Node.js](https://nodejs.org/) and [Bun](https://bun.sh/) or npm installed.

```bash
# Install dependencies
bun install

# Run the dev server
bun run dev
```

The app runs at `http://localhost:8080` by default.

## Building for Production

```bash
bun run build
```

The output is ready for the edge serverless runtime.

## AI Configuration

Aura calls the Lovable AI Gateway from server functions. The gateway key is configured automatically in the Lovable environment; no manual API key is needed when running inside the Lovable platform.

## Data & Privacy

All user data is stored locally in the browser via `localStorage`. Nothing is sent to a backend database or shared with third parties beyond the AI processing request itself.

## Roadmap Ideas

- Cloud sync and multi-device support
- Calendar integrations (Google Calendar, Outlook)
- Team collaboration with shared workspaces
- Voice-to-text meeting capture
- Recurring task automation

## License

MIT — feel free to fork, modify, and ship your own version.

---

Built with [Lovable](https://lovable.dev).
