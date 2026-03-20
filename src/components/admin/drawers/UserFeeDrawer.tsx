// components/admin/drawers/UserFeeDrawer.tsx
// Manage platform users (add/delete/edit role/waiver) and platform fees.
// Matches the live admin.html User & Fee Management drawer exactly.

import React, { useState, useEffect } from 'react'
import type { PlatformConfig, PlatformUser } from '../../../hooks/admin/usePlatformConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  platformConfig: PlatformConfig | null
  open: boolean
  onClose: () => void
  onSave: (updated: PlatformConfig) => Promise<void>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = ['lender', 'investor', 'customer', 'market']

const FEE_WAIVER_OPTIONS = [
  { value: 'none',          label: 'None' },
  { value: 'setup',         label: 'Setup Only' },
  { value: 'grace',         label: 'Grace' },
  { value: 'grace_deferral',label: 'Grace & Deferral' },
  { value: 'all',           label: 'All Fees' },
]

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

const sectionTitle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  margin: '0 0 16px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--input-border, #cbd5e1)',
  borderRadius: '0.45rem',
  background: 'var(--input-bg, #fff)',
  color: 'var(--text, #0f172a)',
  padding: '0.4rem 0.5rem',
  fontSize: '0.88rem',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  padding: '0.3rem 0.4rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  color: 'var(--muted, #64748b)',
  marginBottom: 6,
  fontWeight: 500,
}

const btnGreen: React.CSSProperties = {
  background: '#22c55e',
  border: 'none',
  color: '#fff',
  padding: '9px 18px',
  borderRadius: 999,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.88rem',
  whiteSpace: 'nowrap',
}

const btnGhost: React.CSSProperties = {
  background: 'var(--delete-bg, #f1f5f9)',
  border: '1px solid var(--border, #e2e8f0)',
  color: 'var(--text, #0f172a)',
  padding: '9px 18px',
  borderRadius: 999,
  cursor: 'pointer',
  fontSize: '0.88rem',
  whiteSpace: 'nowrap',
}

