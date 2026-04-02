# Majors Pick'em

A private PWA for 6 friends to play a golf majors pick'em game.

## How it works

Each of the 4 men's majors, all 6 players draft 3 golfers via an async snake draft. Whoever's picks earned the most combined prize money across all 4 majors wins the year.

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and SMTP credentials

npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev   # runs on port 3001
```

### Frontend setup
```bash
cd frontend
npm install
npm run dev   # runs on port 5173, proxies /api to :3001
```

Then open http://localhost:5173 and log in with your ADMIN_EMAIL + ADMIN_PASSWORD from `.env`.

## Admin Workflow (per major)

1. **Add users** — Admin panel → add each of the 6 players with their email. They'll receive a setup link.
2. **Create majors** — The 4 majors for 2026 are seeded automatically. You can add more or edit dates.
3. **Set ESPN Event ID** — Before each major, find the ESPN event ID (see below) and save it.
4. **Sync field** — Pulls the player field from ESPN's API.
5. **Open draft** — Randomizes snake order, draft opens.
6. **Players pick** — Each player sees "IT'S YOUR PICK" on their dashboard when it's their turn.
7. **Sync results** — After the major ends, sync final results/earnings from ESPN.
8. **Mark complete** — Locks the results.

### Finding the ESPN Event ID

Open this URL in your browser:
```
https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard
```
Find the upcoming major in the `events` array and copy its `id` field.

## Deployment (Render)

1. Push to a GitHub repo
2. In Render, create a new Blueprint and connect your repo
3. Render will detect `render.yaml` and create the DB + API + frontend services
4. Add your SMTP credentials manually in the Render dashboard for the `majors-api` service
5. Run the seed: `npx prisma migrate deploy && node prisma/seed.js` via Render Shell
