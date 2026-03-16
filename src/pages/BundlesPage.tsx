import { useState } from 'react'
import DrawerShell from '../components/DrawerShell'
import { useUser } from '../context/UserContext'
import { useBundleBuilder } from '../hooks/useBundleBuilder'
import { useBundles, type Bundle } from '../hooks/useBundles'
import {
  BUNDLE_STRATEGIES,
  generateBundleName,
} from '../utils/bundleStrategies'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt$ = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const fmtPct = (n: number, d = 2) => `${Number(n || 0).toFixed(d)}%`

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft:   { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  offered: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  sold:    { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: color ?? '#0f172a' }}>{value}</div>
    </div>
  )
}

function RiskMiniBar({ riskMix }: { riskMix: Record<string, number> }) {
  const total = Object.values(riskMix).reduce((s, v) => s + v, 0)
  if (total === 0) return null
  const RISK_COLORS: Record<string, string> = {
    LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626', VERY_HIGH: '#7c3aed', UNKNOWN: '#94a3b8'
  }
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
      {Object.entries(riskMix).map(([tier, count]) => (
        <div
          key={tier}
          title={`${tier}: ${count}`}
          style={{
            flex: count / total,
            background: RISK_COLORS[tier] ?? '#94a3b8',
            minWidth: 4,
          }}
        />
      ))}
    </div>
  )
}

function BundleStatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.draft
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    }}>
      {status.toUpperCase()}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BundlesContent() {
  const { userId } = useUser()

  const PLATFORM_USERS = ['jeff', 'nick', 'john', 'market', 'shane']
  const buyerOptions = PLATFORM_USERS.filter(u => u !== userId)

  const {
    loansLoading,
    bundlesLoading,
    saving,
    builderOpen,
    setBuilderOpen,
    editingBundle,
    selectedStrategy,
    selectedLoanIds,
    bundleName,
    setBundleName,
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
  } = useBundleBuilder(userId)

  const loading = loansLoading || bundlesLoading

  const S = {
    page: { padding: '20px 24px', maxWidth: 1200, margin: '0 auto' } as React.CSSProperties,
    sectionTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '24px 0 12px' } as React.CSSProperties,
    card: {
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      boxShadow: '0 1px 4px rgba(15,23,42,0.06)', padding: '16px 18px',
      marginBottom: 10,
    } as React.CSSProperties,
    th: {
      padding: '7px 10px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700,
      color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    td: {
      padding: '8px 10px', fontSize: 12, borderBottom: '1px dashed rgba(15,23,42,0.05)',
      verticalAlign: 'middle' as const,
    } as React.CSSProperties,
    btn: (color: string) => ({
      padding: '7px 14px', borderRadius: 8, border: 'none',
      background: color, color: '#fff', fontSize: 12, fontWeight: 600,
      cursor: 'pointer',
    }) as React.CSSProperties,
    outlineBtn: {
      padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
      background: '#fff', color: '#475569', fontSize: 12, fontWeight: 500,
      cursor: 'pointer',
    } as React.CSSProperties,
  }

  return (
    <>
      <div style={S.page}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Package your loans into bundles and offer them to other investors.
            </p>
          </div>
          <button type="button" style={S.btn('#2563eb')} onClick={() => openNewBundle(buyerOptions[0] ?? '')}>
            + New Bundle
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading…</div>
        )}

        {!loading && (
          <>
            {offeredToMe.length > 0 && (
              <>
                <div style={S.sectionTitle}>📬 Offered to You ({offeredToMe.length})</div>
                {offeredToMe.map(bundle => (
                  <BundleCard
                    key={bundle.bundleId}
                    bundle={bundle}
                    isOwn={false}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onMarkSold={() => {}}
                    S={S}
                  />
                ))}
              </>
            )}

            <div style={S.sectionTitle}>
              My Bundles ({myBundles.length})
            </div>

            {myBundles.length === 0 && (
              <div style={{
                ...S.card, textAlign: 'center', padding: '48px 24px',
                color: '#64748b', fontSize: 14,
              }}>
                No bundles yet. Click <b>+ New Bundle</b> to get started.
              </div>
            )}

            {myBundles.map(bundle => (
              <BundleCard
                key={bundle.bundleId}
                bundle={bundle}
                isOwn={true}
                onEdit={() => openEditBundle(bundle)}
                onDelete={() => handleDelete(bundle.bundleId)}
                onMarkSold={(saleType) => handleMarkSold(bundle, saleType)}
                S={S}
              />
            ))}
          </>
        )}
      </div>

      {builderOpen && (
        <DrawerShell
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          title={editingBundle ? `Edit: ${editingBundle.bundleName}` : 'New Bundle'}
          subTitle="Select a strategy, pick loans, and set your asking price."
          width={780}
          headerActions={
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={S.outlineBtn} onClick={() => setBuilderOpen(false)}>Cancel</button>
              <button type="button" style={S.btn('#475569')} onClick={() => handleSave('draft')} disabled={saving}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button type="button" style={S.btn('#2563eb')} onClick={() => handleSave('offered')} disabled={saving}>
                {saving ? 'Saving…' : 'List for Sale'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
                  Strategy
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {BUNDLE_STRATEGIES.map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleStrategyChange(s.key)}
                      style={{
                        padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                        border: `2px solid ${selectedStrategy === s.key ? s.color : '#e2e8f0'}`,
                        background: selectedStrategy === s.key ? `${s.color}12` : '#fff',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 14 }}>{s.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{s.description}</div>
                      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 600, color: s.pricingBias === 'premium' ? '#16a34a' : s.pricingBias === 'discount' ? '#dc2626' : '#475569' }}>
                        Typical: {s.pricingBias === 'par' ? 'Par' : `${s.defaultPremiumPct > 0 ? '+' : ''}${s.defaultPremiumPct}%`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>Loans {selectedStrategy !== 'custom' ? '(strategy filtered)' : ''}</span>
                <button type="button" onClick={selectAll} style={{ ...S.outlineBtn, fontSize: 10, padding: '3px 8px' }}>
                  Select All ({filteredLoans.length})
                </button>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'auto', maxHeight: 360 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['', 'Loan', 'Rate', 'WAL', 'Risk', 'NPV'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                          No loans match this strategy
                        </td>
                      </tr>
                    )}

                    {filteredLoans.map(loan => {
                      const isSelected = selectedLoanIds.has(loan.loanId)
                      const isLocked = lockedLoanIds.has(loan.loanId) && !isSelected

                      return (
                        <tr
                          key={loan.loanId}
                          onClick={() => !isLocked && toggleLoan(loan.loanId)}
                          style={{
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            background: isSelected ? '#eff6ff' : 'transparent',
                            opacity: isLocked ? 0.4 : 1,
                            transition: 'background 0.1s',
                          }}
                        >
                          <td style={S.td}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isLocked}
                              onChange={() => !isLocked && toggleLoan(loan.loanId)}
                              onClick={e => e.stopPropagation()}
                            />
                          </td>
                          <td style={{ ...S.td, fontWeight: 600 }}>
                            <div>{loan.loanName}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{loan.school}</div>
                          </td>
                          <td style={S.td}>{fmtPct(loan.nominalRate)}</td>
                          <td style={S.td}>{Number(loan.wal || 0).toFixed(1)}y</td>
                          <td style={S.td}>
                            <span style={{ fontSize: 10, fontWeight: 700,
                              color: loan.riskTier === 'LOW' ? '#16a34a' : loan.riskTier === 'MEDIUM' ? '#d97706' : loan.riskTier === 'HIGH' ? '#dc2626' : '#7c3aed'
                            }}>
                              {loan.riskTier}
                            </span>
                          </td>
                          <td style={{ ...S.td, textAlign: 'right' }}>{fmt$(loan.npv || 0)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div style={{ ...S.card, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
                  Bundle Stats — {selectedLoans.length} loan{selectedLoans.length !== 1 ? 's' : ''} selected
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <StatPill label="Remaining Bal" value={fmt$(stats.totalPar)} />
                  <StatPill label="Wtd Rate" value={fmtPct(stats.weightedRate)} />
                  <StatPill label="WAL" value={`${stats.bundleWAL.toFixed(1)} yrs`} />
                  <StatPill label="Bundle NPV" value={fmt$(stats.bundleNPV)} color="#2563eb" />
                  <StatPill label="Schools" value={String(stats.schoolCount)} />
                  <StatPill label="Loans" value={String(selectedLoans.length)} />
                </div>
                <RiskMiniBar riskMix={stats.riskMix} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, color: '#64748b' }}>
                  {Object.entries(stats.riskMix).map(([tier, count]) => (
                    <span key={tier}>{tier}: {count}</span>
                  ))}
                </div>
              </div>

              <div style={{ ...S.card, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
                  Pricing
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Suggested Price (NPV-based)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>{fmt$(stats.suggestedPrice)}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
  {defaultPremiumPct >= 0 ? '+' : ''}{fmtPct(defaultPremiumPct)} typical strategy premium
</div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={useCustomPrice}
                    onChange={e => setUseCustomPrice(e.target.checked)}
                  />
                  Set custom premium / discount %
                </label>

                {useCustomPrice && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="range"
                        min={-20}
                        max={20}
                        step={0.5}
                        value={customPremiumPct}
                        onChange={e => setCustomPremiumPct(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="number"
                        value={customPremiumPct}
                        step={0.5}
                        onChange={e => setCustomPremiumPct(Number(e.target.value))}
                        style={{ width: 64, padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
                      />
                      <span style={{ fontSize: 12, color: '#475569' }}>%</span>
                    </div>
                  </div>
                )}

                <div style={{
                  background: '#f8fafc', borderRadius: 8, padding: '12px 14px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Asking Price</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{fmt$(askingPrice)}</div>
                  <div style={{ fontSize: 11, color: effectivePremiumPct >= 0 ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                    {effectivePremiumPct >= 0 ? '+' : ''}{fmtPct(effectivePremiumPct)} vs par
                    {effectivePremiumPct > 0 ? ' (Premium)' : effectivePremiumPct < 0 ? ' (Discount)' : ' (Par)'}
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
                  Bundle Details
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Bundle Name
                  </label>
                  <input
                    type="text"
                    value={bundleName}
                    onChange={e => setBundleName(e.target.value)}
                    placeholder={generateBundleName(selectedStrategy, stats)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                    Leave blank to auto-generate
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Target Buyer
                  </label>
                  <select
                    value={targetBuyer}
                    onChange={e => setTargetBuyer(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  >
                    <option value="any">Any (Public Sale)</option>
                    {buyerOptions.map(u => (
                      <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Optional notes for the buyer…"
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </DrawerShell>
      )}
    </>
  )
}

export default BundlesContent

function BundleCard({
  bundle, isOwn, onEdit, onDelete, onMarkSold, S,
}: {
  bundle: Bundle
  isOwn: boolean
  onEdit: () => void
  onDelete: () => void
  onMarkSold: (saleType: 'private' | 'public') => void
  S: any
}) {
  const [expanded, setExpanded] = useState(false)
  const stratDef = BUNDLE_STRATEGIES.find(s => s.key === bundle.strategy)
  const fmt$ = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  return (
    <div style={{ ...S.card, cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{stratDef?.icon ?? '📦'}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{bundle.bundleName}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {bundle.bundleId} · Created {new Date(bundle.createdAt).toLocaleDateString()} · {isOwn ? `→ ${bundle.targetBuyer}` : `from ${bundle.createdBy}`}
              </div>
            </div>
            <BundleStatusBadge status={bundle.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, auto)', gap: '0 24px', marginBottom: 8 }}>
            <StatPill label="Asking Price" value={fmt$(bundle.askingPrice)} color="#2563eb" />
            <StatPill label="Par Value" value={fmt$(bundle.totalPar)} />
            <StatPill
              label="Premium"
              value={`${bundle.askingPremiumPct >= 0 ? '+' : ''}${bundle.askingPremiumPct.toFixed(2)}%`}
              color={bundle.askingPremiumPct > 0 ? '#16a34a' : bundle.askingPremiumPct < 0 ? '#dc2626' : '#475569'}
            />
            <StatPill label="WAL" value={`${bundle.bundleWAL.toFixed(1)}y`} />
            <StatPill label="Loans" value={String(bundle.loans.length)} />
          </div>

          <RiskMiniBar riskMix={bundle.riskMix} />
        </div>

        <div style={{ display: 'flex', gap: 6, marginLeft: 16, flexShrink: 0 }}>
          <button type="button" style={S.outlineBtn} onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Hide' : 'View'} Loans
          </button>
          {isOwn && (
            <>
              <button type="button" style={S.outlineBtn} onClick={onEdit}>Edit</button>
              {bundle.status === 'offered' && (
                <button
                  type="button"
                  style={S.btn(bundle.targetBuyer === 'any' ? '#0891b2' : '#16a34a')}
                  onClick={() => onMarkSold(bundle.targetBuyer === 'any' ? 'public' : 'private')}
                >
                  {bundle.targetBuyer === 'any' ? '🌐 Public Sale' : '✓ Private Sale'}
                </button>
              )}
              <button type="button" style={{ ...S.outlineBtn, color: '#dc2626', borderColor: '#fecaca' }} onClick={onDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Loan', 'School', '% Owned', 'Rate', 'WAL', 'Risk', 'NPV', 'Asking'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bundle.loans.map(loan => (
                <tr key={loan.loanId}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{loan.loanName}</td>
                  <td style={S.td}>{loan.school}</td>
                  <td style={S.td}>{(loan.ownershipPct * 100).toFixed(0)}%</td>
                  <td style={S.td}>{loan.nominalRate.toFixed(2)}%</td>
                  <td style={S.td}>{loan.wal.toFixed(1)}y</td>
                  <td style={S.td}>
                    <span style={{ fontSize: 10, fontWeight: 700,
                      color: loan.riskTier === 'LOW' ? '#16a34a' : loan.riskTier === 'MEDIUM' ? '#d97706' : loan.riskTier === 'HIGH' ? '#dc2626' : '#7c3aed'
                    }}>
                      {loan.riskTier}
                    </span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' }}>{fmt$(loan.npv)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                    {fmt$(loan.npv * (1 + bundle.askingPremiumPct / 100))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bundle.notes && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
              Notes: {bundle.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}