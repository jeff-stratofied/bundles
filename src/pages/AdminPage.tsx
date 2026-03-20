// pages/AdminPage.tsx — FINAL (Session 6)
// All drawers wired. CSV import wired.

import React, { useState, useRef } from 'react'
import { useAdminLoans, type AdminLoan } from '../hooks/admin/useAdminLoans'
import { useAdminBorrowers } from '../hooks/admin/useAdminBorrowers'
import { usePlatformConfig } from '../hooks/admin/usePlatformConfig'
import { useRiskConfig } from '../hooks/admin/useRiskConfig'
import { useSchoolOptions } from '../hooks/admin/useSchoolOptions'
import { useDirtyState } from '../hooks/admin/useDirtyState'
import AdminLoanTable from '../components/admin/AdminLoanTable'
import EventsDrawer from '../components/admin/drawers/EventsDrawer'
import OwnershipDrawer from '../components/admin/drawers/OwnershipDrawer'
import BorrowerDrawer from '../components/admin/drawers/BorrowerDrawer'
import UserFeeDrawer from '../components/admin/drawers/UserFeeDrawer'
import RiskValueDrawer from '../components/admin/drawers/RiskValueDrawer'
import { processImport } from '../components/admin/CsvImportHandler'

// ─── Types ────────────────────────────────────────────────────────────────────

type DrawerType = 'events' | 'ownership' | 'borrower' | 'userFee' | 'riskValue' | null
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '1.5rem',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: 'var(--bg, #f8fafc)',
    color: 'var(--text, #0f172a)',
  },
  headerRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '1.4rem',
  },
  h1: { margin: '0 0 0.3rem 0', fontSize: '1.45rem', fontWeight: 700 },
  sub: { fontSize: '0.9rem', color: 'var(--muted, #64748b)', margin: 0 },
  headerRight: { display: 'flex', gap: 10, alignItems: 'center' },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.15rem 0.55rem', borderRadius: 999,
    border: '1px solid var(--border, #e2e8f0)',
    color: 'var(--muted, #64748b)', fontSize: '0.78rem', marginBottom: '1rem',
  },
  pillDot: { width: 7, height: 7, borderRadius: 999, background: '#22c55e' },
  toolbarRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, flexWrap: 'wrap' as const, margin: '16px 0',
  },
  unsavedWarning: { marginTop: 6, fontSize: '0.8rem', color: '#b91c1c' },
  btn: {
    borderRadius: 999, border: '1px solid var(--button-border, #cbd5e1)',
    padding: '0.35rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer',
    fontWeight: 500, background: 'var(--button-bg, #ffffff)', color: 'var(--text, #0f172a)',
  },
  btnGreen:  { background: '#22c55e', borderColor: '#22c55e', color: '#ffffff' },
  btnBlue:   { background: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff' },
  btnIndigo: { background: '#6366f1', borderColor: '#6366f1', color: '#ffffff' },
  btnOrange: { background: '#f97316', borderColor: '#f97316', color: '#ffffff' },
}

