import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AreaProvider } from '@/contexts/AreaContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { MainLayout } from '@/components/layout/MainLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { FixedExpensesPage } from '@/pages/FixedExpensesPage'
import { SavingsPage } from '@/pages/SavingsPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { NotasPage } from '@/pages/NotasPage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transacoes" element={<TransactionsPage />} />
        <Route path="/contas-fixas" element={<FixedExpensesPage />} />
        <Route path="/porquinho" element={<SavingsPage />} />
        <Route path="/metas" element={<GoalsPage />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/anotacoes" element={<NotasPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AreaProvider>
          <ProtectedRoute>
            <MainLayout>
              <AnimatedRoutes />
            </MainLayout>
          </ProtectedRoute>
        </AreaProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
