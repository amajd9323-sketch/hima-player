# Hima Player (مشغل هيما)
## Dev
npm install && npm run dev
## AI
cd worker && npx wrangler secret put ANTHROPIC_API_KEY && npx wrangler deploy
GitHub repo → Settings → Variables → `VITE_AI_URL` = worker URL.
## APK
git push → Actions → artifact `Hima-Player`. Tag `v1.0.0` → APK in Releases.
## Limits
- Background play with screen off: needs native foreground service plugin (next step).
- Playlist not persisted yet.
