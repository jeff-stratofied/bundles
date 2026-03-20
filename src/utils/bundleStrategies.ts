import type { BundleStrategy } from '../hooks/useBundles'

// ─── Strategy Definitions ─────────────────────────────────────────────────────

export interface StrategyDef {
  key: BundleStrategy
  label: string
  description: string
  pricingBias: 'premium' | 'par' | 'discount'
  defaultPremiumPct: number   // suggested asking premium/discount %
  color: string
  icon: string
  criteria: {
    riskTiers?: string[]
    minRate?: number
    maxRate?: number
    minWAL?: number
    maxWAL?: number
    minSeasoningMonths?: number   // months since loan start
    requireCosigner?: boolean
  }
}

export const BUNDLE_STRATEGIES: StrategyDef[] = [
  {
    key: 'conservative_income',
    label: 'Conservative Income',
    description: 'Low-risk, cosigned loans from top-tier schools. Stable cash flow, suitable for income-focused buyers.',
    pricingBias: 'premium',
    defaultPremiumPct: 3.0,
    color: '#16a34a',
    icon: '🛡️',
    criteria: {
      riskTiers: ['LOW', 'MEDIUM'],
      maxRate: 9.0,
      maxWAL: 6,
    },
  },
  {
    key: 'growth_yield',
    label: 'Growth / Yield',
    description: 'Higher-rate loans with longer duration. Greater return potential for yield-seeking buyers.',
    pricingBias: 'discount',
    defaultPremiumPct: -2.5,
    color: '#dc2626',
    icon: '📈',
    criteria: {
      riskTiers: ['HIGH', 'VERY_HIGH'],
      minRate: 9.0,
      minWAL: 5,
    },
  },
  {
    key: 'diversified',
    label: 'Diversified',
    description: 'Balanced mix across risk tiers, schools, and maturities. Broad exposure, priced at par.',
    pricingBias: 'par',
    defaultPremiumPct: 0,
    color: '#7c3aed',
    icon: '⚖️',
    criteria: {
      // No hard filters — diversity is enforced by loan count across tiers
    },
  },
  {
    key: 'seasoned',
    label: 'Seasoned Portfolio',
    description: 'Loans at least 18 months into repayment with proven payment history. Premium for demonstrated performance.',
    pricingBias: 'premium',
    defaultPremiumPct: 4.0,
    color: '#0891b2',
    icon: '🏆',
    criteria: {
      riskTiers: ['LOW', 'MEDIUM'],
      minSeasoningMonths: 18,
    },
  },
  {
    key: 'custom',
    label: 'Custom Package',
    description: 'Manually select any loans from your portfolio. Set your own pricing.',
    pricingBias: 'par',
    defaultPremiumPct: 0,
    color: '#64748b',
    icon: '🔧',
    criteria: {},
  },
]

// ─── Strategy Filter ──────────────────────────────────────────────────────────

export function filterLoansByStrategy(
  loans: any[],
  strategy: BundleStrategy,
  pricingSource: 'system' | 'user' = 'system',
  today: Date = new Date()
): any[] {
  if (strategy === 'custom') return loans

  const def = BUNDLE_STRATEGIES.find(s => s.key === strategy)
  if (!def) return loans

  const { criteria } = def

  return loans.filter(loan => {
    const events = Array.isArray(loan.events) ? loan.events : []
    const hasDefaultEvent = events.some(
      (e: any) => String(e?.type ?? '').toLowerCase() === 'default'
    )

    if (hasDefaultEvent) return false

    const pricing = loan.pricing?.[pricingSource]
    const rate = Number(loan.nominalRate ?? 0)
    const wal = Number(pricing?.wal ?? loan.wal ?? 0)
    const riskTier = String(pricing?.riskTier ?? loan.riskTier ?? 'UNKNOWN')
    const loanStart = loan.loanStartDate ? new Date(loan.loanStartDate + 'T00:00:00') : null

    if (criteria.riskTiers && criteria.riskTiers.length > 0) {
      if (!criteria.riskTiers.includes(riskTier)) return false
    }

    if (criteria.minRate !== undefined && rate < criteria.minRate) return false
    if (criteria.maxRate !== undefined && rate > criteria.maxRate) return false
    if (criteria.minWAL !== undefined && wal < criteria.minWAL) return false
    if (criteria.maxWAL !== undefined && wal > criteria.maxWAL) return false

    if (criteria.minSeasoningMonths !== undefined && loanStart) {
      const monthsAge =
        (today.getFullYear() - loanStart.getFullYear()) * 12 +
        (today.getMonth() - loanStart.getMonth())
      if (monthsAge < criteria.minSeasoningMonths) return false
    }

    return true
  })
}

export function computeBundleStats(
  loans: any[],
  pricingSource: 'system' | 'user' = 'system'
): {
  totalPar: number
  weightedRate: number
  bundleWAL: number
  bundleNPV: number
  suggestedPrice: number
  riskMix: Record<string, number>
  schoolCount: number
  askingPremiumPct: number
} {
  if (!loans.length) {
    return {
      totalPar: 0,
      weightedRate: 0,
      bundleWAL: 0,
      bundleNPV: 0,
      suggestedPrice: 0,
      riskMix: {},
      schoolCount: 0,
      askingPremiumPct: 0,
    }
  }

  let totalPar = 0
  let rateWeightedSum = 0
  let walWeightedSum = 0
  let totalNPV = 0
  const riskMix: Record<string, number> = {}
  const schools = new Set<string>()

  loans.forEach(loan => {
    const pricing = loan.pricing?.[pricingSource]
    const remainingBal =
      Number(loan.balance ?? loan.currentBalance ?? 0) * Number(loan.ownershipPct ?? 1)
    const rate = Number(loan.nominalRate ?? 0)
    const wal = Number(pricing?.wal ?? loan.wal ?? 0)
    const npv = Number(pricing?.npv ?? loan.npv ?? 0)
    const risk = String(pricing?.riskTier ?? loan.riskTier ?? 'UNKNOWN')
    const school = String(loan.school ?? '')

    totalPar += remainingBal
    rateWeightedSum += rate * remainingBal
    walWeightedSum += wal * remainingBal
    totalNPV += npv
    riskMix[risk] = (riskMix[risk] ?? 0) + 1

    if (school) schools.add(school)
  })

  const weightedRate = totalPar > 0 ? rateWeightedSum / totalPar : 0
  const bundleWAL = totalPar > 0 ? walWeightedSum / totalPar : 0
  const suggestedPrice = totalNPV
  const askingPremiumPct = 0

  return {
    totalPar,
    weightedRate,
    bundleWAL,
    bundleNPV: totalNPV,
    suggestedPrice,
    riskMix,
    schoolCount: schools.size,
    askingPremiumPct: +askingPremiumPct.toFixed(2),
  }
}

// ─── Auto-name Generator ──────────────────────────────────────────────────────

export function generateBundleName(
  strategy: BundleStrategy,
  stats: { weightedRate: number; bundleWAL: number }
): string {
  const strategyAbbrev: Record<BundleStrategy, string> = {
    conservative_income: 'CONS',
    growth_yield: 'GRWTH',
    diversified: 'DIV',
    seasoned: 'SEASN',
    custom: 'CUST',
  }
  const date = new Date()
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const abbrev = strategyAbbrev[strategy] ?? 'CUST'
  const rate = stats.weightedRate.toFixed(2)
  const wal = stats.bundleWAL.toFixed(1)
  return `${abbrev}-${rate}-${wal}yr-${yyyymm}`
}