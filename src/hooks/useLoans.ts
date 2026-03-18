import { useState, useEffect } from 'react'
import { buildAmortSchedule, getCurrentLoanBalance } from '../utils/loanEngine'
import {
  deriveRiskTier,
  valueLoan,
  SYSTEM_PROFILE,
  loadConfig,
  loadSchoolTiers,
  loadValuationCurves,
} from '../utils/valuationEngine'

import schoolTiersJson from '../data/schoolTiers.json'
import valuationCurvesJson from '../data/valuationCurves.json'

const LOANS_URL = 'https://raw.githubusercontent.com/jeff-stratofied/loan-valuation/main/data/loans.json'
const BORROWERS_URL = 'https://raw.githubusercontent.com/jeff-stratofied/loan-valuation/main/data/borrowers.json'
function getUserRiskStorageKey(userId: string) {
  return `userRiskAssumptions:${String(userId || 'anonymous').toLowerCase()}`
}

const LOAN_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9',
  '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#06b6d4',
  '#84cc16', '#a855f7', '#f43f5e', '#22d3ee', '#fb923c',
  '#4ade80', '#818cf8', '#fbbf24', '#34d399', '#fb7185',
]

function jsonToBlobUrl(data: unknown): string {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  return URL.createObjectURL(blob)
}

export interface LoanPricingProfile {
  npv: number
  irr: number
  riskTier: string
  wal: number
}

export interface OwnershipLot {
  user: string
  pct: number
  purchaseDate: string
  pricePaid?: number
}

export interface LoanEvent {
  type: 'prepayment' | 'deferral' | 'default'
  date?: string
  amount?: number
  months?: number
  startDate?: string
  recovered?: number
}

export interface Loan {
  loanId: string
  loanName: string
  school: string
  loanStartDate: string
  purchaseDate: string
  principal: number
  purchasePrice: number
  nominalRate: number
  termYears: number
  graceYears: number
  balance: number
  ownershipPct: number
  ownershipLots: OwnershipLot[]
  events: LoanEvent[]
  loanColor: string
  visible: boolean
  isMarketLoan: boolean
  amort: { schedule: any[] }
  borrower?: any

  wal?: number
  npv?: number
  irr?: number
  riskTier?: string

  pricing?: {
    system: LoanPricingProfile
    user: LoanPricingProfile
  }

  hasUserOverrides?: boolean
  valuationDeltaPct?: number
}

