# Ledger Tactica Backend

Backend API for Ledger Tactica.

## Technology Stack

- Node.js
- Express
- TypeScript

## Responsibilities

- Game data loading
- Rule evaluation
- Validation
- Roster persistence

## Game Catalog API

- `GET /games` returns `{ "games": [...] }`.
- `GET /games/:gameId` returns the game and its factions, units, upgrades, and
  rules.

Game packages are read from the repository's `data/` directory. Invalid or
incomplete package data returns HTTP 500 with validation details; the API does
not return a partial catalog. An unknown game ID returns HTTP 404.

## Roster Persistence API

Rosters are stored as one JSON file per roster under `backend/storage/rosters/`.
The directory is created when the first roster is saved and is ignored by Git.
Set the second `createApp` argument to use another directory in tests or embedding
scenarios.

- `GET /rosters` lists saved rosters.
- `GET /rosters/:rosterId` loads one roster.
- `POST /rosters` creates a roster from a complete roster JSON object.
- `PUT /rosters/:rosterId` replaces an existing roster.
- `DELETE /rosters/:rosterId` deletes a roster.

Roster IDs are restricted to letters, numbers, underscores, and hyphens so they can
be safely used as filenames. `PUT` requires the body ID to match the URL ID.
The route validates roster fields and references against the selected game package
before saving, and validates stored JSON and references when reading. Invalid
requests return HTTP 400, missing rosters return 404, duplicate creates return 409,
and malformed stored data or filesystem errors return HTTP 500 with details.
Storage is intended for a single backend instance on a local filesystem; it does not
provide multi-instance coordination, user accounts, or cloud synchronization.

## Development

Start development server:

```bash
npm run dev