const btnRed: React.CSSProperties = {
  background: '#ef4444',
  border: 'none',
  color: '#fff',
  padding: '6px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const tableHeader: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 700,
  color: 'var(--muted, #64748b)',
  padding: '8px 6px',
  textAlign: 'left',
  borderBottom: '1px solid var(--border, #e2e8f0)',
  whiteSpace: 'nowrap',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserFeeDrawer({ platformConfig, open, onClose, onSave }: Props) {
  // Local draft state
  const [users, setUsers]           = useState<PlatformUser[]>([])
  const [setupFee, setSetupFee]     = useState('')
  const [servicingBps, setServicingBps] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Add user form
  const [newId, setNewId]     = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('customer')

  // Populate from platformConfig when drawer opens
  useEffect(() => {
    if (!open || !platformConfig) return
    setUsers(platformConfig.users.map(u => ({ ...u })))
    setSetupFee(String(platformConfig.fees.setupFee ?? 150))
    setServicingBps(String(platformConfig.fees.monthlyServicingBps ?? 25))
    setError(null)
    setSaving(false)
  }, [open, platformConfig])

  if (!open || !platformConfig) return null

  // ── User mutations ────────────────────────────────────────────────────────

  function updateUser(id: string, field: keyof PlatformUser, value: any) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u))
  }

  function addUser() {
    const id = newId.trim().toLowerCase()
    if (!id) { setError('User ID is required'); return }
    if (users.find(u => u.id === id)) { setError(`User "${id}" already exists`); return }
    setUsers(prev => [...prev, {
      id,
      name: newName.trim() || id,
      role: newRole,
      feeWaiver: 'none',
      active: true,
    }])
    setNewId('')
    setNewName('')
    setNewRole('customer')
    setError(null)
  }

  function deleteUser(id: string) {
    if (!window.confirm(`Delete user "${id}"?`)) return
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const updated: PlatformConfig = {
        fees: {
          setupFee: Number(setupFee) || 150,
          monthlyServicingBps: Number(servicingBps) || 25,
        },
        users,
      }
      await onSave(updated)
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
      {/* Overlay */}
      <div style={overlay} onClick={onClose} />

      {/* Drawer */}
      <div style={drawerStyle}>

        {/* Sticky header */}
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>
            User &amp; Fee Management
          </h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGreen} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save & Close'}
            </button>
            <button style={btnGhost} onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{ padding: '24px 24px 40px' }}>

          {/* Error */}
          {error && (
            <div style={{
              color: '#dc2626', fontSize: '0.85rem',
              marginBottom: 16, padding: '8px 12px',
              background: 'rgba(239,68,68,0.08)',
              borderRadius: 8, border: '1px solid #fca5a5',
            }}>
              {error}
            </div>
          )}

          {/* ── Add New User ──────────────────────────────────────────── */}
          <div style={{
            background: 'color-mix(in srgb, var(--card,#fff) 85%, var(--muted,#94a3b8) 15%)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 32,
          }}>
            <h4 style={{ margin: '0 0 14px', fontWeight: 700 }}>Add New User</h4>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label style={labelStyle}>User ID (lowercase)</label>
                <input
                  type="text"
                  placeholder="User ID (lowercase)"
                  value={newId}
                  onChange={e => setNewId(e.target.value.toLowerCase())}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={labelStyle}>Display Name</label>
                <input
                  type="text"
                  placeholder="Display Name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: '0 0 140px' }}>
                <label style={labelStyle}>Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={selectStyle}>
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <button style={btnGreen} onClick={addUser}>Add User</button>
            </div>
          </div>

          {/* ── Platform Fees ──────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <h4 style={sectionTitle}>Platform Fees</h4>
            <div style={{ display: 'grid', gap: 16, maxWidth: 440 }}>
              <div>
                <label style={labelStyle}>Setup Fee (one-time per lot)</label>
                <input
                  type="number"
                  min={0} step={1}
                  value={setupFee}
                  onChange={e => setSetupFee(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Monthly Servicing (basis points)</label>
                <input
                  type="number"
                  min={0} step={1}
                  value={servicingBps}
                  onChange={e => setServicingBps(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* ── Users & Waivers ────────────────────────────────────────── */}
          <div>
            <h4 style={sectionTitle}>Users &amp; Waivers</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={tableHeader}>ID</th>
                  <th style={tableHeader}>Name</th>
                  <th style={tableHeader}>Role</th>
                  <th style={{ ...tableHeader, textAlign: 'center' }}>Active</th>
                  <th style={tableHeader}>Fee Waiver</th>
                  <th style={tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    {/* ID — read only */}
                    <td style={{ padding: '8px 6px', color: 'var(--muted)', fontSize: '0.82rem' }}>
                      {u.id}
                    </td>

                    {/* Name */}
                    <td style={{ padding: '6px' }}>
                      <input
                        type="text"
                        value={u.name ?? u.id}
                        onChange={e => updateUser(u.id, 'name', e.target.value)}
                        style={{ ...inputStyle, minWidth: 80 }}
                      />
                    </td>

                    {/* Role */}
                    <td style={{ padding: '6px' }}>
                      <select
                        value={u.role}
                        onChange={e => updateUser(u.id, 'role', e.target.value)}
                        style={{ ...selectStyle, minWidth: 90 }}
                      >
                        {ROLE_OPTIONS.map(r => (
                          <option key={r} value={r}>{r.slice(0,4)}</option>
                        ))}
                      </select>
                    </td>

                    {/* Active */}
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={u.active !== false}
                        onChange={e => updateUser(u.id, 'active', e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </td>

                    {/* Fee Waiver */}
                    <td style={{ padding: '6px' }}>
                      <select
                        value={u.feeWaiver ?? 'none'}
                        onChange={e => updateUser(u.id, 'feeWaiver', e.target.value)}
                        style={{ ...selectStyle, minWidth: 120 }}
                      >
                        {FEE_WAIVER_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Delete */}
                    <td style={{ padding: '6px' }}>
                      <button style={btnRed} onClick={() => deleteUser(u.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  )
}