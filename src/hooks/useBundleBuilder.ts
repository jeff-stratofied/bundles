import { useMemo, useState } from 'react'
import { useLoans } from './useLoans'
import { useBundles, type Bundle, type BundleLoan, type BundleStrategy } from './useBundles'
import {
  BUNDLE_STRATEGIES,
  filterLoansByStrategy,
  computeBundleStats,
  generateBundleName,
} from '../utils/bundleStrategies'

export function useBundleBuilder(userId: string) {
  const { loans, loading: loansLoading, error: loansError } = useLoans(userId)
  const {
    bundles,
    loading: bundlesLoading,
    error: bundlesError,
    saving,
    saveBundle,
    deleteBundle,
    generateBundleId,
    getLockedLoanIds,
  } = useBundles()

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<BundleStrategy>('conservative_income')
  const [selectedLoanIds, setSelectedLoanIds] = useState<Set<string>>(new Set())
  const [bundleName, setBundleName] = useState('')
  const [saleType, setSaleType] = useState<'public' | 'private'>('public')
  const [targetBuyer, setTargetBuyer] = useState('any')
  const [customPremiumPct, setCustomPremiumPct] = useState<number>(0)
  const [useCustomPrice, setUseCustomPrice] = useState(false)
  const [notes, setNotes] = useState('')

  const lockedLoanIds = useMemo(
    () => getLockedLoanIds(userId),
    [getLockedLoanIds, userId]
  )

  const availableLoans = useMemo(
    () => loans.filter(l => !lockedLoanIds.has(l.loanId) || selectedLoanIds.has(l.loanId)),
    [loans, lockedLoanIds, selectedLoanIds]
  )

  const filteredLoans = useMemo(
    () => filterLoansByStrategy(availableLoans, selectedStrategy),
    [availableLoans, selectedStrategy]
  )

  const selectedLoans = useMemo(
    () => loans.filter(l => selectedLoanIds.has(l.loanId)),
    [loans, selectedLoanIds]
  )

  const stats = useMemo(
    () => computeBundleStats(selectedLoans),
    [selectedLoans]
  )

  const strategyDef = BUNDLE_STRATEGIES.find(s => s.key === selectedStrategy)
  const defaultPremiumPct = strategyDef?.defaultPremiumPct ?? 0
  
  const effectivePremiumPct = useCustomPrice ? customPremiumPct : defaultPremiumPct
const askingPrice = stats.suggestedPrice * (1 + effectivePremiumPct / 100)
  const myBundles = useMemo(
    () =>
      bundles
        .filter(b => b.createdBy === userId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [bundles, userId]
  )

  const offeredToMe = useMemo(
    () => bundles.filter(b => b.targetBuyer === userId && b.status === 'offered'),
    [bundles, userId]
  )

  function openNewBundle(defaultBuyer = 'any') {
    setEditingBundle(null)
    setSelectedStrategy('conservative_income')
    setSelectedLoanIds(new Set())
    setBundleName('')
    setSaleType(defaultBuyer === 'any' ? 'public' : 'private')
    setTargetBuyer(defaultBuyer)
    setCustomPremiumPct(0)
    setUseCustomPrice(false)
    setNotes('')
    setBuilderOpen(true)
  }

  function openEditBundle(bundle: Bundle) {
    setEditingBundle(bundle)
    setSelectedStrategy(bundle.strategy)
    setSelectedLoanIds(new Set(bundle.loans.map(l => l.loanId)))
    setBundleName(bundle.bundleName)
    setSaleType(bundle.targetBuyer === 'any' ? 'public' : 'private')
    setTargetBuyer(bundle.targetBuyer)
    setCustomPremiumPct(bundle.askingPremiumPct)
    setUseCustomPrice(true)
    setNotes(bundle.notes ?? '')
    setBuilderOpen(true)
  }

  function toggleLoan(loanId: string) {
    setSelectedLoanIds(prev => {
      const next = new Set(prev)
      if (next.has(loanId)) next.delete(loanId)
      else next.add(loanId)
      return next
    })
  }

  function selectAll() {
    setSelectedLoanIds(new Set(filteredLoans.map(l => l.loanId)))
  }

  function handleStrategyChange(strategy: BundleStrategy) {
    setSelectedStrategy(strategy)
    setSelectedLoanIds(new Set())
    if (!editingBundle) setBundleName('')
  }

  async function handleSave(status: 'draft' | 'offered') {
    if (!selectedLoans.length) {
      alert('Add at least one loan to the bundle.')
      return
    }

    const bundleLoan = (l: any): BundleLoan => ({
      loanId: l.loanId,
      loanName: l.loanName,
      school: l.school ?? '',
      ownershipPct: l.ownershipPct,
      principal: l.principal,
      nominalRate: l.nominalRate,
      termYears: l.termYears,
      graceYears: l.graceYears,
      purchasePrice: l.purchasePrice ?? 0,
      currentBalance: l.balance ?? 0,
      npv: l.npv ?? 0,
      irr: l.irr ?? 0,
      wal: l.wal ?? 0,
      riskTier: l.riskTier ?? 'UNKNOWN',
    })

    const now = new Date().toISOString()
    const autoName = generateBundleName(selectedStrategy, stats)

    const bundle: Bundle = {
      bundleId: editingBundle?.bundleId ?? generateBundleId(),
      bundleName: bundleName.trim() || autoName,
      strategy: selectedStrategy,
      status,
      createdBy: userId,
      createdAt: editingBundle?.createdAt ?? now,
      updatedAt: now,
      targetBuyer: saleType === 'public' ? 'any' : targetBuyer,
      loans: selectedLoans.map(bundleLoan),
      askingPrice: +askingPrice.toFixed(2),
      askingPremiumPct: +effectivePremiumPct.toFixed(2),
      suggestedPrice: +stats.suggestedPrice.toFixed(2),
      totalPar: +stats.totalPar.toFixed(2),
      weightedRate: +stats.weightedRate.toFixed(4),
      bundleWAL: +stats.bundleWAL.toFixed(2),
      bundleNPV: +stats.bundleNPV.toFixed(2),
      riskMix: stats.riskMix,
      schoolCount: stats.schoolCount,
      notes,
    }

    const ok = await saveBundle(bundle)
    if (ok) setBuilderOpen(false)
    else alert('Failed to save bundle. Try again.')
  }

  async function handleDelete(bundleId: string) {
    if (!confirm('Delete this bundle?')) return
    await deleteBundle(bundleId)
  }

  async function handleMarkSold(bundle: Bundle, saleType: 'private' | 'public') {
    const label = saleType === 'public' ? 'Public Sale (Marketplace)' : 'Private Sale'
    if (!confirm(`Record "${label}" for bundle "${bundle.bundleName}"? The bundle will be removed and loans will become available again.`)) return
    await deleteBundle(bundle.bundleId)
  }

  return {
    loansLoading,
    bundlesLoading,
    saving,
    error: loansError || bundlesError,
    builderOpen,
    setBuilderOpen,
    editingBundle,
    selectedStrategy,
    selectedLoanIds,
    bundleName,
    setBundleName,
    saleType,
setSaleType,
    targetBuyer,
    setTargetBuyer,
    customPremiumPct,
    setCustomPremiumPct,
    useCustomPrice,
    setUseCustomPrice,
    notes,
    setNotes,
    lockedLoanIds,
    filteredLoans,
    selectedLoans,
    stats,
    defaultPremiumPct,
    effectivePremiumPct,
    askingPrice,
    myBundles,
    offeredToMe,
    openNewBundle,
    openEditBundle,
    toggleLoan,
    selectAll,
    handleStrategyChange,
    handleSave,
    handleDelete,
    handleMarkSold,
  }
}