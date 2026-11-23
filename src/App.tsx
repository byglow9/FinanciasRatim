import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AreaProvider } from '@/contexts/AreaContext'
import { CycleProvider } from '@/contexts/CycleContext'
import { LimitAlertsProvider } from '@/contexts/LimitAlertsContext'
import { VintemProvider } from '@/contexts/VintemContext'
import { LaunchProvider } from '@/contexts/LaunchContext'
import { ToastProvider } from '@/components/ui/toast'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { FixedExpensesPage } from '@/pages/FixedExpensesPage'
import { SavingsPage } from '@/pages/SavingsPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { CouplePage } from '@/pages/CouplePage'
import { VintemTestPage } from '@/pages/VintemTestPage'

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
        <Route path="/casal" element={<CouplePage />} />
        <Route path="/vintem-teste" element={<VintemTestPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AreaProvider>
            <ProtectedRoute>
              <CycleProvider>
                <LimitAlertsProvider>
                  <VintemProvider>
                    <LaunchProvider>
                      <AppShell>
                        <AnimatedRoutes />
                      </AppShell>
                    </LaunchProvider>
                  </VintemProvider>
                </LimitAlertsProvider>
              </CycleProvider>
            </ProtectedRoute>
          </AreaProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
