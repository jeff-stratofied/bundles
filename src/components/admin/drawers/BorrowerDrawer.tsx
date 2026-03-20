// components/admin/drawers/BorrowerDrawer.tsx
// Edit borrower profile: FICO, cosigner FICO, year in school, degree type.
// Saves locally via onUpsert — parent must call saveBorrowers() to persist.

import React, { useState, useEffect } from 'react'
import type { AdminBorrower } from '../../../hooks/admin/useAdminBorrowers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  borrowerId: string
  loanId: string
  open: boolean
  onClose: () => void
  borrowers: AdminBorrower[]
  onUpsert: (b: AdminBorrower) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const YEAR_OPTIONS = [
  { value: '',  label: '— Select —' },
  { value: '1', label: '1 – 1st Year Undergrad' },
  { value: '2', label: '2 – 2nd Year Undergrad' },
  { value: '3', label: '3 – 3rd Year Undergrad' },
  { value: '4', label: '4 – 4th Year Undergrad' },
  { value: '5', label: '5 – 5th Year Undergrad' },
  { value: 'A', label: 'A – 1st Year Grad' },
  { value: 'B', label: 'B – 2nd Year Grad' },
  { value: 'C', label: 'C – 3rd Year Grad' },
  { value: 'D', label: 'D – Beyond 3rd Year Grad' },
  { value: 'Z', label: 'Z – Private; Unknown Grade' },
]

const DEGREE_OPTIONS = [
  { value: '',             label: '— Select —' },
  { value: 'STEM',         label: 'STEM' },
  { value: 'Business',     label: 'Business' },
  { value: 'Liberal Arts', label: 'Liberal Arts' },
  { value: 'Professional', label: 'Professional (e.g. Nursing, Law)' },
  { value: 'Other',        label: 'Other' },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.25)',
  zIndex: 999,
}

const drawerStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0,
  width: 420, height: '100%',
  background: 'var(--card, #ffffff)',
  boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
  zIndex: 1000,
  overflowY: 'auto',
  color: 'var(--text, #0f172a)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  padding: 24,
  boxSizing: 'border-box',
}

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginBottom: 20,
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--muted, #64748b)',
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--input-border, #cbd5e1)',
  borderRadius: '0.45rem',
  background: 'var(--input-bg, #fff)',
  color: 'var(--text, #0f172a)',
  padding: '0.4rem 0.5rem',
  fontSize: '0.9rem',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

const btnGreen: React.CSSProperties = {
  flex: 1,
  background: '#22c55e',
  border: 'none',
  color: '#fff',
  padding: '10px',
  borderRadius: 6,
  fontWeight: 500,
  cursor: 'pointer',
  fontSize: '0.9rem',
}

const btnGhost: React.CSSProperties = {
  flex: 1,
  background: 'var(--delete-bg, #f1f5f9)',
  border: '1px solid var(--border, #e2e8f0)',
  color: 'var(--text, #0f172a)',
  padding: '10px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.9rem',
}

const savedBanner: React.CSSProperties = {
  background: 'rgba(34,197,94,0.1)',
  border: '1px solid #86efac',
  color: '#15803d',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: 16,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BorrowerDrawer({
  borrowerId,
  loanId,
  open,
  onClose,
  borrowers,
  onUpsert,
}: Props) {
  const [borrowerFico, setBorrowerFico] = useState('')
  const [cosignerFico, setCosignerFico] = useState('')
  const [yearInSchool, setYearInSchool] = useState('')
  const [degreeType, setDegreeType]     = useState('')
  const [isNew, setIsNew]               = useState(false)
  const [saved, setSaved]               = useState(false)

  // Populate fields when drawer opens
  useEffect(() => {
    if (!open || !borrowerId) return
    setSaved(false)

    const borrower = borrowers.find(b => b.borrowerId === borrowerId)
    if (borrower) {
      setBorrowerFico(borrower.borrowerFico != null ? String(borrower.borrowerFico) : '')
      setCosignerFico(borrower.cosignerFico != null ? String(borrower.cosignerFico) : '')
      setYearInSchool(borrower.yearInSchool != null ? String(borrower.yearInSchool) : '')
      setDegreeType(borrower.degreeType ?? '')
      setIsNew(false)
    } else {
      // New skeleton record
      setBorrowerFico('')
      setCosignerFico('')
      setYearInSchool('')
      setDegreeType('')
      setIsNew(true)
    }
  }, [open, borrowerId, borrowers])

  if (!open) return null

  const borrower = borrowers.find(b => b.borrowerId === borrowerId)

  function handleSave() {
    const updated: AdminBorrower = {
      ...(borrower ?? {}),
      borrowerId,
      borrowerName: borrower?.borrowerName ?? loanId ?? borrowerId,
      borrowerFico:  borrowerFico  !== '' ? Number(borrowerFico)  : null,
      cosignerFico:  cosignerFico  !== '' ? Number(cosignerFico)  : null,
      yearInSchool:  yearInSchool  !== '' ? yearInSchool           : null,
      degreeType:    degreeType    !== '' ? degreeType             : null,
      isGraduateStudent: ['A','B','C','D'].includes(yearInSchool),
      school:  borrower?.school  ?? '',
      opeid:   borrower?.opeid   ?? '',
    }
    onUpsert(updated)
    setSaved(true)
  }

  return (
    <>
      {/* Overlay */}
      <div style={overlay} onClick={onClose} />

      {/* Drawer */}
      <div style={drawerStyle}>

        {/* Header */}
        <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 600 }}>
          Borrower
        </h3>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted, #64748b)', marginBottom: 20 }}>
          {borrowerId}
          {loanId && <span> · Loan {loanId}</span>}
        </div>

        {/* New borrower hint */}
        {isNew && (
          <div style={{
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid #a5b4fc',
            color: '#4338ca',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: '0.83rem',
            marginBottom: 16,
          }}>
            New borrower profile — fill in FICO and degree to save.
          </div>
        )}

        {/* Saved confirmation */}
        {saved && (
          <div style={savedBanner}>
            ✓ Borrower changes saved locally. Click <strong>Save Changes</strong> at the top of the page to commit to the server.
          </div>
        )}

        {/* Fields */}
        <div style={{ display: 'grid', gap: 4 }}>

          <div style={fieldGroup}>
            <label style={labelStyle}>Borrower FICO</label>
            <input
              type="number"
              min={300} max={850}
              placeholder="e.g. 720"
              value={borrowerFico}
              onChange={e => { setBorrowerFico(e.target.value); setSaved(false) }}
              style={inputStyle}
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Cosigner FICO (optional)</label>
            <input
              type="number"
              min={300} max={850}
              placeholder="—"
              value={cosignerFico}
              onChange={e => { setCosignerFico(e.target.value); setSaved(false) }}
              style={inputStyle}
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Year in School</label>
            <select
              value={yearInSchool}
              onChange={e => { setYearInSchool(e.target.value); setSaved(false) }}
              style={selectStyle}
            >
              {YEAR_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Degree Type</label>
            <select
              value={degreeType}
              onChange={e => { setDegreeType(e.target.value); setSaved(false) }}
              style={selectStyle}
            >
              {DEGREE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button style={btnGreen} onClick={handleSave}>Save Changes</button>
          <button style={btnGhost} onClick={onClose}>Close</button>
        </div>

      </div>
    </>
  )
}