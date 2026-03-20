// components/admin/drawers/EventsDrawer.tsx
// Per-loan lifecycle events: prepayments, deferrals, defaults.
// Changes are local until parent calls saveLoans().

import React, { useState } from 'react'
import type { AdminLoan, AdminLoanEvent } from '../../../hooks/admin/useAdminLoans'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  loan: AdminLoan | null
  open: boolean
  onClose: () => void
  onChange: (updatedLoan: AdminLoan) => void
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.25)',
  zIndex: 999,
}

const drawer: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0,
  width: 480, height: '100%',
  background: 'var(--card, #ffffff)',
  boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
  zIndex: 1000,
  overflowY: 'auto',
  color: 'var(--text, #0f172a)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const section: React.CSSProperties = {
  marginBottom: 32,
}

const sectionTitle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '1.1rem',
  fontWeight: 600,
}

const infoBox: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--card, #fff) 85%, var(--muted, #94a3b8) 15%)',
  color: 'var(--muted, #64748b)',
  padding: '16px 20px',
  borderRadius: 12,
  marginBottom: 32,
  fontSize: '0.94rem',
  lineHeight: 1.55,
  border: '1px solid var(--border, #e2e8f0)',
}

const eventRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 12,
  background: 'color-mix(in srgb, var(--card, #fff) 90%, var(--border, #e2e8f0) 10%)',
  borderRadius: 8,
  marginBottom: 10,
  fontSize: '0.95rem',
}

const formGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginBottom: 12,
}

const label: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  color: 'var(--muted, #64748b)',
  fontSize: '0.85rem',
}

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--input-border, #cbd5e1)',
  borderRadius: '0.45rem',
  background: 'var(--input-bg, #fff)',
  color: 'var(--text, #0f172a)',
  padding: '0.35rem 0.5rem',
  fontSize: '0.85rem',
}

const btnGreen: React.CSSProperties = {
  background: '#22c55e',
  border: 'none',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: 999,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.9rem',
}

const btnRed: React.CSSProperties = {
  background: '#ef4444',
  border: 'none',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: 999,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.9rem',
}

const btnSmall: React.CSSProperties = {
  background: 'var(--delete-bg, #f1f5f9)',
  border: '1px solid var(--border, #e2e8f0)',
  color: 'var(--text, #0f172a)',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: '0.85rem',
  cursor: 'pointer',
}

const btnClose: React.CSSProperties = {
  background: 'var(--delete-bg, #f1f5f9)',
  border: '1px solid var(--border, #e2e8f0)',
  color: 'var(--text, #0f172a)',
  padding: '8px 16px',
  borderRadius: 999,
  cursor: 'pointer',
  fontSize: '0.95rem',
  fontWeight: 500,
}

