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

## Development

Start development server:

```bash
npm run dev
