import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

// Pages
import { LoginPage }          from './app/login/page'
import { MarketingPage }      from './app/marketing/page'
import { DashboardPage }      from './app/dashboard/page'
import { PayoutsPage }        from './app/dashboard/payouts/page'
import { JournalPage }        from './app/dashboard/journal/page'
import { HistoryPage }        from './app/dashboard/history/page'
import { AnalyticsPage }      from './app/dashboard/analytics/page'
import { ChallengesPage }     from './app/dashboard/challenges/page'
import { CheckoutPage }       from './app/checkout/page'
import { AccountsPage }       from './app/dashboard/accounts/page'
import { DashboardSupportPage } from './app/dashboard/support/page'
import { SettingsPage }       from './app/dashboard/settings/page'
import { PlatformPage }       from './app/platform/page'
import { AdminDashboardPage } from './app/admin/page'
import { AdminTradersPage }   from './app/admin/traders/page'
import { AdminPayoutsPage }        from './app/admin/payouts/page'
import { AdminPayoutDetailPage }   from './app/admin/payouts/[id]/page'
import { AdminRiskPage }      from './app/admin/risk/page'
import { AdminSupportPage }   from './app/admin/support/page'
import { AdminChallengePage } from './app/admin/challenges/page'
import { AdminAffiliatePage } from './app/admin/affiliates/page'
import { AdminAccountsPage }  from './app/admin/accounts/page'
import { AdminSettingsPage }  from './app/admin/settings/page'
import { AdminRevenuePage }   from './app/admin/revenue/page'
import { AffiliatePage as AffiliatesPage } from './app/dashboard/affiliate/page'
import { SupportCRMPage }     from './app/support-crm/page'
import { SupportAnalyticsPage } from './app/support-crm/analytics/page'
import { CannedResponsesPage }  from './app/support-crm/canned/page'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { session, profile, loading } = useAuth()

  // Still loading auth or profile — always show spinner, never redirect
  if (loading || (session && !profile)) return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/>
        <div className="text-[11px] text-[var(--text3)]">Loading…</div>
      </div>
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  // Profile loaded — check role
  if (roles && profile?.role && !roles.includes(profile.role)) {
    const fallback = profile.role === 'admin' ? '/admin' : profile.role === 'support' ? '/support-crm' : '/dashboard'
    return <Navigate to={fallback} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"        element={<MarketingPage />} />
      <Route path="/login"   element={<LoginPage />} />

      {/* Trader Dashboard */}
      <Route path="/dashboard"            element={<ProtectedRoute roles={['trader']}><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/payouts"    element={<ProtectedRoute roles={['trader']}><PayoutsPage /></ProtectedRoute>} />
      <Route path="/dashboard/journal"    element={<ProtectedRoute roles={['trader']}><JournalPage /></ProtectedRoute>} />
      <Route path="/dashboard/history"    element={<ProtectedRoute roles={['trader']}><HistoryPage /></ProtectedRoute>} />
      <Route path="/dashboard/analytics"  element={<ProtectedRoute roles={['trader']}><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/dashboard/challenges" element={<ProtectedRoute roles={['trader']}><ChallengesPage /></ProtectedRoute>} />
      <Route path="/checkout"            element={<ProtectedRoute roles={['trader']}><CheckoutPage /></ProtectedRoute>} />
      <Route path="/dashboard/accounts"   element={<ProtectedRoute roles={['trader']}><AccountsPage /></ProtectedRoute>} />
      <Route path="/dashboard/support"    element={<ProtectedRoute roles={['trader']}><DashboardSupportPage /></ProtectedRoute>} />
      <Route path="/dashboard/settings"   element={<ProtectedRoute roles={['trader']}><SettingsPage /></ProtectedRoute>} />

      {/* Trading Platform */}
      <Route path="/platform" element={<ProtectedRoute roles={['trader']}><PlatformPage /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin"                element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/traders"        element={<ProtectedRoute roles={['admin']}><AdminTradersPage /></ProtectedRoute>} />
      <Route path="/admin/payouts"        element={<ProtectedRoute roles={['admin','support']}><AdminPayoutsPage /></ProtectedRoute>} />
      <Route path="/admin/payouts/:id"    element={<ProtectedRoute roles={['admin','support']}><AdminPayoutDetailPage /></ProtectedRoute>} />
      <Route path="/admin/risk"           element={<ProtectedRoute roles={['admin']}><AdminRiskPage /></ProtectedRoute>} />
      <Route path="/admin/support"        element={<ProtectedRoute roles={['admin','support']}><AdminSupportPage /></ProtectedRoute>} />
      <Route path="/admin/challenges"     element={<ProtectedRoute roles={['admin']}><AdminChallengePage /></ProtectedRoute>} />
      <Route path="/admin/affiliates"     element={<ProtectedRoute roles={['admin']}><AdminAffiliatePage /></ProtectedRoute>} />
      <Route path="/admin/accounts"       element={<ProtectedRoute roles={['admin']}><AdminAccountsPage /></ProtectedRoute>} />
      <Route path="/admin/revenue"        element={<ProtectedRoute roles={['admin']}><AdminRevenuePage /></ProtectedRoute>} />
      <Route path="/dashboard/affiliates" element={<ProtectedRoute roles={['trader']}><AffiliatesPage /></ProtectedRoute>} />
      <Route path="/admin/settings"       element={<ProtectedRoute roles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />

      {/* Support CRM */}
      <Route path="/support-crm"            element={<ProtectedRoute roles={['support','admin']}><SupportCRMPage /></ProtectedRoute>} />
      <Route path="/support-crm/analytics"  element={<ProtectedRoute roles={['support','admin']}><SupportAnalyticsPage /></ProtectedRoute>} />
      <Route path="/support-crm/canned"     element={<ProtectedRoute roles={['support','admin']}><CannedResponsesPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
