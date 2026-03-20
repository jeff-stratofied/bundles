// components/admin/AdminLoanTable.tsx
// Admin-only editable loan table using DevExtreme DataGrid.
// DO NOT modify LoanTable.tsx — that is the read-only consumer table.

import React, { useRef } from 'react'
import DataGrid, {
  Column,
  Editing,
  Sorting,
  Scrolling,
  Paging,
  HeaderFilter,
  KeyboardNavigation,
  type DataGridRef,
} from 'devextreme-react/data-grid'
import type { AdminLoan } from '../../hooks/admin/useAdminLoans'
import type { PlatformUser } from '../../hooks/admin/usePlatformConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  loans: AdminLoan[]
  schoolOptions: string[]
  users?: PlatformUser[]
  onLoanChange: (loanId: string, patch: Partial<AdminLoan>) => void
  onDelete: (loanId: string) => void
  onDuplicate: (loanId: string) => void
  onOpenEvents: (loanId: string) => void
  onOpenOwnership: (loanId: string) => void
  onOpenBorrower: (borrowerId: string, loanId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasDefault(loan: AdminLoan): boolean {
  return (loan.events ?? []).some(e => e.type === 'default')
}

function hasEvents(loan: AdminLoan): boolean {
  return (loan.events ?? []).length > 0
}

// Build ownership summary text for the ownership pill
function ownershipSummary(loan: AdminLoan): string {
  if (!loan.ownershipLots?.length) return 'Owner'
  const byUser: Record<string, { pct: number; date: string }[]> = {}
  loan.ownershipLots.forEach(lot => {
    if (!byUser[lot.user]) byUser[lot.user] = []
    byUser[lot.user].push({ pct: lot.pct, date: lot.purchaseDate ?? '' })
  })
  return Object.entries(byUser)
    .map(([user, lots]) =>
      lots
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(l => `${user} ${Math.round(l.pct * 100)}% (${l.date || '—'})`)
        .join('\n')
    )
    .join('\n')
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

// Borrower pill cell
function BorrowerCell({ data, onOpenBorrower }: { data: AdminLoan; onOpenBorrower: Props['onOpenBorrower'] }) {
  return (
    <button
      style={pillStyle}
      onClick={e => { e.stopPropagation(); onOpenBorrower(data.borrowerId, data.loanId) }}
      title="Edit borrower"
    >
      {data.borrowerId}
    </button>
  )
}

// Ownership pill cell
function OwnershipCell({ data, onOpenOwnership }: { data: AdminLoan; onOpenOwnership: Props['onOpenOwnership'] }) {
  return (
    <button
      style={{ ...pillStyle, textAlign: 'left', whiteSpace: 'pre', lineHeight: 1.3, fontSize: 11 }}
      onClick={e => { e.stopPropagation(); onOpenOwnership(data.loanId) }}
      title="Edit ownership"
    >
      {ownershipSummary(data)}
    </button>
  )
}

// Events button cell — green dot if has events, red if has default
function EventsCell({ data, onOpenEvents }: { data: AdminLoan; onOpenEvents: Props['onOpenEvents'] }) {
  const isDefault = hasDefault(data)
  const isEvents = hasEvents(data)

  const dotColor = isDefault ? '#ef4444' : '#22c55e'
  const borderColor = isDefault ? '#ef4444' : isEvents ? '#22c55e' : 'var(--input-border, #cbd5e1)'

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button
        style={{
          ...actionBtnStyle,
          borderColor,
          position: 'relative',
        }}
        onClick={e => { e.stopPropagation(); onOpenEvents(data.loanId) }}
      >
        Events
        {isEvents && (
          <span style={{
            position: 'absolute',
            top: -3, right: -3,
            width: 8, height: 8,
            borderRadius: '50%',
            background: dotColor,
          }} />
        )}
      </button>
    </div>
  )
}

// Actions cell — Duplicate + Delete
function ActionsCell({
  data,
  onDuplicate,
  onDelete,
  onOpenEvents,
}: {
  data: AdminLoan
  onDuplicate: Props['onDuplicate']
  onDelete: Props['onDelete']
  onOpenEvents: Props['onOpenEvents']
}) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <EventsCell data={data} onOpenEvents={onOpenEvents} />
      <button
        style={actionBtnStyle}
        onClick={e => { e.stopPropagation(); onDuplicate(data.loanId) }}
      >
        Duplicate
      </button>
      <button
        style={{ ...actionBtnStyle, color: '#dc2626', borderColor: '#fca5a5' }}
        onClick={e => {
          e.stopPropagation()
          onDelete(data.loanId)
        }}
      >
        Delete
      </button>
    </div>
  )
}

