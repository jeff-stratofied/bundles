// hooks/admin/useRiskConfig.ts

import { useState, useEffect } from 'react'

const API_BASE = 'https://bundles-api.jeff-263.workers.dev'

// ─── Types ────────────────────────────────────────────────────────────────────
// Mirrors riskValueConfig.json exactly

export interface RiskConfig {
  metadata?: {
    lastUpdated?: string
    updatedBy?: string
    version?: string
  }
  riskPremiumBps: {
    LOW: number
    MEDIUM: number
    HIGH: number
    VERY_HIGH: number
  }
  recoveryRate: {
    LOW: number
    MEDIUM: number
    HIGH: number
    VERY_HIGH: number
  }
  ficoBorrowerAdjustment: number
  ficoCosignerAdjustment: number
  prepaymentMultiplier: number
  prepaySeasoningYears: number
  graduationRateThreshold: number   // integer percent (75), NOT decimal
  earningsThreshold: number
  baseRiskFreeRate: number
  cdrMultiplier: number
  inflationAssumption: number
  schoolTierMultiplier: {
    A: number
    B: number
    C: number
    D: number
  }
}

// ─── Defaults (match riskValueConfig.json) ───────────────────────────────────

export const RISK_CONFIG_DEFAULTS: RiskConfig = {
  riskPremiumBps:       { LOW: 250, MEDIUM: 350, HIGH: 550, VERY_HIGH: 750 },
  recoveryRate:         { LOW: 30,  MEDIUM: 22,  HIGH: 15,  VERY_HIGH: 10  },
  ficoBorrowerAdjustment: 75,
  ficoCosignerAdjustment: 25,
  prepaymentMultiplier:   1.0,
  prepaySeasoningYears:   2.5,
  graduationRateThreshold: 75,
  earningsThreshold:      70000,
  baseRiskFreeRate:       4.25,
  cdrMultiplier:          1.0,
  inflationAssumption:    3.0,
  schoolTierMultiplier:   { A: 0.8, B: 1.0, C: 1.3, D: 1.5 },
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRiskConfig() {
  const [riskConfig, setRiskConfig] = useState<RiskConfig>(RISK_CONFIG_DEFAULTS)
  const [sha, setSha] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/config`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
        const data = await res.json()
        // Merge over defaults so any missing fields still have safe values
        setRiskConfig({ ...RISK_CONFIG_DEFAULTS, ...data })
        setSha(data.sha ?? null)
      } catch (err: any) {
        setError(err.message ?? 'Failed to load risk config')
        // Keep defaults on error — UI still functional
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save ─────────────────────────────────────────────────────────────────
  async function saveRiskConfig(updated: RiskConfig): Promise<void> {
    const payload = {
      metadata: {
        lastUpdated: new Date().toISOString(),
        updatedBy: 'admin',
        version: updated.metadata?.version ?? '1.2.0',
      },
      ...updated,
      sha,
    }

    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `Risk config save failed: ${res.status}`)
    }

    const data = await res.json()
    if (data.sha) setSha(data.sha)
    setRiskConfig(updated)
  }

  return {
    riskConfig,
    setRiskConfig,
    sha,
    loading,
    error,
    saveRiskConfig,
  }
}