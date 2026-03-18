import { useState, useEffect, useCallback } from 'react'

const BUNDLES_API = 'https://bundles-api.jeff-263.workers.dev/bundles'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BundleStatus = 'draft' | 'offered'

export type BundleStrategy =
  | 'conservative_income'
  | 'growth_yield'
  | 'diversified'
  | 'seasoned'
  | 'custom'

export interface BundleLoan {
  loanId: string
  loanName: string
  school: string
  ownershipPct: number        // seller's % being bundled
  principal: number
  nominalRate: number
  termYears: number
  graceYears: number
  purchasePrice: number       // seller's cost basis
  currentBalance: number
  npv: number
  irr: number
  wal: number
  riskTier: string
}

export interface Bundle {
  bundleId: string
  bundleName: string
  strategy: BundleStrategy
  status: BundleStatus
  createdBy: string           // userId of creator
  createdAt: string           // ISO date
  updatedAt: string
  targetBuyer: string         // userId of intended buyer
  loans: BundleLoan[]
  // Pricing
  askingPrice: number
  askingPremiumPct: number    // + = premium, 0 = par, - = discount
  suggestedPrice: number      // engine NPV-based suggestion
  // Portfolio stats
  totalPar: number            // sum of principal × ownershipPct
  weightedRate: number        // weighted avg nominalRate
  bundleWAL: number           // weighted avg life
  bundleNPV: number           // sum of NPVs
  riskMix: Record<string, number>  // { LOW: 3, MEDIUM: 2, HIGH: 1 }
  schoolCount: number
  notes: string
  pricingSource?: 'system' | 'user'
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [sha, setSha] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Load all bundles
  const loadBundles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(BUNDLES_API, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load bundles: ${res.status}`)
      const data = await res.json()
      setBundles(Array.isArray(data.bundles) ? data.bundles : [])
      setSha(data.sha ?? null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBundles() }, [loadBundles])

  // Save full bundles array
  const saveBundles = useCallback(async (updatedBundles: Bundle[]): Promise<boolean> => {
    setSaving(true)
    try {
      const res = await fetch(BUNDLES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundles: updatedBundles, sha }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Save failed: ${res.status}`)
      }
      const result = await res.json()
      setSha(result.sha ?? sha)
      setBundles(updatedBundles)
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }, [sha])

  // Save a single bundle (upsert by bundleId)
  const saveBundle = useCallback(async (bundle: Bundle): Promise<boolean> => {
    const now = new Date().toISOString()
    const updated = { ...bundle, updatedAt: now }
    const idx = bundles.findIndex(b => b.bundleId === bundle.bundleId)
    const newBundles = idx >= 0
      ? bundles.map((b, i) => i === idx ? updated : b)
      : [...bundles, updated]
    return saveBundles(newBundles)
  }, [bundles, saveBundles])

  // Delete a bundle by id
  const deleteBundle = useCallback(async (bundleId: string): Promise<boolean> => {
    const newBundles = bundles.filter(b => b.bundleId !== bundleId)
    return saveBundles(newBundles)
  }, [bundles, saveBundles])

  // Generate a truly unique bundle ID
  const generateBundleId = useCallback((): string => {
    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const ts = `${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}${now.getMilliseconds().toString().padStart(3, '0')}`
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `BDL-${yyyymm}-${ts}-${rand}`
  }, [])

  // Get loans currently locked in active bundles (draft or offered) by a user
  const getLockedLoanIds = useCallback((userId: string): Set<string> => {
    const locked = new Set<string>()
    bundles
      .filter(b => b.createdBy === userId && (b.status === 'draft' || b.status === 'offered'))
      .forEach(b => b.loans.forEach(l => locked.add(l.loanId)))
    return locked
  }, [bundles])

  return {
    bundles,
    loading,
    error,
    saving,
    loadBundles,
    saveBundle,
    saveBundles,
    deleteBundle,
    generateBundleId,
    getLockedLoanIds,
  }
}