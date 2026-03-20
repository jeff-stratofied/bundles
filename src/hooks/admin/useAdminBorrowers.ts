// hooks/admin/useAdminBorrowers.ts

import { useState, useEffect } from 'react'

const API_BASE = 'https://bundles-api.jeff-263.workers.dev'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminBorrower {
  borrowerId: string
  borrowerName?: string
  borrowerFico: number | null
  cosignerFico: number | null
  yearInSchool: string | number | null   // may be numeric (1-5) or letter (A-D,Z)
  degreeType: string | null
  isGraduateStudent?: boolean
  school?: string
  opeid?: string
  schoolTier?: string | null
  [key: string]: any                     // allow legacy fields through
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminBorrowers() {
  const [borrowers, setBorrowers] = useState<AdminBorrower[]>([])
  const [sha, setSha] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/borrowers`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
        const data = await res.json()

        const arr: AdminBorrower[] = Array.isArray(data)
          ? data
          : Array.isArray(data.borrowers)
          ? data.borrowers
          : []

        setBorrowers(arr)
        setSha(data.sha ?? null)
      } catch (err: any) {
        setError(err.message ?? 'Failed to load borrowers')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save all borrowers ───────────────────────────────────────────────────
  async function saveBorrowers(updated: AdminBorrower[]): Promise<void> {
    const res = await fetch(`${API_BASE}/borrowers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ borrowers: updated, sha }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Borrowers save failed: ${res.status} ${text}`)
    }
    const data = await res.json()
    if (data.sha) setSha(data.sha)
    setBorrowers(updated)
  }

  // ── Upsert a single borrower in local state (no round-trip) ─────────────
  // Caller must still call saveBorrowers(borrowers) to persist.
  function upsertBorrower(borrower: AdminBorrower): void {
    setBorrowers(prev => {
      const idx = prev.findIndex(b => b.borrowerId === borrower.borrowerId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = borrower
        return next
      }
      return [...prev, borrower]
    })
  }

  // ── Ensure a skeleton record exists for a given borrowerId ───────────────
  // Mirrors ensureBorrowerExists() in borrowerStore.js.
  // Returns the existing or newly-created borrower.
  function ensureBorrower(borrowerId: string, loanName = ''): AdminBorrower {
    const existing = borrowers.find(b => b.borrowerId === borrowerId)
    if (existing) return existing

    const skeleton: AdminBorrower = {
      borrowerId,
      borrowerName: loanName || borrowerId,
      borrowerFico: null,
      cosignerFico: null,
      yearInSchool: null,
      degreeType: null,
      isGraduateStudent: false,
      school: '',
      schoolTier: null,
    }
    setBorrowers(prev => [...prev, skeleton])
    return skeleton
  }

  // ── Convenience lookup ───────────────────────────────────────────────────
  function getBorrower(borrowerId: string): AdminBorrower | undefined {
    return borrowers.find(b => b.borrowerId === borrowerId)
  }

  return {
    borrowers,
    setBorrowers,
    sha,
    loading,
    error,
    saveBorrowers,
    upsertBorrower,
    ensureBorrower,
    getBorrower,
  }
}