const muted: React.CSSProperties = {
  color: 'var(--muted, #64748b)',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventsDrawer({ loan, open, onClose, onChange }: Props) {
  // ── Add form state ────────────────────────────────────────────────────────
  const [prepayDate, setPrepayDate] = useState('')
  const [prepayAmount, setPrepayAmount] = useState('')
  const [deferStart, setDeferStart] = useState('')
  const [deferMonths, setDeferMonths] = useState('')
  const [defaultDate, setDefaultDate] = useState('')
  const [defaultRecovery, setDefaultRecovery] = useState('')

  if (!open || !loan) return null

  const events = loan.events ?? []
  const prepayments = events.filter(e => e.type === 'prepayment')
  const deferrals   = events.filter(e => e.type === 'deferral')
  const defaults    = events.filter(e => e.type === 'default')
  const hasDefaultEvent = defaults.length > 0

  // ── Helpers ───────────────────────────────────────────────────────────────

  function pushEvent(newEvent: AdminLoanEvent) {
    const updated: AdminLoan = {
      ...loan,
      events: [
        ...(loan.events ?? []),
        newEvent,
      ].sort((a, b) =>
        new Date(a.date ?? a.startDate ?? '').getTime() -
        new Date(b.date ?? b.startDate ?? '').getTime()
      ),
    }
    onChange(updated)
  }

  function removeEvent(id: string) {
    if (!window.confirm('Delete this event?')) return
    const updated: AdminLoan = {
      ...loan,
      events: (loan.events ?? []).filter(e => e.id !== id),
    }
    onChange(updated)
  }

  // ── Add handlers ──────────────────────────────────────────────────────────

  function handleAddPrepayment() {
    const amount = Number(prepayAmount)
    if (!prepayDate || amount <= 0 || isNaN(amount)) {
      alert('Enter a valid date and amount > 0')
      return
    }
    pushEvent({ id: crypto.randomUUID(), type: 'prepayment', date: prepayDate, amount })
    setPrepayDate('')
    setPrepayAmount('')
  }

  function handleAddDeferral() {
    const months = Number(deferMonths)
    if (!deferStart || months < 1 || isNaN(months)) {
      alert('Enter a valid start date and months ≥ 1')
      return
    }
    pushEvent({ id: crypto.randomUUID(), type: 'deferral', startDate: deferStart, months })
    setDeferStart('')
    setDeferMonths('')
  }

  function handleAddDefault() {
    const recovery = Number(defaultRecovery)
    if (!defaultDate || recovery < 0 || isNaN(recovery)) {
      alert('Enter a valid date and recovery amount ≥ 0')
      return
    }
    if (hasDefaultEvent) {
      alert('This loan already has a Default event.')
      return
    }
    pushEvent({ id: crypto.randomUUID(), type: 'default', date: defaultDate, recoveryAmount: recovery })
    setDefaultDate('')
    setDefaultRecovery('')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div style={overlay} onClick={onClose} />

      {/* Drawer */}
      <div style={drawer}>
        <div style={{ padding: 24 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600 }}>
              Events — {loan.loanName || 'Loan'} {loan.loanId}
            </h3>
            <button style={btnClose} onClick={onClose}>Close</button>
          </div>

          {/* Info box */}
          <div style={infoBox}>
            Loan lifecycle events (Prepayments, Deferrals &amp; Default)<br />
            These affect amortization, earnings, and ROI calculations.<br /><br />
            <strong>Adding or deleting events here updates the loan immediately</strong> — save the main page to persist.
          </div>

          {/* ── Prepayments ──────────────────────────────────────── */}
          <div style={section}>
            <h4 style={sectionTitle}>Prepayments</h4>

            {prepayments.length === 0
              ? <p style={muted}>No prepayments yet</p>
              : prepayments.map(e => (
                  <div key={e.id} style={eventRow}>
                    <span>{e.date} — ${Number(e.amount ?? 0).toLocaleString()}</span>
                    <button style={btnSmall} onClick={() => removeEvent(e.id)}>Delete</button>
                  </div>
                ))
            }

            {/* Add prepayment form */}
            <div style={{ marginTop: 20 }}>
              <div style={formGrid}>
                <div>
                  <label style={label}>Date</label>
                  <input type="date" style={input} value={prepayDate} onChange={e => setPrepayDate(e.target.value)} />
                </div>
                <div>
                  <label style={label}>Amount</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" style={input} value={prepayAmount} onChange={e => setPrepayAmount(e.target.value)} />
                </div>
              </div>
              <button style={btnGreen} onClick={handleAddPrepayment}>Add Prepayment</button>
            </div>
          </div>

          {/* ── Deferrals ────────────────────────────────────────── */}
          <div style={section}>
            <h4 style={sectionTitle}>Deferrals</h4>

            {deferrals.length === 0
              ? <p style={muted}>No deferrals yet</p>
              : deferrals.map(e => (
                  <div key={e.id} style={eventRow}>
                    <span>{e.startDate} — {e.months} months</span>
                    <button style={btnSmall} onClick={() => removeEvent(e.id)}>Delete</button>
                  </div>
                ))
            }

            {/* Add deferral form */}
            <div style={{ marginTop: 20 }}>
              <div style={formGrid}>
                <div>
                  <label style={label}>Start Date</label>
                  <input type="date" style={input} value={deferStart} onChange={e => setDeferStart(e.target.value)} />
                </div>
                <div>
                  <label style={label}>Months</label>
                  <input type="number" min="1" placeholder="1–36" style={input} value={deferMonths} onChange={e => setDeferMonths(e.target.value)} />
                </div>
              </div>
              <button style={btnGreen} onClick={handleAddDeferral}>Add Deferral</button>
            </div>
          </div>

          {/* ── Default ──────────────────────────────────────────── */}
          <div style={section}>
            <h4 style={sectionTitle}>Default</h4>

            {defaults.length === 0
              ? <p style={muted}>No default event yet</p>
              : defaults.map(e => (
                  <div key={e.id} style={eventRow}>
                    <span>{e.date} — Recovery ${Number(e.recoveryAmount ?? 0).toLocaleString()}</span>
                    <button style={btnSmall} onClick={() => removeEvent(e.id)}>Delete</button>
                  </div>
                ))
            }

            {/* Add default form — only shown if no default exists */}
            {!hasDefaultEvent ? (
              <div style={{ marginTop: 20 }}>
                <div style={formGrid}>
                  <div>
                    <label style={label}>Date</label>
                    <input type="date" style={input} value={defaultDate} onChange={e => setDefaultDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Recovery Amount</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" style={input} value={defaultRecovery} onChange={e => setDefaultRecovery(e.target.value)} />
                  </div>
                </div>
                <button style={btnRed} onClick={handleAddDefault}>Add Default</button>
              </div>
            ) : (
              <p style={{ ...muted, fontStyle: 'italic' }}>Only one default event allowed per loan.</p>
            )}
          </div>

        </div>
      </div>
    </>
  )
}