export type JsonObject = Record<string, unknown>

export interface GameDefinition extends JsonObject {
  id: string
}

export interface GamePackage {
  game: GameDefinition
  factions: JsonObject[]
  units: JsonObject[]
  upgrades: JsonObject[]
  rules: JsonObject[]
}

export class GamePackageError extends Error {
  readonly details: string[]

  constructor(
    message: string,
    details: string[] = [],
  ) {
    super(message)
    this.name = "GamePackageError"
    this.details = details
  }
}
