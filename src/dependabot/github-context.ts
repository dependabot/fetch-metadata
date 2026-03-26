import * as github from '@actions/github'

// Re-export the Context type derived from the context singleton.
// @actions/github v9 does not export the Context class directly from its exports map.
export type Context = typeof github.context

// The Context constructor (used in dry-run and tests to create fresh instances)
export const Context = github.context.constructor as new () => Context
