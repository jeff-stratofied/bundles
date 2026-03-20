// components/admin/drawers/OwnershipDrawer.tsx
// Edit ownershipLots for a loan. Sum must equal 100% before saving.
// Calls normalizeOwnership() on commit to keep Market slot in sync.

import React, { useState, useEffect } from 'react'
import { normalizeOwnership } from '../../../utils/ownershipEngine'
import type { AdminLoan, AdminOwnershipLot } from '../../../hooks/admin/useAdminLoans'
import type { PlatformUser } from '../../../hooks/admin/usePlatformConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  loan: AdminLoan | null
  open: boolean
  onClose: () => void
  onChange: (updatedLoan: AdminLoan) => void
  users: PlatformUser[]
}

// Local draft type — pct is stored as percent string for the input (e.g. "50")
interface DraftLot {
  _key: string          // internal stable key for React reconciliation
  user: string
  pctDisplay: string    // percent string: "50" = 50% = 0.50 stored
  purchaseDate: string
  pricePaid: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lotToDraft(lot: AdminOwnershipLot): DraftLot {
  return {
    _key: crypto.randomUUID(),
    user: lot.user ?? '',
    pctDisplay: (Number(lot.pct) * 100).toFixed(2),
    purchaseDate: lot.purchaseDate ?? '',
    pricePaid: lot.pricePaid !== undefined ? String(lot.pricePaid) : '',
  }
}

function draftToLot(d: DraftLot): AdminOwnershipLot {
  return {
    user: d.user,
    pct: Number(d.pctDisplay) / 100,
    purchaseDate: d.purchaseDate,
    pricePaid: d.pricePaid !== '' ? Number(d.pricePaid) : undefined,
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.25)',
  zIndex: 999,
}

const drawerStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0,
  width: 480,
  height: '100%',
  background: 'var(--card, #ffffff)',
  boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
  zIndex: 1000,
  overflowY: 'auto',
  color: 'var(--text, #0f172a)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  padding: 24,
  boxSizing: 'border-box',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--input-border, #cbd5e1)',
  borderRadius: '0.45rem',
  background: 'var(--input-bg, #fff)',
  color: 'var(--text, #0f172a)',
  padding: '0.3rem 0.4rem',
  fontSize: '0.8rem',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

const colLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--muted, #64748b)',
  marginBottom: 4,
  fontWeight: 600,
}

const btnGreen: React.CSSProperties = {
  background: '#22c55e',
  border: 'none',
  color: '#fff',
  padding: '9px 18px',
  borderRadius: 999,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.85rem',
}

const btnGhost: React.CSSProperties = {
  background: 'var(--delete-bg, #f1f5f9)',
  border: '1px solid var(--border, #e2e8f0)',
  color: 'var(--text, #0f172a)',
  padding: '9px 18px',
  borderRadius: 999,
  cursor: 'pointer',
  fontSize: '0.85rem',
}

