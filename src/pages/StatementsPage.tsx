import { useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import ReportingTabs from '../components/ReportingTabs'

type StatementItem = {
  id: string
  periodLabel: string
  periodTs: number
  year: string
  reportType: string
  account: string
  program: string
  fileName: string
  pdfUrl: string
}

const statements: StatementItem[] = [
  {
    id: '2026-02',
    periodLabel: 'Feb 2026',
    periodTs: new Date('2026-02-01').getTime(),
    year: '2026',
    reportType: 'Monthly Statement',
    account: '709002',
    program: 'Education Freedom',
    fileName: 'ACT1001_709002_202602.PDF',
    pdfUrl: './public/statements/ACT1001_709002_202602.PDF',
  },
  {
    id: '2026-01',
    periodLabel: 'Jan 2026',
    periodTs: new Date('2026-01-01').getTime(),
    year: '2026',
    reportType: 'Monthly Statement',
    account: '709002',
    program: 'Education Freedom',
    fileName: 'ACT1001_709002_202601.PDF',
    pdfUrl: './public/statements/ACT1001_709002_202601.PDF',
  },
]

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
}

const inputStyle: React.CSSProperties = {
  height: 40,
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  padding: '0 12px',
  fontSize: 14,
  color: '#0f172a',
  background: '#fff',
  outline: 'none',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.3,
  color: '#64748b',
  textTransform: 'uppercase',
  padding: '14px 16px',
  borderBottom: '1px solid #e2e8f0',
  background: '#f8fafc',
}

const tdStyle: React.CSSProperties = {
  padding: '16px',
  borderBottom: '1px solid #e2e8f0',
  fontSize: 14,
  color: '#0f172a',
  verticalAlign: 'middle',
}

const actionButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 34,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
}

export default function StatementsPage() {
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('All')

  const years = useMemo(() => {
    const vals = Array.from(new Set(statements.map(s => s.year))).sort((a, b) => Number(b) - Number(a))
    return ['All', ...vals]
  }, [])

  const filteredStatements = useMemo(() => {
    const q = search.trim().toLowerCase()

    return [...statements]
      .sort((a, b) => b.periodTs - a.periodTs)
      .filter(statement => {
        const matchesYear = yearFilter === 'All' || statement.year === yearFilter

        const matchesSearch =
          q.length === 0 ||
          statement.periodLabel.toLowerCase().includes(q) ||
          statement.reportType.toLowerCase().includes(q) ||
          statement.account.toLowerCase().includes(q) ||
          statement.program.toLowerCase().includes(q) ||
          statement.fileName.toLowerCase().includes(q)

        return matchesYear && matchesSearch
      })
  }, [search, yearFilter])

  return (
    <AppShell>
      <div style={{ padding: '0 0 32px', background: '#f4f7f8', minHeight: '100%' }}>
        <div style={{ width: 'calc(100% - 32px)', margin: '0 16px' }}>
          <ReportingTabs activeTab="statements" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                Statements
              </div>
              <div style={{ marginTop: 6, fontSize: 14, color: '#64748b' }}>
                Browse and open monthly PDF statements.
              </div>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              padding: 16,
              marginBottom: 16,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 320px', minWidth: 260 }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by month, account, program, or file name"
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Year</div>
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                style={{ ...inputStyle, minWidth: 120, paddingRight: 36 }}
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={cardStyle}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Monthly Statements
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {filteredStatements.length} statement{filteredStatements.length === 1 ? '' : 's'}
              </div>
            </div>

            {filteredStatements.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                No statements match your search/filter.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Statement Month</th>
                      <th style={thStyle}>Report Type</th>
                      <th style={thStyle}>Account / Program</th>
                      <th style={thStyle}>File Name</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStatements.map(statement => (
                      <tr
                        key={statement.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => window.open(statement.pdfUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700 }}>{statement.periodLabel}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>{statement.year}</div>
                        </td>

                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{statement.reportType}</div>
                        </td>

                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>Acct {statement.account}</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>{statement.program}</div>
                        </td>

                        <td style={tdStyle}>
                          <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{statement.fileName}</div>
                        </td>

                        <td style={tdStyle}>
                          <a
                            href={statement.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={actionButtonStyle}
                            onClick={e => e.stopPropagation()}
                          >
                            View PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
