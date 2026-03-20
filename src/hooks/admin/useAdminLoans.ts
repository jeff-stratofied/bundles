// hooks/admin/useAdminLoans.ts
// Admin-only loans hook — ALL loans, no userId filter, no valuation enrichment.
// Do NOT modify useLoans.ts — this is a parallel hook for the admin page only.

import { useState, useEffect } from 'react'
import { normalizeOwnership } from '../../utils/ownershipEngine'

const API_BASE = 'https://bundles-api.jeff-263.workers.dev'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminOwnershipLot {
  user: string
  pct: number            // decimal 0–1
  purchaseDate: string
  pricePaid?: number
}

export interface AdminLoanEvent {
  id: string
  type: 'prepayment' | 'deferral' | 'default'
  date?: string
  amount?: number
  startDate?: string
  months?: number
  recoveryAmount?: number
}

export interface AdminLoan {
  loanId: string
  borrowerId: string
  loanName: string
  school: string
  loanStartDate: string
  principal: number
  nominalRate: number          // stored as decimal (0.085 = 8.5%)
  termYears: number
  graceYears: number
  loanStatus: string
  feeWaiver: 'none' | 'setup' | 'grace' | 'all'
  events: AdminLoanEvent[]
  ownershipLots: AdminOwnershipLot[]
  ownership?: { unit?: string; step?: number; allocations: { user: string; percent: number }[] }
  // legacy fields — stripped on save
  user?: string
  purchaseDate?: string
  purchasePrice?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateLoanId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

function normalizeDate(d: string): string {
  if (!d) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  // Handle YYYYMMDD
  if (/^\d{8}$/.test(d)) return d.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')
  // Handle MM/DD/YYYY
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, mm, dd, yyyy] = m
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  return d
}

function normalizeAdminLoan(raw: any): AdminLoan {
  // ID: replace pure-numeric legacy IDs
  let loanId = String(raw.loanId ?? raw.id ?? '')
  if (!loanId || /^[0-9]+$/.test(loanId)) loanId = generateLoanId()

  const borrowerId = raw.borrowerId ?? `BRW-${loanId}`

  // Rate: always store as decimal
  let nominalRate = Number(raw.nominalRate ?? raw.rate ?? 0)
  if (typeof raw.rate === 'string') {
    nominalRate = Number(raw.rate.replace('%', '').trim()) / 100
  }
  // If stored as percent already (e.g. 8.5 instead of 0.085), convert down
  // nominalRate from API should already be decimal per the codebase convention

  const loan: AdminLoan = {
    loanId,
    borrowerId,
    loanName: raw.loanName ?? '',
    school: raw.school ?? '',
    loanStartDate: normalizeDate(raw.loanStartDate ?? raw.dateOnSystem ?? ''),
    principal: Number(raw.principal ?? raw.origPrincipalBal ?? 0),
    nominalRate,
    termYears: Number(raw.termYears ?? 10),
    graceYears: Number(raw.graceYears ?? (raw.mosGraceElig ? raw.mosGraceElig / 12 : 0)),
    loanStatus: raw.loanStatus ?? '',
    feeWaiver: (raw.feeWaiver as AdminLoan['feeWaiver']) ?? 'none',
    events: Array.isArray(raw.events)
      ? raw.events.map((e: any) => ({
          id: e.id ?? crypto.randomUUID(),
          type: e.type,
          date: e.date ?? undefined,
          amount: e.amount !== undefined ? Number(e.amount) : undefined,
          startDate: e.startDate ?? undefined,
          months: e.months !== undefined ? Number(e.months) : undefined,
          recoveryAmount: e.recoveryAmount !== undefined ? Number(e.recoveryAmount) : undefined,
        }))
      : [],
    ownershipLots: Array.isArray(raw.ownershipLots) ? raw.ownershipLots : [],
    ownership: raw.ownership,
    // preserve legacy fields for normalizeOwnership compat
    user: raw.user,
    purchaseDate: normalizeDate(raw.purchaseDate ?? ''),
    purchasePrice: Number(raw.purchasePrice ?? 0),
  }

  // Canonicalize ownership (fills Market to 100%, creates lots if missing)
  normalizeOwnership(loan)

  return loan
}

function stripLegacyFields(loan: AdminLoan): any {
  const { user, purchasePrice, ...clean } = loan
  return clean
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminLoans() {
  const [loans, setLoans] = useState<AdminLoan[]>([])
  const [sha, setSha] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Load all loans on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/loans`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
        const data = await res.json()

        const raw: any[] = Array.isArray(data) ? data : Array.isArray(data.loans) ? data.loans : []

        // Deduplicate by loanId (safety net)
        const seen = new Set<string>()
        const deduped = raw.filter(l => {
          const id = String(l.loanId ?? l.id ?? '')
          if (seen.has(id)) return false
          seen.add(id)
          return true
        })

        setLoans(deduped.map(normalizeAdminLoan))
        setSha(data.sha ?? null)
      } catch (err: any) {
        setError(err.message ?? 'Failed to load loans')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save ────────────────────────────────────────────────────────────────
  async function saveLoans(updated: AdminLoan[]): Promise<void> {
    const payload = {
      loans: updated.map(stripLegacyFields),
      sha,
    }
    const res = await fetch(`${API_BASE}/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `Save failed: ${res.status}`)
    }
    const data = await res.json()
    if (data.sha) setSha(data.sha)
    setLoans(updated)
  }

  // ── Mutations (local state only — call saveLoans to persist) ─────────────

  function addLoan(loan?: Partial<AdminLoan>): AdminLoan {
    const id = generateLoanId()
    const today = new Date().toISOString().split('T')[0]
    const newLoan: AdminLoan = {
      loanId: id,
      borrowerId: `BRW-${id}`,
      loanName: 'New Loan',
      school: '',
      loanStartDate: today,
      principal: 0,
      nominalRate: 0.08,
      termYears: 10,
      graceYears: 0,
      loanStatus: '',
      feeWaiver: 'none',
      events: [],
      ownershipLots: [{ user: 'market', pct: 1, purchaseDate: today }],
      ...loan,
    }
    normalizeOwnership(newLoan)
    setLoans(prev => [newLoan, ...prev])
    return newLoan
  }

  function updateLoan(loanId: string, patch: Partial<AdminLoan>): void {
    setLoans(prev =>
      prev.map(l => {
        if (l.loanId !== loanId) return l
        const updated = { ...l, ...patch }
        if (patch.ownershipLots) normalizeOwnership(updated)
        return updated
      })
    )
  }

  function deleteLoan(loanId: string): void {
    setLoans(prev => prev.filter(l => l.loanId !== loanId))
  }

  function duplicateLoan(loanId: string): AdminLoan | null {
    const original = loans.find(l => l.loanId === loanId)
    if (!original) return null
    const newId = generateLoanId()
    const today = new Date().toISOString().split('T')[0]
    const dupe: AdminLoan = {
      ...original,
      loanId: newId,
      borrowerId: `BRW-${newId}`,
      loanName: `${original.loanName} (copy)`,
      events: [],
      ownershipLots: original.ownershipLots.map(lot => ({ ...lot, purchaseDate: today })),
    }
    normalizeOwnership(dupe)
    setLoans(prev => [dupe, ...prev])
    return dupe
  }

  return {
    loans,
    setLoans,
    sha,
    loading,
    error,
    saveLoans,
    addLoan,
    updateLoan,
    deleteLoan,
    duplicateLoan,
  }
}