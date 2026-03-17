import { useNavigate } from 'react-router-dom'

export type ReportingTab =
  | 'marketplace'
  | 'holdings'
  | 'valuations'
  | 'bundles'
  | 'statements'

const tabs: { key: ReportingTab; label: string }[] = [
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'holdings', label: 'My Holdings' },
  { key: 'valuations', label: 'Loan Valuations' },
  { key: 'bundles', label: 'Bundles' },
  { key: 'statements', label: 'Statements' },
]

export default function ReportingTabs({ activeTab }: { activeTab: ReportingTab }) {
  const navigate = useNavigate()

  const goToTab = (tab: ReportingTab) => {
    switch (tab) {
      case 'marketplace':
        navigate('/?tab=marketplace')
        break
      case 'holdings':
        navigate('/?tab=holdings')
        break
      case 'valuations':
        navigate('/valuations')
        break
      case 'bundles':
        navigate('/?tab=bundles')
        break
      case 'statements':
        navigate('/statements')
        break
    }
  }

  return (
    <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 28, paddingLeft: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => goToTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              padding: '14px 0',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === tab.key ? '#0f172a' : '#64748b',
              borderBottom:
                activeTab === tab.key ? '2px solid #0ea5e9' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}