function getUserAssumptions(userId: string): any | null {
  try {
    const raw = localStorage.getItem(getUserRiskStorageKey(userId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function buildLoanValuationInput(l: Loan) {
  return {
    ...l,
    principal: Number(l.principal ?? 0),
    nominalRate: Number(l.nominalRate ?? 0) / 100,
    termYears: Number(l.termYears ?? 0),
    graceYears: Number(l.graceYears ?? 0),
    loanStartDate: l.loanStartDate,
    purchaseDate: l.purchaseDate,
    loanId: l.loanId,
  }
}

function buildBorrowerInput(l: Loan) {
  const borrower = l.borrower ?? {}
  return {
    borrowerFico: borrower.borrowerFico ?? borrower.fico ?? null,
    cosignerFico: borrower.cosignerFico ?? null,
    yearInSchool: borrower.yearInSchool ?? null,
    isGraduateStudent: borrower.isGraduateStudent ?? false,
    school: borrower.school ?? l.school ?? '',
    opeid: borrower.opeid ?? null,
    degreeType: borrower.degreeType ?? null,
  }
}

function enrichLoan(l: Loan, userId: string): Loan {
  const sched = l.amort?.schedule ?? []
  const ownershipPct = Number(l.ownershipPct ?? 1)

  let walNum = 0
  let walDen = 0

  sched.forEach((row, i) => {
    const p = Number(row.scheduledPrincipal ?? 0) + Number(row.prepaymentPrincipal ?? 0)
    if (p > 0) {
      walNum += (i + 1) * p
      walDen += p
    }
  })

  const wal = walDen > 0 ? walNum / walDen / 12 : 0

  const borrowerInput = buildBorrowerInput(l)
  const loanInput = buildLoanValuationInput(l)
  const userAssumptions = getUserAssumptions(userId)

  const hasUserOverrides = !!userAssumptions
  const userProfile = hasUserOverrides
    ? {
        ...SYSTEM_PROFILE,
        assumptions: {
          ...SYSTEM_PROFILE.assumptions,
          ...userAssumptions,
        },
      }
    : SYSTEM_PROFILE

  let systemRiskTier = 'UNKNOWN'
  let userRiskTier = 'UNKNOWN'
  let systemNpv = Number(l.balance ?? 0) * ownershipPct
  let userNpv = systemNpv
  let systemIrr = 0
  let userIrr = 0

  try {
    systemRiskTier = deriveRiskTier(borrowerInput, SYSTEM_PROFILE.assumptions) ?? 'UNKNOWN'
    userRiskTier = deriveRiskTier(borrowerInput, userProfile.assumptions) ?? systemRiskTier

    const systemValuation = valueLoan({
      loan: loanInput,
      borrower: borrowerInput,
      riskFreeRate: (SYSTEM_PROFILE.assumptions.baseRiskFreeRate ?? 4.25) / 100,
      profile: SYSTEM_PROFILE,
    })

    systemNpv = Number(systemValuation?.npv ?? 0) * ownershipPct
    systemIrr = Number(systemValuation?.irr ?? 0)

    const userValuation = valueLoan({
      loan: loanInput,
      borrower: borrowerInput,
      riskFreeRate: (userProfile.assumptions.baseRiskFreeRate ?? 4.25) / 100,
      profile: userProfile,
    })

    userNpv = Number(userValuation?.npv ?? 0) * ownershipPct
    userIrr = Number(userValuation?.irr ?? 0)
  } catch (err) {
    console.warn('Loan valuation failed:', l.loanId, err)
  }

  const systemProfile: LoanPricingProfile = {
    npv: systemNpv,
    irr: systemIrr,
    riskTier: systemRiskTier,
    wal,
  }

  const userProfileValues: LoanPricingProfile = {
    npv: userNpv,
    irr: userIrr,
    riskTier: userRiskTier,
    wal,
  }

  const valuationDeltaPct =
    systemNpv !== 0 ? ((userNpv - systemNpv) / systemNpv) * 100 : 0

  return {
    ...l,
    wal,
    npv: systemNpv,
    irr: systemIrr,
    riskTier: systemRiskTier,
    pricing: {
      system: systemProfile,
      user: userProfileValues,
    },
    hasUserOverrides,
    valuationDeltaPct,
  }
}

function toFraction(pct: number): number {
  return pct > 1.5 ? pct / 100 : pct
}

function normalizeLoan(raw: any, index: number, userId: string): Loan | null {
  const loanId = String(raw.loanId ?? raw.id ?? 'unknown')
  const lots: OwnershipLot[] = Array.isArray(raw.ownershipLots) ? raw.ownershipLots : []
  const isMarket = userId === 'market'

  let ownershipPct: number
  let purchasePrice: number
  let purchaseDate: string

  if (isMarket) {
    const marketLots = lots.filter(l => String(l.user).toLowerCase() === 'market')
    ownershipPct = marketLots.reduce((sum, l) => sum + toFraction(Number(l.pct || 0)), 0)
    if (ownershipPct <= 0) return null
    purchasePrice = 0
    purchaseDate = raw.loanStartDate || raw.dateOnSystem || ''
  } else {
    const userLots = lots.filter(l => String(l.user).toLowerCase() === userId.toLowerCase())
    ownershipPct = userLots.reduce((sum, l) => sum + toFraction(Number(l.pct || 0)), 0)
    if (ownershipPct <= 0) return null
    purchasePrice = userLots.reduce((sum, l) => sum + Number(l.pricePaid || 0), 0)
    const lotDates = userLots.map(l => l.purchaseDate).filter(Boolean).sort()
    purchaseDate = lotDates[0] || raw.purchaseDate || raw.loanStartDate || ''
  }

  const principal = Number(raw.principal ?? raw.origPrincipalBal ?? 0)
  const nominalRate = Number(raw.nominalRate ?? raw.rate ?? 0) * 100
  const termYears = Number(raw.termYears ?? 0)
  const graceYears = Number(raw.graceYears ?? (raw.mosGraceElig ? raw.mosGraceElig / 12 : 0))
  const loanStartDate = raw.loanStartDate || raw.dateOnSystem || ''
  const events = Array.isArray(raw.events) ? raw.events : []

  const loanCore = {
    loanId,
    loanName: raw.loanName || '',
    principal,
    nominalRate,
    termYears,
    graceYears,
    loanStartDate,
    purchaseDate,
    events,
  }

  const schedule = buildAmortSchedule(loanCore)
  const balance = getCurrentLoanBalance({ amort: { schedule } }, new Date())

  return {
    loanId,
    loanName: raw.loanName || '',
    school: raw.school || raw.originalSchoolName || '',
    loanStartDate,
    purchaseDate,
    principal,
    purchasePrice,
    nominalRate,
    termYears,
    graceYears,
    balance,
    ownershipPct,
    ownershipLots: lots,
    events,
    loanColor: LOAN_COLORS[index % LOAN_COLORS.length],
    visible: raw.visible !== false,
    isMarketLoan: isMarket,
    amort: { schedule },
  }
}

export function useLoans(userId: string) {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    async function loadAll() {
      setLoading(true)
      setError(null)

      try {
        const schoolTiersUrl = jsonToBlobUrl(schoolTiersJson)
        const valuationCurvesUrl = jsonToBlobUrl(valuationCurvesJson)

        await Promise.all([
          loadSchoolTiers(schoolTiersUrl),
          loadValuationCurves(valuationCurvesUrl),
        ])

        URL.revokeObjectURL(schoolTiersUrl)
        URL.revokeObjectURL(valuationCurvesUrl)

        await loadConfig()

        const [loansData, borrowersRaw] = await Promise.all([
          fetch(LOANS_URL).then(res => {
            if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
            return res.json()
          }),
          fetch(BORROWERS_URL)
            .then(res => {
              if (!res.ok) return []
              return res.json()
            })
            .catch(() => []),
        ])

        const borrowerArr = Array.isArray(borrowersRaw)
          ? borrowersRaw
          : Array.isArray((borrowersRaw as any)?.borrowers)
            ? (borrowersRaw as any).borrowers
            : []

        const borrowerMap: Record<string, any> = {}
        borrowerArr.forEach((b: any) => {
          if (b?.borrowerId) borrowerMap[b.borrowerId] = b
        })

        const raw: any[] = Array.isArray(loansData)
          ? loansData
          : Array.isArray((loansData as any).loans)
            ? (loansData as any).loans
            : []

        const normalized = raw
          .map((l, i) => {
            const loan = normalizeLoan(l, i, userId)
            if (!loan) return null

            const borrower =
              borrowerMap[l.borrowerId] ??
              borrowerMap[`BRW-${loan.loanId}`] ??
              null

            return borrower ? { ...loan, borrower } : loan
          })
          .filter((l): l is Loan => l !== null && (l as any).visible)

          setLoans(normalized.map(loan => enrichLoan(loan, userId)))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [userId])

  return { loans, loading, error }
}