# Nudge

A writing companion that asks questions, not answers.

Nudge reads your world — characters, lore, themes — then asks the questions that unlock your best work. It never writes for you. The words are always yours.

## What it does

- **The Well** — Organize your world in folders (characters, lore, setting, themes). Every note becomes context your AI companion draws from.
- **The Draft** — A distraction-free editor for your prose, invisible to the AI. Your writing stays sacred.
- **The Conversation** — Chat with an AI that has read your entire Well and brings that knowledge to every exchange.

Templates are available for Fantasy Novel, Literary Fiction, Mystery & Thriller, Essay & Nonfiction, and Tabletop RPG — or start from a blank slate.

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **CodeMirror 6** for the prose editor
- **Claude** (Anthropic SDK) for the AI companion
- **NextAuth v5** for authentication
- **PostgreSQL** (`pg`) for persistence
- **Resend** for transactional email
- **Paddle** for billing
- **Zustand** for client state

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in the required values (database URL, Anthropic API key, NextAuth secret, Resend API key, Paddle credentials).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