const btnDelete: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#ef4444',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '0 4px',
  lineHeight: 1,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OwnershipDrawer({ loan, open, onClose, onChange, users }: Props) {
  const [drafts, setDrafts] = useState<DraftLot[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  // Sync drafts when loan changes or drawer opens
  useEffect(() => {
    if (!loan || !open) return
    // Show all lots EXCEPT Market — Market is auto-managed by normalizeOwnership
    const nonMarketLots = (loan.ownershipLots ?? []).filter(
      l => l.user.toLowerCase() !== 'market'
    )
    setDrafts(nonMarketLots.map(lotToDraft))
    setValidationError(null)
  }, [loan?.loanId, open])

  if (!open || !loan) return null

  // ── Totals ────────────────────────────────────────────────────────────────

  const assignedPct = drafts.reduce((sum, d) => sum + (Number(d.pctDisplay) || 0), 0)
  const marketPct   = Math.max(0, 100 - assignedPct)
  const totalPct    = assignedPct + marketPct  // always 100 after Market fills in

  const totalOk = Math.abs(assignedPct - 100) < 0.01 || assignedPct <= 100

  // ── Lot mutators ──────────────────────────────────────────────────────────

  function updateDraft(key: string, field: keyof DraftLot, value: string) {
    setDrafts(prev => prev.map(d => d._key === key ? { ...d, [field]: value } : d))
    setValidationError(null)
  }

  function addLot() {
    const today = new Date().toISOString().split('T')[0]
    setDrafts(prev => [...prev, {
      _key: crypto.randomUUID(),
      user: users[0]?.id ?? 'jeff',
      pctDisplay: '0',
      purchaseDate: today,
      pricePaid: '',
    }])
  }

  function removeLot(key: string) {
    setDrafts(prev => prev.filter(d => d._key !== key))
    setValidationError(null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    // Validate: each lot needs user + purchaseDate + pct > 0
    for (const d of drafts) {
      if (!d.user) { setValidationError('All lots must have a user selected.'); return }
      if (!d.purchaseDate) { setValidationError('All lots must have a purchase date.'); return }
      if (Number(d.pctDisplay) <= 0) { setValidationError('All lot percentages must be > 0.'); return }
    }

    // Validate total ≤ 100%
    if (assignedPct > 100 + 0.01) {
      setValidationError(`Total assigned is ${assignedPct.toFixed(2)}% — must be ≤ 100%.`)
      return
    }

    // Build ownershipLots from drafts (Market will be added by normalizeOwnership)
    const nonMarketLots: AdminOwnershipLot[] = drafts.map(draftToLot)

    const updated: AdminLoan = {
      ...loan,
      ownershipLots: nonMarketLots,
      // Clear ownership.allocations so normalizeOwnership rebuilds it cleanly
      ownership: undefined,
    }

    // normalizeOwnership fills in Market remainder and rebuilds ownership.allocations
    normalizeOwnership(updated)

    onChange(updated)
    onClose()
  }

  // ── User options ──────────────────────────────────────────────────────────

  // Exclude 'market' from user dropdown — Market is auto-managed
  const userOptions = users.filter(u => u.id.toLowerCase() !== 'market' && u.active !== false)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div style={overlay} onClick={onClose} />

      {/* Drawer */}
      <div style={drawerStyle}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 600 }}>Ownership</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
              {loan.loanName} · {loan.loanId}
            </div>
          </div>
          <button style={btnGhost} onClick={onClose}>Close</button>
        </div>

        {/* Info */}
        <div style={{
          background: 'color-mix(in srgb, var(--card, #fff) 85%, var(--muted, #94a3b8) 15%)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 10, padding: '12px 16px',
          fontSize: '0.85rem', color: 'var(--muted, #64748b)',
          marginBottom: 24, lineHeight: 1.5,
        }}>
          Assign ownership lots below. Market automatically receives the remaining percentage.
          All lots must have a user, purchase date, and percentage &gt; 0.
        </div>

        {/* Running total pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 999,
          background: assignedPct > 100 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${assignedPct > 100 ? '#fca5a5' : '#86efac'}`,
          fontSize: '0.82rem', fontWeight: 600,
          marginBottom: 20,
          color: assignedPct > 100 ? '#dc2626' : '#15803d',
        }}>
          <span>{assignedPct.toFixed(2)}% assigned</span>
          <span style={{ opacity: 0.6 }}>·</span>
          <span>{marketPct.toFixed(2)}% Market</span>
        </div>

        {/* Column headers */}
        {drafts.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 70px 130px 110px 28px',
            gap: 8, marginBottom: 6,
          }}>
            <div style={colLabel}>User</div>
            <div style={colLabel}>%</div>
            <div style={colLabel}>Purchase Date</div>
            <div style={colLabel}>Price Paid ($)</div>
            <div />
          </div>
        )}

        {/* Lot rows */}
        {drafts.map(d => (
          <div key={d._key} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 70px 130px 110px 28px',
            gap: 8, marginBottom: 8, alignItems: 'center',
          }}>
            {/* User */}
            <select
              value={d.user}
              onChange={e => updateDraft(d._key, 'user', e.target.value)}
              style={selectStyle}
            >
              {userOptions.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.id}</option>
              ))}
            </select>

            {/* Pct */}
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={d.pctDisplay}
                onChange={e => updateDraft(d._key, 'pctDisplay', e.target.value)}
                style={{ ...inputStyle, textAlign: 'right', paddingRight: 20 }}
              />
              <span style={{
                position: 'absolute', right: 6, top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.75rem', color: 'var(--muted, #94a3b8)',
                pointerEvents: 'none',
              }}>%</span>
            </div>

            {/* Purchase date */}
            <input
              type="date"
              value={d.purchaseDate}
              onChange={e => updateDraft(d._key, 'purchaseDate', e.target.value)}
              style={inputStyle}
            />

            {/* Price paid */}
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="—"
              value={d.pricePaid}
              onChange={e => updateDraft(d._key, 'pricePaid', e.target.value)}
              style={{ ...inputStyle, textAlign: 'right' }}
            />

            {/* Delete */}
            <button style={btnDelete} onClick={() => removeLot(d._key)} title="Remove lot">×</button>
          </div>
        ))}

        {/* Market row — read-only display */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 70px 130px 110px 28px',
          gap: 8, marginBottom: 20, alignItems: 'center',
          opacity: 0.55,
        }}>
          <div style={{ fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--muted)' }}>Market (auto)</div>
          <div style={{ fontSize: '0.82rem', textAlign: 'right', color: 'var(--muted)' }}>{marketPct.toFixed(2)}%</div>
          <div />
          <div />
          <div />
        </div>

        {/* Add lot button */}
        <button
          style={{ ...btnGhost, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={addLot}
        >
          + Add Lot
        </button>

        {/* Validation error */}
        {validationError && (
          <div style={{
            color: '#dc2626', fontSize: '0.85rem',
            marginBottom: 16, padding: '8px 12px',
            background: 'rgba(239,68,68,0.08)',
            borderRadius: 8, border: '1px solid #fca5a5',
          }}>
            {validationError}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btnGreen} onClick={handleSave}>Save Ownership</button>
          <button style={btnGhost} onClick={onClose}>Cancel</button>
        </div>

      </div>
    </>
  )
}