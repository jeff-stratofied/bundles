import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import AmortDetailPage from './pages/AmortDetailPage'
import EarningsDetailPage from './pages/EarningsDetailPage'
import ReportingPage from './pages/ReportingPage'
import RoiDetailPage from './pages/RoiDetailPage'
import LoanValuationPage from './pages/LoanValuationPage'
import BundlesPage from './pages/BundlesPage'
import StatementsPage from './pages/StatementsPage'
import AdminPage from './pages/AdminPage'


function App() {
  return (
    <UserProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<ReportingPage />} />
          <Route path="/roi" element={<RoiDetailPage />} />
          <Route path="/earnings" element={<EarningsDetailPage />} />
          <Route path="/amort" element={<AmortDetailPage />} />
          <Route path="/valuations" element={<LoanValuationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/bundles" element={<BundlesPage />} />
          <Route path="/statements" element={<StatementsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App
