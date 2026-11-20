import type { Roster, RosterEntry } from "../types/roster.ts"
import type {
  PointsTotal,
  RosterValidationErrorCode,
  RosterValidationReport,
  RosterValidationResult,
  RuleValidationResult,
  ValidationCatalog,
  ValidationRuleDefinition,
  ValidationUpgrade,
} from "../types/validation.ts"

type TaggedSelection =
  | { kind: "unit"; id: string; tags: readonly string[] }
  | { kind: "upgrade"; id: string; tags: readonly string[] }

const ruleTypes = new Set([
  "minimum-tag-count",
  "maximum-tag-count",
  "required-tag",
  "prohibited-tag",
  "points-limit",
  "unlock-condition",
  "maximum-duplicates",
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0

const success = (value: RosterValidationReport): RosterValidationResult => ({
  ok: true,
  value,
})

const fail = (
  code: RosterValidationErrorCode,
  message: string,
): RosterValidationResult => ({
  ok: false,
  error: { code, message },
})

const getById = <T extends { id: string }>(
  definitions: readonly T[],
  id: string,
): T | undefined => definitions.find((definition) => definition.id === id)

const getMessage = (
  rule: ValidationRuleDefinition,
  defaultMessage: string,
): string =>
  isNonEmptyString(rule.message) ? rule.message : defaultMessage

const hasTag = (tags: readonly string[] | undefined, tag: string): boolean =>
  tags?.includes(tag) ?? false

const getSelectedUpgrades = (
  entry: RosterEntry,
  upgrades: readonly ValidationUpgrade[],
): TaggedSelection[] =>
  entry.selectedUpgrades.flatMap((selection) => {
    const upgrade = getById(upgrades, selection.upgradeId)
    return upgrade
      ? [{
          kind: "upgrade" as const,
          id: upgrade.id,
          tags: upgrade.tags ?? [],
        }]
      : []
  })

const getTaggedSelectionsForEntry = (
  entry: RosterEntry,
  catalog: ValidationCatalog,
): TaggedSelection[] => {
  const unit = getById(catalog.units, entry.unitId)
  if (!unit) {
    return []
  }
  return [
    { kind: "unit", id: unit.id, tags: unit.tags },
    ...getSelectedUpgrades(entry, catalog.upgrades),
  ]
}

const validateCatalog = (
  catalog: ValidationCatalog,
): RosterValidationResult | undefined => {
  if (
    !isRecord(catalog) ||
    !isNonEmptyString(catalog.gameId) ||
    !Array.isArray(catalog.factions) ||
    !Array.isArray(catalog.units) ||
    !Array.isArray(catalog.upgrades) ||
    !Array.isArray(catalog.rules)
  ) {
    return fail("invalid-catalog", "Validation catalog is missing required collections")
  }

  const collections = [
    { name: "Faction", definitions: catalog.factions },
    { name: "Unit", definitions: catalog.units },
    { name: "Upgrade", definitions: catalog.upgrades },
    { name: "Rule", definitions: catalog.rules },
  ]
  for (const { name, definitions } of collections) {
    const ids = new Set<string>()
    for (const definition of definitions) {
      if (!isRecord(definition) || !isNonEmptyString(definition.id)) {
        return fail("invalid-catalog", `${name} definition has an invalid ID`)
      }
      if (ids.has(definition.id)) {
        return fail(
          "invalid-catalog",
          `${name} ID "${definition.id}" has multiple definitions`,
        )
      }
      ids.add(definition.id)
    }
  }

  for (const faction of catalog.factions) {
    if (
      faction.gameId !== catalog.gameId ||
      !isNonEmptyString(faction.name) ||
      typeof faction.supported !== "boolean" ||
      (faction.tags !== undefined &&
        (!Array.isArray(faction.tags) ||
          !faction.tags.every(isNonEmptyString)))
    ) {
      return fail(
        "invalid-catalog",
        `Faction "${faction.id}" has invalid catalog data`,
      )
    }
  }

  for (const unit of catalog.units) {
    if (
      !isNonEmptyString(unit.factionId) ||
      !isNonEmptyString(unit.name) ||
      !getById(catalog.factions, unit.factionId) ||
      typeof unit.supported !== "boolean" ||
      !Number.isInteger(unit.minSize) ||
      unit.minSize <= 0 ||
      !Number.isInteger(unit.maxSize) ||
      unit.maxSize < unit.minSize ||
      !Array.isArray(unit.tags) ||
      unit.tags.length === 0 ||
      !unit.tags.every(isNonEmptyString) ||
      (unit.availableUpgrades !== undefined &&
        !Array.isArray(unit.availableUpgrades))
    ) {
      return fail("invalid-catalog", `Unit "${unit.id}" has invalid catalog data`)
    }

    const availableIds = new Set<string>()
    for (const available of unit.availableUpgrades ?? []) {
      if (
        !isRecord(available) ||
        !isNonEmptyString(available.upgradeId) ||
        !getById(catalog.upgrades, available.upgradeId) ||
        availableIds.has(available.upgradeId) ||
        !isNonNegativeInteger(available.min ?? 0) ||
        !isNonNegativeInteger(available.max ?? 1) ||
        (available.max ?? 1) < (available.min ?? 0)
      ) {
        return fail(
          "invalid-catalog",
          `Unit "${unit.id}" has invalid available Upgrade data`,
        )
      }
      availableIds.add(available.upgradeId)
    }
  }

  for (const upgrade of catalog.upgrades) {
    if (
      !isNonEmptyString(upgrade.name) ||
      typeof upgrade.supported !== "boolean" ||
      (upgrade.tags !== undefined &&
        (!Array.isArray(upgrade.tags) ||
          !upgrade.tags.every(isNonEmptyString)))
    ) {
      return fail(
        "invalid-catalog",
        `Upgrade "${upgrade.id}" has invalid catalog data`,
      )
    }
  }

  for (const rule of catalog.rules) {
    if (!isNonEmptyString(rule.type)) {
      return fail("invalid-rule", `Rule "${rule.id}" has an invalid type`)
    }
  }
}

const validateRosterSelections = (
  roster: Roster,
  catalog: ValidationCatalog,
): RosterValidationResult | undefined => {
  if (
    !isRecord(roster) ||
    !isNonEmptyString(roster.id) ||
    !isNonEmptyString(roster.gameId) ||
    !isNonEmptyString(roster.factionId) ||
    !Number.isFinite(roster.pointsLimit) ||
    roster.pointsLimit <= 0 ||
    !Array.isArray(roster.rosterEntries)
  ) {
    return fail("invalid-roster", "Roster has invalid required fields")
  }

  if (roster.gameId !== catalog.gameId) {
    return fail(
      "game-mismatch",
      `Roster game "${roster.gameId}" does not match catalog "${catalog.gameId}"`,
    )
  }

  const faction = getById(catalog.factions, roster.factionId)
  if (!faction) {
    return fail(
      "faction-not-found",
      `Faction "${roster.factionId}" does not exist in Game "${roster.gameId}"`,
    )
  }
  if (!faction.supported) {
    return fail(
      "faction-not-eligible",
      `Faction "${faction.id}" is not supported`,
    )
  }

  const entryIds = new Set<string>()
  for (const entry of roster.rosterEntries) {
    if (
      !isRecord(entry) ||
      !isNonEmptyString(entry.id) ||
      entryIds.has(entry.id) ||
      !isNonEmptyString(entry.unitId) ||
      !Number.isInteger(entry.quantity) ||
      entry.quantity <= 0 ||
      !Array.isArray(entry.selectedUpgrades)
    ) {
      return fail(
        "invalid-roster",
        "Roster contains an invalid or duplicate entry",
      )
    }
    entryIds.add(entry.id)

    const unit = getById(catalog.units, entry.unitId)
    if (!unit) {
      return fail("unit-not-found", `Unit "${entry.unitId}" does not exist`)
    }
    if (!unit.supported || unit.factionId !== roster.factionId) {
      return fail(
        "unit-not-eligible",
        `Unit "${unit.id}" is not eligible for faction "${roster.factionId}"`,
      )
    }
    if (
      !Number.isInteger(unit.minSize) ||
      !Number.isInteger(unit.maxSize) ||
      entry.quantity < unit.minSize ||
      entry.quantity > unit.maxSize
    ) {
      return fail(
        "invalid-roster",
        `Unit "${unit.id}" quantity must be between ${unit.minSize} and ${unit.maxSize}`,
      )
    }

    const availableById = new Map(
      (unit.availableUpgrades ?? []).map((available) => [
        available.upgradeId,
        available,
      ]),
    )
    if (availableById.size !== (unit.availableUpgrades ?? []).length) {
      return fail(
        "invalid-catalog",
        `Unit "${unit.id}" has duplicate available Upgrade IDs`,
      )
    }

    const selectedIds = new Set<string>()
    for (const selection of entry.selectedUpgrades) {
      if (
        !isRecord(selection) ||
        !isNonEmptyString(selection.upgradeId) ||
        !Number.isInteger(selection.quantity) ||
        selection.quantity <= 0 ||
        selectedIds.has(selection.upgradeId)
      ) {
        return fail(
          "invalid-upgrade-selection",
          `Roster entry "${entry.id}" has an invalid or duplicate Upgrade selection`,
        )
      }
      selectedIds.add(selection.upgradeId)

      const upgrade = getById(catalog.upgrades, selection.upgradeId)
      if (!upgrade) {
        return fail(
          "upgrade-not-found",
          `Upgrade "${selection.upgradeId}" does not exist`,
        )
      }
      if (!upgrade.supported) {
        return fail(
          "upgrade-not-available",
          `Upgrade "${upgrade.id}" is not supported`,
        )
      }

      const availability = availableById.get(selection.upgradeId)
      if (!availability) {
        return fail(
          "upgrade-not-available",
          `Upgrade "${selection.upgradeId}" is not available to Unit "${unit.id}"`,
        )
      }
      const min = availability.min ?? 0
      const max = availability.max ?? 1
      if (
        !isNonNegativeInteger(min) ||
        !isNonNegativeInteger(max) ||
        max < min ||
        selection.quantity < min ||
        selection.quantity > max
      ) {
        return fail(
          "invalid-upgrade-selection",
          `Upgrade "${selection.upgradeId}" quantity must be between ${min} and ${max}`,
        )
      }
    }

    for (const available of unit.availableUpgrades ?? []) {
      const min = available.min ?? 0
      if (!isNonNegativeInteger(min)) {
        return fail(
          "invalid-catalog",
          `Unit "${unit.id}" has an invalid minimum for Upgrade "${available.upgradeId}"`,
        )
      }
      if (!selectedIds.has(available.upgradeId) && min > 0) {
        return fail(
          "invalid-upgrade-selection",
          `Roster entry "${entry.id}" is missing required Upgrade "${available.upgradeId}"`,
        )
      }
    }
  }
}

const makeTaggedSelections = (
  roster: Roster,
  catalog: ValidationCatalog,
): TaggedSelection[] =>
  roster.rosterEntries.flatMap((entry) =>
    getTaggedSelectionsForEntry(entry, catalog),
  )

const getScope = (
  rule: ValidationRuleDefinition,
  allowed: readonly string[],
): string | undefined => {
  const scope = rule.scope ?? "roster"
  return typeof scope === "string" && allowed.includes(scope)
    ? scope
    : undefined
}

const getTargetSelections = (
  rule: ValidationRuleDefinition,
  selections: readonly TaggedSelection[],
): TaggedSelection[] => {
  if (rule.unitId !== undefined && rule.upgradeId !== undefined) {
    return []
  }
  if (rule.unitId !== undefined) {
    return selections.filter(
      (selection) =>
        selection.kind === "unit" && selection.id === rule.unitId,
    )
  }
  if (rule.upgradeId !== undefined) {
    return selections.filter(
      (selection) =>
        selection.kind === "upgrade" && selection.id === rule.upgradeId,
    )
  }
  return [...selections]
}

const evaluateRule = (
  rule: ValidationRuleDefinition,
  roster: Roster,
  catalog: ValidationCatalog,
  selections: readonly TaggedSelection[],
  pointsTotal: number,
): RuleValidationResult | undefined => {
  if (!ruleTypes.has(rule.type)) {
    return {
      ruleId: rule.id,
      valid: false,
      message: `Rule type "${rule.type}" is not supported`,
      code: "unsupported-rule",
    }
  }

  const tag = rule.tag
  if (rule.type === "minimum-tag-count" || rule.type === "maximum-tag-count") {
    if (
      !isNonEmptyString(tag) ||
      !isNonNegativeInteger(rule.value) ||
      rule.upgradeId !== undefined ||
      !getScope(rule, ["roster"])
    ) {
      return undefined
    }
    if (rule.unitId !== undefined && !isNonEmptyString(rule.unitId)) {
      return undefined
    }

    const count = roster.rosterEntries.filter((entry) => {
      if (rule.unitId !== undefined && entry.unitId !== rule.unitId) {
        return false
      }
      const unit = getById(catalog.units, entry.unitId)
      return hasTag(unit?.tags, tag)
    }).length
    const valid =
      rule.type === "minimum-tag-count"
        ? count >= rule.value
        : count <= rule.value
    const threshold =
      rule.type === "minimum-tag-count"
        ? `minimum is ${rule.value}`
        : `maximum is ${rule.value}`
    const entryLabel = count === 1 ? "entry" : "entries"
    return {
      ruleId: rule.id,
      valid,
      message: valid
        ? `Found ${count} roster ${entryLabel} tagged "${tag}"; ${threshold}.`
        : getMessage(
              rule,
              `Found ${count} roster ${entryLabel} tagged "${tag}"; ${threshold}.`,
          ),
    }
  }

  if (rule.type === "required-tag" || rule.type === "prohibited-tag") {
    const scope = getScope(rule, ["roster", "faction"])
    if (
      !isNonEmptyString(tag) ||
      !scope ||
      (rule.unitId !== undefined && rule.upgradeId !== undefined) ||
      (scope === "faction" &&
        (rule.unitId !== undefined || rule.upgradeId !== undefined)) ||
      (rule.unitId !== undefined && !isNonEmptyString(rule.unitId)) ||
      (rule.upgradeId !== undefined && !isNonEmptyString(rule.upgradeId))
    ) {
      return undefined
    }

    const targets = getTargetSelections(rule, selections)
    const matches =
      scope === "faction"
        ? hasTag(
            getById(catalog.factions, roster.factionId)?.tags,
            tag,
          )
        : targets.some((selection) => hasTag(selection.tags, tag))
    const valid =
      rule.type === "required-tag" ? matches : !matches
    const defaultMessage =
      rule.type === "required-tag"
        ? `A selected ${scope === "faction" ? "faction" : "Unit or Upgrade"} tagged "${tag}" is required.`
        : `The tag "${tag}" is not permitted in this roster.`
    const successMessage =
      rule.type === "required-tag"
        ? `Required tag "${tag}" is present in the selected ${scope === "faction" ? "Faction" : "roster"}.`
        : scope === "faction"
          ? `The selected Faction does not have prohibited tag "${tag}".`
          : `No selected Unit or Upgrade has prohibited tag "${tag}".`
    return {
      ruleId: rule.id,
      valid,
      message: valid ? successMessage : getMessage(rule, defaultMessage),
    }
  }

  if (rule.type === "maximum-duplicates") {
    if (
      !isNonNegativeInteger(rule.value) ||
      (rule.unitId !== undefined && rule.tag !== undefined) ||
      rule.upgradeId !== undefined ||
      (rule.unitId === undefined && !isNonEmptyString(rule.tag)) ||
      !getScope(rule, ["roster"])
    ) {
      return undefined
    }
    const count = roster.rosterEntries.filter((entry) =>
      rule.unitId !== undefined
        ? entry.unitId === rule.unitId
        : hasTag(getById(catalog.units, entry.unitId)?.tags, String(rule.tag)),
    ).length
    const valid = count <= rule.value
    const target =
      rule.unitId !== undefined
        ? `Unit "${rule.unitId}"`
        : `Units tagged "${String(rule.tag)}"`
    const entryLabel = count === 1 ? "entry" : "entries"
    return {
      ruleId: rule.id,
      valid,
      message: valid
        ? `Found ${count} ${entryLabel} for ${target}; maximum is ${rule.value}.`
        : getMessage(
            rule,
            `Found ${count} ${entryLabel} for ${target}; maximum is ${rule.value}.`,
          ),
    }
  }

  if (rule.type === "points-limit") {
    if (
      typeof rule.value !== "number" ||
      !Number.isFinite(rule.value) ||
      rule.value < 0 ||
      rule.tag !== undefined ||
      rule.unitId !== undefined ||
      rule.upgradeId !== undefined ||
      !getScope(rule, ["roster"])
    ) {
      return undefined
    }
    const limit = Math.min(roster.pointsLimit, rule.value)
    const valid = pointsTotal <= limit
    return {
      ruleId: rule.id,
      valid,
      message: valid
        ? `Roster total ${pointsTotal} is within applicable limit ${limit} (roster limit ${roster.pointsLimit}, rule limit ${rule.value}).`
        : getMessage(
            rule,
            `Roster total ${pointsTotal} exceeds the applicable limit of ${limit} (roster limit ${roster.pointsLimit}, rule limit ${rule.value}).`,
          ),
    }
  }

  if (rule.type === "unlock-condition") {
    const scope = getScope(rule, ["roster", "entry", "faction"])
    const sourceTag = rule.sourceTag
    const targetTag = rule.targetTag
    if (
      !isNonEmptyString(sourceTag) ||
      !isNonEmptyString(targetTag) ||
      !scope ||
      (rule.unitId !== undefined && !isNonEmptyString(rule.unitId)) ||
      (rule.upgradeId !== undefined && !isNonEmptyString(rule.upgradeId))
    ) {
      return undefined
    }

    const isTargetSelection = (selection: TaggedSelection) =>
      hasTag(selection.tags, targetTag) &&
      (rule.upgradeId === undefined ||
        (selection.kind === "upgrade" && selection.id === rule.upgradeId))
    const targetSelections = selections.filter(
      isTargetSelection,
    )
    const hasSourceForEntry = (entry: RosterEntry): boolean => {
      const unit = getById(catalog.units, entry.unitId)
      return (
        (rule.unitId === undefined || unit?.id === rule.unitId) &&
        hasTag(unit?.tags, sourceTag)
      )
    }
    let valid: boolean
    if (scope === "faction") {
      valid =
        targetSelections.length === 0 ||
        hasTag(
          getById(catalog.factions, roster.factionId)?.tags,
          sourceTag,
        )
    } else if (scope === "entry") {
      valid = roster.rosterEntries.every((entry) => {
        const selectedTargets = getTaggedSelectionsForEntry(entry, catalog)
          .filter(isTargetSelection)
        return selectedTargets.length === 0 || hasSourceForEntry(entry)
      })
    } else {
      valid =
        targetSelections.length === 0 ||
        roster.rosterEntries.some(hasSourceForEntry)
    }
    const successMessage =
      targetSelections.length === 0
        ? `No selected entity or option has target tag "${targetTag}".`
        : `Selected targets tagged "${targetTag}" have the required source tag "${sourceTag}" in ${scope} scope.`
    return {
      ruleId: rule.id,
      valid,
      message: valid
        ? successMessage
        : getMessage(
            rule,
            `Upgrade tagged "${targetTag}" requires a selected source tagged "${sourceTag}".`,
          ),
    }
  }

  return undefined
}

export const validateRoster = (
  roster: Roster,
  catalog: ValidationCatalog,
  pointsCalculation: PointsTotal,
): RosterValidationResult => {
  if (!isRecord(pointsCalculation)) {
    return fail(
      "points-calculation-failed",
      "Points calculation returned an invalid result",
    )
  }
  if (!pointsCalculation.ok) {
    return fail(
      "points-calculation-failed",
      `Roster points could not be calculated: ${pointsCalculation.error.message}`,
    )
  }
  if (
    !Number.isFinite(pointsCalculation.value) ||
    pointsCalculation.value < 0
  ) {
    return fail(
      "points-calculation-failed",
      "Points calculation returned an invalid total",
    )
  }

  const catalogError = validateCatalog(catalog)
  if (catalogError) {
    return catalogError
  }
  const rosterError = validateRosterSelections(roster, catalog)
  if (rosterError) {
    return rosterError
  }

  const ruleIds = new Set<string>()
  for (const rule of catalog.rules) {
    if (!isNonEmptyString(rule.id) || ruleIds.has(rule.id)) {
      return fail("invalid-rule", "Game rules must have unique, non-empty IDs")
    }
    ruleIds.add(rule.id)
    if (rule.unitId !== undefined) {
      if (!isNonEmptyString(rule.unitId) || !getById(catalog.units, rule.unitId)) {
        return fail(
          "invalid-rule",
          `Rule "${rule.id}" references missing Unit "${String(rule.unitId)}"`,
        )
      }
    }
    if (rule.upgradeId !== undefined) {
      if (
        !isNonEmptyString(rule.upgradeId) ||
        !getById(catalog.upgrades, rule.upgradeId)
      ) {
        return fail(
          "invalid-rule",
          `Rule "${rule.id}" references missing Upgrade "${String(rule.upgradeId)}"`,
        )
      }
    }
  }

  const selections = makeTaggedSelections(roster, catalog)
  const results: RuleValidationResult[] = []
  for (const rule of catalog.rules) {
    const result = evaluateRule(
      rule,
      roster,
      catalog,
      selections,
      pointsCalculation.value,
    )
    if (!result) {
      return fail(
        "invalid-rule",
        `Rule "${rule.id}" has invalid fields for type "${rule.type}"`,
      )
    }
    results.push(result)
  }

  return success({
    valid: results.every((result) => result.valid),
    results,
  })
}
