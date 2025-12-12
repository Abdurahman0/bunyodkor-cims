import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

// Layout
import DashboardLayout from './layout/DashboardLayout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/students/Students'
import Groups from './pages/groups/Groups'
import Finance from './pages/finance/Finance'
import Users from './pages/users/Users'
import Roles from './pages/roles/Roles'
import Reports from './pages/reports/Reports'
import Contracts from './pages/contracts/Contracts'
import Settings from './pages/settings/Settings'
import GateLogs from './pages/gate/GateLogs'
import CoachPanel from './pages/coach/CoachPanel'
import StudentDetailPage from './pages/students/StudentDetailPage'
import WaitingList from './pages/waiting-list/WaitingList'

// Dev Tools (only in development)
import { DevTools } from './components/DevTools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Theme initializer component
function ThemeInitializer() {
  const { isDarkMode } = useThemeStore()

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
        containerStyle={{
          top: 20,
          left: 20,
          bottom: 20,
          right: 20,
        }}
        // @ts-expect-error - limit property exists in runtime but not in type definition
        limit={3}
      />

      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="groups" element={<Groups />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="finance" element={<Finance />} />
            <Route path="coach" element={<CoachPanel />} />
            <Route path="gate" element={<GateLogs />} />
            <Route path="waiting-list" element={<WaitingList />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Developer Tools - Only visible in development */}
      <DevTools />
    </QueryClientProvider>
  )
}

export default App