function btn(extra?: React.CSSProperties): React.CSSProperties {
  return { ...styles.btn, ...extra }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {

  // ── Data hooks ──────────────────────────────────────────────────────────
  const {
    loans, loading: loansLoading, error: loansError,
    saveLoans, addLoan, updateLoan, deleteLoan, duplicateLoan,
  } = useAdminLoans()

  const {
    borrowers, loading: borrowersLoading,
    saveBorrowers, upsertBorrower, ensureBorrower, getBorrower,
  } = useAdminBorrowers()

  const { platformConfig, savePlatformConfig } = usePlatformConfig()
  const { riskConfig, saveRiskConfig }         = useRiskConfig()
  const { schoolOptions }                       = useSchoolOptions()

  const {
    isDirty, hasLoanChanges, hasBorrowerChanges, hasConfigChanges,
    markLoanDirty, markBorrowerDirty, markConfigDirty, clearDirty,
  } = useDirtyState()

  // ── Drawer state ────────────────────────────────────────────────────────
  const [activeDrawer, setActiveDrawer]             = useState<DrawerType>(null)
  const [selectedLoanId, setSelectedLoanId]         = useState<string | null>(null)
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null)

  // ── Save / import state ─────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [importMsg, setImportMsg]   = useState<string | null>(null)
  const csvInputRef                 = useRef<HTMLInputElement>(null)

  // ── Derived ─────────────────────────────────────────────────────────────
  const selectedLoan = loans.find(l => l.loanId === selectedLoanId) ?? null

  // ─── Drawer handlers ─────────────────────────────────────────────────────

  function openEventsDrawer(loanId: string) {
    setSelectedLoanId(loanId); setActiveDrawer('events')
  }
  function openOwnershipDrawer(loanId: string) {
    setSelectedLoanId(loanId); setActiveDrawer('ownership')
  }
  function openBorrowerDrawer(borrowerId: string, loanId: string) {
    ensureBorrower(borrowerId, loanId)
    setSelectedBorrowerId(borrowerId)
    setSelectedLoanId(loanId)
    setActiveDrawer('borrower')
  }
  function closeDrawer() {
    setActiveDrawer(null); setSelectedLoanId(null); setSelectedBorrowerId(null)
  }

  // ─── Loan handlers ───────────────────────────────────────────────────────

  function handleLoanChange(loanId: string, patch: Partial<AdminLoan>) {
    updateLoan(loanId, patch); markLoanDirty()
  }
  function handleAddLoan()                   { addLoan(); markLoanDirty() }
  function handleDuplicateLoan(loanId: string) { duplicateLoan(loanId); markLoanDirty() }
  function handleDeleteLoan(loanId: string) {
    if (!window.confirm('Delete this loan? This cannot be undone.')) return
    deleteLoan(loanId); markLoanDirty()
  }

  // ─── Save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaveStatus('saving')
    try {
      if (hasLoanChanges)     await saveLoans(loans)
      if (hasBorrowerChanges) await saveBorrowers(borrowers)
      if (hasConfigChanges && platformConfig) await savePlatformConfig(platformConfig)
      clearDirty()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: any) {
      setSaveStatus('error')
      alert('Save failed: ' + (err.message ?? 'Unknown error'))
    }
  }

  // ─── CSV import ──────────────────────────────────────────────────────────

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg(null)
    try {
      const result = await processImport(file, loans, borrowers)

      // Merge imported loans into local state
      result.loans.forEach(importedLoan => {
        const exists = loans.find(l => l.loanId === importedLoan.loanId)
        if (exists) updateLoan(importedLoan.loanId, importedLoan)
        else addLoan(importedLoan)
      })

      // Merge borrowers
      result.borrowers.forEach(b => upsertBorrower(b))

      markLoanDirty()
      if (result.borrowers.length > 0) markBorrowerDirty()

      setImportMsg(
        `✅ Imported ${result.importedCount} new loan${result.importedCount !== 1 ? 's' : ''}, ` +
        `updated ${result.updatedCount} existing.`
      )
    } catch (err: any) {
      alert('Import failed: ' + (err.message ?? 'Unknown error'))
    }
    e.target.value = ''
  }

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? 'Saved ✔'
    : saveStatus === 'error' ? 'Save failed ✗'
    : '💾 Save Changes'

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loansLoading || borrowersLoading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--muted, #64748b)', fontSize: 14 }}>Loading loans…</span>
      </div>
    )
  }

  if (loansError) {
    return (
      <div style={{ ...styles.page, color: '#dc2626' }}>
        Failed to load loans: {loansError}
      </div>
    )
  }

  return (
    <div style={styles.page}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Loan Admin</h1>
          <p style={styles.sub}>Edit the loans that power the ROI, Earnings, and Amort pages</p>
        </div>
        <div style={styles.headerRight}>
          <button style={btn()} onClick={() => window.location.href = '/bundles'}>
            📊 MY HOLDINGS
          </button>
        </div>
      </div>

      {/* ── Status pill ────────────────────────────────────────────── */}
      <div style={styles.pill}>
        <span style={styles.pillDot} />
        {saveStatus === 'saved' ? 'Saved ✔' : saveStatus === 'error' ? 'Error' : 'Idle'}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div style={styles.toolbarRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={btn({ borderColor: isDirty ? '#fbbf24' : undefined })}
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveLabel}
          </button>
          {saveStatus === 'saved' && (
            <span style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: 500 }}>Saved!</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={btn(styles.btnGreen)} onClick={handleAddLoan}>
            + Add Loan
          </button>
          <button style={btn(styles.btnBlue)} onClick={() => csvInputRef.current?.click()}>
            📥 Import CSV
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCsvFile}
          />
          <button style={btn(styles.btnIndigo)} onClick={() => setActiveDrawer('userFee')}>
            User/Fee Management
          </button>
          <button style={btn(styles.btnOrange)} onClick={() => setActiveDrawer('riskValue')}>
            Risk &amp; Value Controls
          </button>
        </div>
      </div>

      {/* ── Unsaved warning ─────────────────────────────────────────── */}
      {isDirty && (
        <div style={styles.unsavedWarning}>
          ⚠️ You have unsaved changes — click <strong>Save Changes</strong> to apply them
        </div>
      )}

      {/* ── Import message ──────────────────────────────────────────── */}
      {importMsg && (
        <div style={{
          marginTop: 8, padding: '8px 14px', borderRadius: 8, fontSize: '0.85rem',
          background: 'rgba(34,197,94,0.1)', border: '1px solid #86efac', color: '#15803d',
        }}>
          {importMsg}
          <button
            onClick={() => setImportMsg(null)}
            style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontWeight: 700 }}
          >×</button>
        </div>
      )}

      {/* ── Loan Table ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <AdminLoanTable
          loans={loans}
          schoolOptions={schoolOptions}
          users={platformConfig?.users ?? []}
          onLoanChange={handleLoanChange}
          onDelete={handleDeleteLoan}
          onDuplicate={handleDuplicateLoan}
          onOpenEvents={openEventsDrawer}
          onOpenOwnership={openOwnershipDrawer}
          onOpenBorrower={openBorrowerDrawer}
        />
      </div>

      {/* ── Drawers ────────────────────────────────────────────────── */}
      <EventsDrawer
        loan={selectedLoan}
        open={activeDrawer === 'events'}
        onClose={closeDrawer}
        onChange={updated => handleLoanChange(updated.loanId, updated)}
      />
      <OwnershipDrawer
        loan={selectedLoan}
        open={activeDrawer === 'ownership'}
        onClose={closeDrawer}
        onChange={updated => handleLoanChange(updated.loanId, updated)}
        users={platformConfig?.users ?? []}
      />
      <BorrowerDrawer
        borrowerId={selectedBorrowerId ?? ''}
        loanId={selectedLoanId ?? ''}
        open={activeDrawer === 'borrower'}
        onClose={closeDrawer}
        borrowers={borrowers}
        onUpsert={b => { upsertBorrower(b); markBorrowerDirty() }}
      />
      <UserFeeDrawer
        platformConfig={platformConfig}
        open={activeDrawer === 'userFee'}
        onClose={closeDrawer}
        onSave={async updated => { await savePlatformConfig(updated); markConfigDirty() }}
      />
      <RiskValueDrawer
        riskConfig={riskConfig}
        open={activeDrawer === 'riskValue'}
        onClose={closeDrawer}
        onSave={async updated => { await saveRiskConfig(updated); markConfigDirty() }}
      />

    </div>
  )
}