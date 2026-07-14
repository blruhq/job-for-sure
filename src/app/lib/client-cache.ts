// ═══════════════════════════════════════════════════════════════
// CLIENT CACHE — localStorage for job cards + IndexedDB for JDs
//
// Tier 1 of the three-tier cache: localStorage (instant, per-user)
// Tier 2: Redis (server, shared) — handled by API
// Tier 3: Live scrape — handled by API
//
// Cards go in localStorage (small, ~500B each, ~65 searches fit in 5MB)
// Full JDs go in IndexedDB (larger, ~2-5KB each, ~50MB budget)
// ═══════════════════════════════════════════════════════════════

import type { ScoredJob } from './job-sources/types'

// ── localStorage: Job Cards ──────────────────────────────────

const CARDS_PREFIX = 'jfs_cards_'
const CARDS_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const MAX_ENTRIES = 50 // LRU cap
const STORAGE_BUDGET = 4 * 1024 * 1024 // 4MB — leave room for other localStorage

interface CachedSearch {
  jobs: ScoredJob[]
  total: number
  descriptionsIncluded: boolean
  timestamp: number
}

/** Get cached search results from localStorage (null if expired or missing) */
export function getCards(query: string, location: string, resumeId: string): CachedSearch | null {
  try {
    const key = buildKey(query, location, resumeId)
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const data = JSON.parse(raw) as CachedSearch
    if (Date.now() - data.timestamp > CARDS_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }

    // Touch the key for LRU (re-set with same value updates position)
    // We track access order via a separate meta key
    touchLRU(key)

    return data
  } catch {
    return null
  }
}

/** Save search results to localStorage with timestamp */
export function setCards(
  query: string,
  location: string,
  resumeId: string,
  data: { jobs: ScoredJob[]; total: number; descriptionsIncluded?: boolean },
): void {
  try {
    const key = buildKey(query, location, resumeId)
    const payload: CachedSearch = {
      jobs: data.jobs,
      total: data.total,
      descriptionsIncluded: data.descriptionsIncluded ?? true,
      timestamp: Date.now(),
    }

    // Check storage budget — evict old entries if needed
    evictIfNeeded()

    localStorage.setItem(key, JSON.stringify(payload))
    touchLRU(key)
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

/** Check if we have a cached search (even if stale, for instant load + refresh) */
export function hasCards(query: string, location: string, resumeId: string): boolean {
  try {
    const key = buildKey(query, location, resumeId)
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

// ── LRU Eviction ─────────────────────────────────────────────

const LRU_KEY = 'jfs_lru_order'

function touchLRU(key: string): void {
  try {
    const raw = localStorage.getItem(LRU_KEY)
    const order: string[] = raw ? JSON.parse(raw) : []
    const filtered = order.filter(k => k !== key)
    filtered.push(key)
    // Trim to max entries
    const trimmed = filtered.slice(-MAX_ENTRIES)
    // If we removed entries, delete their data
    const removed = filtered.slice(0, -MAX_ENTRIES)
    for (const r of removed) {
      localStorage.removeItem(r)
    }
    localStorage.setItem(LRU_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore
  }
}

function evictIfNeeded(): void {
  try {
    // Rough estimate: if localStorage usage is > 4MB, evict oldest entries
    const raw = localStorage.getItem(LRU_KEY)
    if (!raw) return

    const order: string[] = JSON.parse(raw)
    let totalSize = 0

    // Estimate current usage of our entries
    for (const key of order) {
      const val = localStorage.getItem(key)
      if (val) totalSize += val.length * 2 // UTF-16 chars
    }

    // Evict oldest entries until under budget
    while (totalSize > STORAGE_BUDGET && order.length > 5) {
      const oldest = order.shift()
      if (!oldest) break
      const val = localStorage.getItem(oldest)
      if (val) totalSize -= val.length * 2
      localStorage.removeItem(oldest)
    }

    localStorage.setItem(LRU_KEY, JSON.stringify(order))
  } catch {
    // ignore
  }
}

// ── IndexedDB: Job Descriptions ──────────────────────────────

const DB_NAME = 'jfs_job_descriptions'
const DB_VERSION = 1
const STORE_NAME = 'descriptions'

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/** Get a cached JD from IndexedDB */
export async function getJD(jobId: string): Promise<string | null> {
  try {
    const db = await openDB()
    if (!db) return null

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(jobId)
      req.onsuccess = () => {
        const result = req.result as { description: string; timestamp: number } | undefined
        if (result && Date.now() - result.timestamp < CARDS_TTL_MS) {
          resolve(result.description)
        } else {
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/** Save a JD to IndexedDB */
export async function setJD(jobId: string, description: string): Promise<void> {
  try {
    const db = await openDB()
    if (!db) return

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ description, timestamp: Date.now() }, jobId)
  } catch {
    // ignore
  }
}

// ── Helpers ──────────────────────────────────────────────────

function buildKey(query: string, location: string, resumeId: string): string {
  return `${CARDS_PREFIX}${resumeId}_${query.toLowerCase().trim()}_${location.toLowerCase().trim()}`
}
