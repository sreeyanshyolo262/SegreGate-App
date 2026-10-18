# SegreGate: Resident app

Tauri 2 + React + TypeScript + Tailwind v4.

```bash
npm install
npm run tauri dev      # desktop window (phone-sized)
npm run dev            # browser only, http://localhost:1420
```

Optional: set `VITE_API_URL` (e.g. the deployed Groq classifier) to use the LLM instead of the built-in rule table.

## Screens
Home (score, streak, impact, pickup, notices) · Scan (camera + item lookup) · Ask (chat) · Ranks (flat / block / society) · Me (badges, rewards)

## Status
UI uses mock data in `src/data.ts`. Next: backend API (auth, multi-society), image classifier, RAG chat.
