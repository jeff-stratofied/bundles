// components/admin/drawers/RiskValueDrawer.tsx
// Platform-wide risk and valuation assumptions.
// Matches the admin.html Risk & Value Controls drawer exactly.
// Saves to /config endpoint via onSave prop.

import React, { useState, useEffect } from 'react'
import type { RiskConfig } from '../../../hooks/admin/useRiskConfig'
import { RISK_CONFIG_DEFAULTS } from '../../../hooks/admin/useRiskConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  riskConfig: RiskConfig
  open: boolean
  onClose: () => void
  onSave: (updated: RiskConfig) => Promise<void>
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.25)',
  zIndex: 999,
}

const drawerStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0,
  width: 620, height: '100%',
  background: 'var(--card, #ffffff)',
  boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
  zIndex: 1000,
  overflowY: 'auto',
  color: 'var(--text, #0f172a)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxSizing: 'border-box',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid var(--border, #e2e8f0)',
  position: 'sticky',
  top: 0,
  background: 'var(--card, #fff)',
  zIndex: 10,
}

const sectionStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border, #e2e8f0)',
  padding: '24px',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  margin: '0 0 6px',
}

const sectionDesc: React.CSSProperties = {
  fontSize: '0.83rem',
  color: 'var(--muted, #64748b)',
  margin: '0 0 20px',
  lineHeight: 1.5,
}

const fieldGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px 24px',
}

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text, #0f172a)',
}

const noteStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--muted, #64748b)',
  fontStyle: 'italic',
  marginTop: 2,
  lineHeight: 1.4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--input-border, #cbd5e1)',
  borderRadius: '0.45rem',
  background: 'var(--input-bg, #fff)',
  color: 'var(--text, #0f172a)',
  padding: '0.35rem 0.5rem',
  fontSize: '0.88rem',
}

const btnClose: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 24,
  cursor: 'pointer',
  color: 'var(--muted, #64748b)',
  lineHeight: 1,
  padding: 4,
}

