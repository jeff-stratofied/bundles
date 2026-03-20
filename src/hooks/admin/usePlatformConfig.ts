// hooks/admin/usePlatformConfig.ts
// NOTE: Always fetches a fresh SHA immediately before saving to avoid
// GitHub optimistic-lock conflicts (matches the pattern in admin.html saveToBackend()).

import { useState, useEffect } from 'react'

const API_BASE = 'https://bundles-api.jeff-263.workers.dev'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformUser {
  id: string
  name: string
  role: string
  feeWaiver: string
  active?: boolean
}

export interface PlatformFees {
  setupFee: number
  monthlyServicingBps: number
}

export interface PlatformConfig {
  fees: PlatformFees
  users: PlatformUser[]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlatformConfig() {
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null)
  const [sha, setSha] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/platformConfig`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
        const data = await res.json()
        setPlatformConfig({ fees: data.fees, users: data.users })
        setSha(data.sha ?? null)
      } catch (err: any) {
        setError(err.message ?? 'Failed to load platform config')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save ─────────────────────────────────────────────────────────────────
  // Always fetches a fresh SHA immediately before the PUT to avoid conflicts.
  // This is critical — the admin.html code does this explicitly around line 2690.
  async function savePlatformConfig(updated: PlatformConfig): Promise<void> {
    // Step 1: fetch fresh SHA
    let freshSha = sha
    try {
      const freshRes = await fetch(`${API_BASE}/platformConfig`, { cache: 'no-store' })
      if (freshRes.ok) {
        const freshData = await freshRes.json()
        freshSha = freshData.sha ?? freshSha
      }
    } catch {
      // non-fatal — fall back to known sha
      console.warn('[usePlatformConfig] Could not fetch fresh SHA, using cached value')
    }

    // Step 2: save with fresh SHA
    const res = await fetch(`${API_BASE}/platformConfig`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fees: updated.fees,
        users: updated.users,
        sha: freshSha,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        err.message ?? err.error ?? `Platform config save failed: ${res.status}`
      )
    }

    const data = await res.json()
    if (data.sha) setSha(data.sha)
    setPlatformConfig(updated)
  }

  return {
    platformConfig,
    setPlatformConfig,
    sha,
    loading,
    error,
    savePlatformConfig,
  }
}