// Rate display: stored as decimal (0.085), show as percent (8.50)
function RateCell({ data }: { data: AdminLoan }) {
  const rate = Number(data.nominalRate ?? 0)
  const pct = rate < 1 ? rate * 100 : rate
  return <span>{pct.toFixed(2)}</span>
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const pillStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  background: 'var(--input-bg, #f8fafc)',
  border: '1px solid var(--input-border, #e5e7eb)',
  borderRadius: 8,
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: 11,
  color: 'var(--text, #0f172a)',
}

const actionBtnStyle: React.CSSProperties = {
  background: 'var(--delete-bg, #f1f5f9)',
  border: '1px solid var(--delete-border, #cbd5e1)',
  color: 'var(--text, #0f172a)',
  fontSize: '0.75rem',
  padding: '0.22rem 0.6rem',
  borderRadius: '0.35rem',
  cursor: 'pointer',
  position: 'relative',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminLoanTable({
  loans,
  schoolOptions,
  users = [],
  onLoanChange,
  onDelete,
  onDuplicate,
  onOpenEvents,
  onOpenOwnership,
  onOpenBorrower,
}: Props) {
  const gridRef = useRef<DataGridRef>(null)

  // Called by DataGrid when a cell value is committed
  function handleRowUpdating(e: any) {
    const loanId = e.key
    const patch: Partial<AdminLoan> = { ...e.newData }

    // Convert rate percent → decimal on save (user types 8.5, we store 0.085)
    if (patch.nominalRate !== undefined) {
      const v = Number(patch.nominalRate)
      patch.nominalRate = v > 1 ? v / 100 : v
    }

    onLoanChange(loanId, patch)
  }

  const loanStatusOptions = [
    { value: '',  text: '—'           },
    { value: 'S', text: 'School'      },
    { value: 'G', text: 'Grace'       },
    { value: 'R', text: 'Repayment'   },
    { value: 'D', text: 'Deferment'   },
    { value: 'F', text: 'Forbearance' },
    { value: 'C', text: 'Claim'       },
    { value: 'P', text: 'Paid'        },
  ]

  const feeWaiverOptions = [
    { value: 'none',  text: 'None'        },
    { value: 'setup', text: 'Setup Only'  },
    { value: 'grace', text: 'Grace'       },
    { value: 'all',   text: 'All'         },
  ]

  return (
    <div style={{
      background: 'var(--card, #ffffff)',
      borderRadius: '0.75rem',
      boxShadow: 'var(--shadow, 0 1px 4px rgba(0,0,0,0.08))',
      fontSize: '0.78rem',
      overflowX: 'auto',
    }}>
<DataGrid
  ref={gridRef}
  dataSource={loans}
  keyExpr="loanId"
  showBorders={false}
  showRowLines={true}
  showColumnLines={false}
  rowAlternationEnabled={false}
  hoverStateEnabled={true}
  onRowUpdating={handleRowUpdating}
  wordWrapEnabled={false}
  columnAutoWidth={true}
  columnResizingMode="widget"
  allowColumnResizing={true}
  height="calc(100vh - 220px)"
  style={{ fontSize: '0.78rem' }}
>
        <Editing
          mode="cell"
          allowUpdating={true}
          allowAdding={false}
          allowDeleting={false}
          confirmDelete={false}
        />
        <Sorting mode="multiple" />
        <Scrolling mode="virtual" rowRenderingMode="virtual" />
        <HeaderFilter visible={false} />
        <KeyboardNavigation enabled={true} enterKeyAction="moveFocus" />
        <Paging enabled={false} />  

        {/* ── Loan ID — read only ───────────────────────── */}
        <Column
          dataField="loanId"
          caption="Loan ID"
          width={90}
          allowEditing={false}
          cssClass="cell-id"
        />

        {/* ── Loan Name ─────────────────────────────────── */}
        <Column
          dataField="loanName"
          caption="Loan Name"
          minWidth={140}
        />

        {/* ── Borrower — custom pill, not editable in grid */}
        <Column
          caption="Borrower"
          width={150}
          allowEditing={false}
          allowSorting={false}
          cellRender={({ data }: { data: AdminLoan }) => (
            <BorrowerCell data={data} onOpenBorrower={onOpenBorrower} />
          )}
        />

        {/* ── Ownership — custom pill ────────────────────── */}
        <Column
          caption="Ownership"
          width={160}
          allowEditing={false}
          allowSorting={false}
          cellRender={({ data }: { data: AdminLoan }) => (
            <OwnershipCell data={data} onOpenOwnership={onOpenOwnership} />
          )}
        />

        {/* ── School — text with datalist autocomplete ───── */}
        <Column
          dataField="school"
          caption="School"
          minWidth={160}
          editCellRender={({ data, setValue }: { data: AdminLoan; setValue: (v: string) => void }) => (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                defaultValue={data.school ?? ''}
                list="admin-school-datalist"
                placeholder="Type or select school"
                onChange={e => setValue(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid var(--input-border, #cbd5e1)',
                  borderRadius: '0.45rem',
                  background: 'var(--input-bg, #fff)',
                  color: 'var(--text, #0f172a)',
                  padding: '0.25rem 0.3rem',
                  fontSize: '0.78rem',
                }}
              />
              <datalist id="admin-school-datalist">
                {schoolOptions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          )}
        />

        {/* ── Loan Start Date ───────────────────────────── */}
        <Column
          dataField="loanStartDate"
          caption="Loan Start Date"
          dataType="date"
          format="MM/dd/yyyy"
          width={140}
          editorOptions={{ displayFormat: 'yyyy-MM-dd', useMaskBehavior: true }}
        />

        {/* ── Principal ────────────────────────────────── */}
        <Column
          dataField="principal"
          caption="Orig Loan Amt"
          dataType="number"
          width={120}
          alignment="right"
          format={{ type: 'fixedPoint', precision: 2 }}
        />

        {/* ── Rate — display as %, store as decimal ──────── */}
        <Column
          dataField="nominalRate"
          caption="Rate"
          width={80}
          alignment="right"
          allowSorting={true}
          cellRender={({ data }: { data: AdminLoan }) => <RateCell data={data} />}
          editCellRender={({ data, setValue }: { data: AdminLoan; setValue: (v: number) => void }) => {
            const rate = Number(data.nominalRate ?? 0)
            const displayPct = rate < 1 ? +(rate * 100).toFixed(4) : rate
            return (
              <input
                type="number"
                step="0.01"
                defaultValue={displayPct}
                onChange={e => setValue(Number(e.target.value))}
                style={inlineInputStyle}
              />
            )
          }}
        />

        {/* ── Term ─────────────────────────────────────── */}
        <Column
          dataField="termYears"
          caption="Term (yrs)"
          dataType="number"
          width={80}
          alignment="right"
        />

        {/* ── Grace ────────────────────────────────────── */}
        <Column
          dataField="graceYears"
          caption="Grace (yrs)"
          dataType="number"
          width={85}
          alignment="right"
          editorOptions={{ step: 0.1 }}
        />

        {/* ── Loan Status ──────────────────────────────── */}
        <Column
          dataField="loanStatus"
          caption="Status"
          width={110}
          lookup={{
            dataSource: loanStatusOptions,
            valueExpr: 'value',
            displayExpr: 'text',
          }}
        />

        {/* ── Fee Waiver ────────────────────────────────── */}
        <Column
          dataField="feeWaiver"
          caption="Waive Fees"
          width={110}
          lookup={{
            dataSource: feeWaiverOptions,
            valueExpr: 'value',
            displayExpr: 'text',
          }}
        />

        {/* ── Actions — Events / Duplicate / Delete ──────── */}
        <Column
          caption="Actions"
          width={220}     
          fixedPosition="right"  
          fixed={true}
          allowEditing={false}
          allowSorting={false}
          cellRender={({ data }: { data: AdminLoan }) => (
            <ActionsCell
              data={data}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onOpenEvents={onOpenEvents}
            />
          )}
        />
      </DataGrid>
    </div>
  )
}

// ─── Shared inline input style (used in custom edit cells) ───────────────────

const inlineInputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--input-border, #cbd5e1)',
  borderRadius: '0.45rem',
  background: 'var(--input-bg, #fff)',
  color: 'var(--text, #0f172a)',
  padding: '0.25rem 0.3rem',
  fontSize: '0.78rem',
  textAlign: 'right',
}