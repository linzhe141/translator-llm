import { createHashRouter, Navigate } from 'react-router'
import Setting from '@/pages/setting'
import Home from '@/pages/home'
import NotFound from './not-found'
import { useSettingsStore } from '@/store/settings'

export const router = createHashRouter([
  {
    children: [
      {
        path: '/',
        Component: () => (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ),
      },
      { path: '/settings', Component: Setting },
    ],
  },
  {
    path: '*',
    Component: NotFound,
  },
])

// eslint-disable-next-line react-refresh/only-export-components
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { apiKey, baseUrl, reasonModelID } = useSettingsStore()
  if (!apiKey || !baseUrl || !reasonModelID) {
    return <Navigate to='/settings' replace />
  }

  return children
}