const btnSave: React.CSSProperties = {
  background: '#22c55e',
  border: 'none',
  color: '#fff',
  padding: '9px 20px',
  borderRadius: 999,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.88rem',
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  note,
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: {
  label: string
  note?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div style={fieldGroup}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={inputStyle}
      />
      {note && <span style={noteStyle}>{note}</span>}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RiskValueDrawer({ riskConfig, open, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<RiskConfig>(RISK_CONFIG_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync draft when drawer opens
  useEffect(() => {
    if (!open) return
    setDraft({ ...RISK_CONFIG_DEFAULTS, ...riskConfig })
    setError(null)
    setSaving(false)
  }, [open, riskConfig])

  if (!open) return null

  // ── Draft helpers ────────────────────────────────────────────────────────

  function setRiskPremium(tier: keyof RiskConfig['riskPremiumBps'], v: number) {
    setDraft(d => ({ ...d, riskPremiumBps: { ...d.riskPremiumBps, [tier]: v } }))
  }

  function setRecovery(tier: keyof RiskConfig['recoveryRate'], v: number) {
    setDraft(d => ({ ...d, recoveryRate: { ...d.recoveryRate, [tier]: v } }))
  }

  function setSchoolMult(key: keyof RiskConfig['schoolTierMultiplier'], v: number) {
    setDraft(d => ({ ...d, schoolTierMultiplier: { ...d.schoolTierMultiplier, [key]: v } }))
  }

  function setField<K extends keyof RiskConfig>(key: K, v: RiskConfig[K]) {
    setDraft(d => ({ ...d, [key]: v }))
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div style={overlay} onClick={onClose} />

      <div style={drawerStyle}>

        {/* Sticky header */}
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>
            Risk &amp; Valuation Controls
          </h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={btnSave} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button style={btnClose} onClick={onClose} title="Close">×</button>
          </div>
        </div>

        {/* Intro */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border, #e2e8f0)', fontSize: '0.85rem', color: 'var(--muted, #64748b)', lineHeight: 1.6 }}>
          These inputs serve as the system of record for platform-wide risk and valuation assumptions.
          Any updates here will apply globally to all loan calculations, affecting ROI, earnings,
          amortization, and valuation outputs across all users.
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '12px 24px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* ── 1. Risk Premiums ─────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Risk Premiums (bps added to discount rate)</h4>
          <p style={sectionDesc}>
            These premiums adjust the discount rate based on borrower risk tier, increasing it for
            higher risk to reflect uncertainty. Raising premiums makes valuations more conservative,
            lowering NPV and IRR; lowering them increases perceived value but may underestimate risk.
          </p>
          <div style={fieldGrid}>
            <Field label="Risk Premium (LOW) bps" value={draft.riskPremiumBps.LOW} onChange={v => setRiskPremium('LOW', v)} step={10}
              note="Original: 250 bps (Source: Moody's Student Loan ABS Methodology). Extra discount for LOW-risk; higher lowers NPV for high-quality loans." />
            <Field label="Risk Premium (MEDIUM) bps" value={draft.riskPremiumBps.MEDIUM} onChange={v => setRiskPremium('MEDIUM', v)} step={10}
              note="Original: 350 bps (Source: S&P Private Student Loan Benchmarks). For MEDIUM-risk; impacts portfolio NPV most." />
            <Field label="Risk Premium (HIGH) bps" value={draft.riskPremiumBps.HIGH} onChange={v => setRiskPremium('HIGH', v)} step={10}
              note="Original: 550 bps (Source: CFPB Private Student Loan Reports). For HIGH-risk; quickly reduces value of marginal loans." />
            <Field label="Risk Premium (VERY HIGH) bps" value={draft.riskPremiumBps.VERY_HIGH} onChange={v => setRiskPremium('VERY_HIGH', v)} step={10}
              note="Original: 750 bps. For VERY_HIGH-risk loans; largest discount applied." />
          </div>
        </div>

        {/* ── 2. Recovery Rates ────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Recovery Rates (%)</h4>
          <p style={sectionDesc}>
            Expected recovery percentage on defaulted loan balance. Higher recovery reduces expected
            loss and improves NPV. Based on ABS loss severity disclosures and Moody's assumptions.
          </p>
          <div style={fieldGrid}>
            <Field label="Recovery Rate — LOW (%)" value={draft.recoveryRate.LOW} onChange={v => setRecovery('LOW', v)} min={0} max={100} step={1}
              note="Original: 30%. Low-risk borrowers; higher recovery on default." />
            <Field label="Recovery Rate — MEDIUM (%)" value={draft.recoveryRate.MEDIUM} onChange={v => setRecovery('MEDIUM', v)} min={0} max={100} step={1}
              note="Original: 22%. Medium-risk borrowers." />
            <Field label="Recovery Rate — HIGH (%)" value={draft.recoveryRate.HIGH} onChange={v => setRecovery('HIGH', v)} min={0} max={100} step={1}
              note="Original: 15%. High-risk borrowers." />
            <Field label="Recovery Rate — VERY HIGH (%)" value={draft.recoveryRate.VERY_HIGH} onChange={v => setRecovery('VERY_HIGH', v)} min={0} max={100} step={1}
              note="Original: 10%. Very high-risk; lowest recovery assumption." />
          </div>
        </div>

        {/* ── 3. FICO Sensitivity ──────────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>FICO Score Sensitivity</h4>
          <p style={sectionDesc}>
            Basis point adjustment per FICO band above or below the Good (670–739) baseline.
            Higher values make the discount rate more sensitive to credit quality.
          </p>
          <div style={fieldGrid}>
            <Field label="Borrower FICO Adjustment (bps/band)" value={draft.ficoBorrowerAdjustment} onChange={v => setField('ficoBorrowerAdjustment', v)} min={0} step={5}
              note="Original: 75 bps/band. Applied to borrower FICO score bands." />
            <Field label="Cosigner FICO Adjustment (bps/band)" value={draft.ficoCosignerAdjustment} onChange={v => setField('ficoCosignerAdjustment', v)} min={0} step={5}
              note="Original: 25 bps/band. Applied to cosigner FICO score bands." />
          </div>
        </div>

        {/* ── 4. Prepayment & Duration ─────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Prepayment &amp; Duration</h4>
          <p style={sectionDesc}>
            Prepayment multiplier scales the base CPR curve. Seasoning period controls when
            prepayments begin to accelerate. Higher multiplier shortens WAL and increases IRR.
          </p>
          <div style={fieldGrid}>
            <Field label="Prepayment Multiplier" value={draft.prepaymentMultiplier} onChange={v => setField('prepaymentMultiplier', v)} min={0} max={3} step={0.1}
              note="Original: 1.0 (Source: ABS Prepayment Disclosures). >1 accelerates, <1 slows." />
            <Field label="Prepayment Seasoning (years)" value={draft.prepaySeasoningYears} onChange={v => setField('prepaySeasoningYears', v)} min={0} max={5} step={0.5}
              note="Original: 2.5 years. Months before prepayment ramp begins." />
          </div>
        </div>

        {/* ── 5. School & Outcome Thresholds ───────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>School &amp; Outcome Thresholds</h4>
          <p style={sectionDesc}>
            Thresholds used to classify schools into Tier 1 (low risk). Schools meeting both
            graduation rate and earnings thresholds receive more favorable risk treatment.
            Note: grad_rate in schoolTiers.json is stored as a decimal (0.93 = 93%).
          </p>
          <div style={fieldGrid}>
            <Field label="Graduation Rate Threshold (%)" value={draft.graduationRateThreshold} onChange={v => setField('graduationRateThreshold', v)} min={0} max={100} step={1}
              note="Original: 75. Integer percent — compared against grad_rate × 100." />
            <Field label="Earnings Threshold ($)" value={draft.earningsThreshold} onChange={v => setField('earningsThreshold', v)} min={0} step={1000}
              note="Original: $70,000. Median 10-year earnings for Tier 1 classification." />
          </div>
        </div>

        {/* ── 6. Global Macro ──────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Global Macro</h4>
          <p style={sectionDesc}>
            Macro-level assumptions that affect all loan valuations. Risk-free rate anchors
            the discount rate. CDR multiplier scales default curves globally.
          </p>
          <div style={fieldGrid}>
            <Field label="Base Risk-Free Rate (%)" value={draft.baseRiskFreeRate} onChange={v => setField('baseRiskFreeRate', v)} min={0} max={20} step={0.05}
              note="Original: 4.25% (U.S. Treasury 10-Year Yield). Anchor for all discount rates." />
            <Field label="CDR Multiplier" value={draft.cdrMultiplier} onChange={v => setField('cdrMultiplier', v)} min={0} max={5} step={0.1}
              note="Original: 1.0. Scales the cumulative default rate curve globally." />
            <Field label="Inflation Assumption (%)" value={draft.inflationAssumption} onChange={v => setField('inflationAssumption', v)} min={0} max={20} step={0.25}
              note="Original: 3.0%. Used in real return calculations." />
          </div>
        </div>

        {/* ── 7. School Tier Multipliers ───────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>School Tier Multipliers</h4>
          <p style={sectionDesc}>
            Multipliers applied to the base school bps adjustment. Tier A = Tier 1 schools
            (−75 bps base), B = Tier 2 (0 bps, neutral), C = Tier 3 (+125 bps), D = Unknown (+100 bps).
            Multiplier of 1.0 = no change to base bps.
          </p>
          <div style={fieldGrid}>
            <Field label="Tier A Multiplier (Tier 1 schools)" value={draft.schoolTierMultiplier.A} onChange={v => setSchoolMult('A', v)} min={0} max={3} step={0.1}
              note={`Original: 0.8×. Tier 1 base −75 bps → ${(-75 * draft.schoolTierMultiplier.A).toFixed(0)} bps at current setting.`} />
            <Field label="Tier B Multiplier (Tier 2 schools)" value={draft.schoolTierMultiplier.B} onChange={v => setSchoolMult('B', v)} min={0} max={3} step={0.1}
              note="Original: 1.0×. Tier 2 base 0 bps — multiplier has no effect (neutral anchor)." />
            <Field label="Tier C Multiplier (Tier 3 schools)" value={draft.schoolTierMultiplier.C} onChange={v => setSchoolMult('C', v)} min={0} max={3} step={0.1}
              note={`Original: 1.3×. Tier 3 base +125 bps → +${(125 * draft.schoolTierMultiplier.C).toFixed(0)} bps at current setting.`} />
            <Field label="Tier D Multiplier (Unknown schools)" value={draft.schoolTierMultiplier.D} onChange={v => setSchoolMult('D', v)} min={0} max={3} step={0.1}
              note={`Original: 1.5×. Unknown base +100 bps → +${(100 * draft.schoolTierMultiplier.D).toFixed(0)} bps at current setting.`} />
          </div>
        </div>

        {/* Footer spacer */}
        <div style={{ height: 40 }} />

      </div>
    </>
  )
}