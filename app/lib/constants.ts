import type { ApplicationBoard } from '~/types/resume'

/**
 * Shared constants used across store, API routes, and components.
 */

export const EMPTY_APPLICATIONS: ApplicationBoard = {
  bookmark: [],
  applied: [],
  interviewing: [],
  offers: [],
  rejected: [],
}

/**
 * Maximum payload size for AI-bound resume JSON (after stringification).
 * Prevents memory exhaustion from oversized payloads.
 */
export const MAX_RESUME_JSON_BYTES = 200_000 // 200KB


