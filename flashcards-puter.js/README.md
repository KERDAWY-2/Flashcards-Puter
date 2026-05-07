# Flashcards (Puter.js)

A minimalist single-page flashcards app. Create decks by hand or generate them with AI, then study with a flip-card UI. Decks are saved to your Puter account, so they follow you across devices without a backend of your own.

## Features

- Create decks manually or with AI
- Study mode with flip animation, shuffle, and keyboard shortcuts
- Decks persisted to Puter key-value storage
- Responsive, app-like layout for mobile and desktop
- Light and dark color tokens built into the theme

## Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- shadcn/ui primitives (Radix UI)
- Lucide Icons
- Puter.js (loaded from the v2 CDN)

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

To create a production build:

```bash
npm run build
npm start
```

The first time you create or load a deck, Puter will prompt you to sign in. Authentication is handled entirely by Puter.js, so no API keys or environment variables are required.

## Project layout

```
app/
  layout.tsx       Root layout, loads Puter.js from the CDN
  page.tsx         Main view: deck list, study mode, create dialog
  globals.css      Tailwind + shadcn theme tokens + flip-card animation
components/
  create-deck-dialog.tsx
  study-mode.tsx
  ui/              shadcn primitives (Button, Card, Dialog, Tabs, ...)
lib/
  puter.ts         Wrappers around puter.ai.chat and puter.kv
  types.ts         Deck and Flashcard types
  utils.ts         cn() helper
```

## Keyboard shortcuts (study mode)

- Space or Enter: flip the current card
- Arrow Right: next card
- Arrow Left: previous card
- Escape: exit study mode

## License

MIT. See [LICENSE](LICENSE).

## Built with Puter.js

This app is built with [Puter.js](https://puter.com), a serverless JavaScript SDK that provides cloud storage, key-value databases, and access to 500+ AI models without requiring any backend. The app uses `puter.ai.chat` to generate flashcard sets from a topic and `puter.kv` to persist decks to the user's Puter account.

Full documentation: [https://docs.puter.com](https://docs.puter.com).
