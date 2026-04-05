import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/hooks/useAuth'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Strategies', href: '/strategies', icon: '⚙️' },
  { name: 'Positions', href: '/positions', icon: '📈' },
  { name: 'Trades', href: '/trades', icon: '💰' },
  { name: 'Analytics', href: '/analytics', icon: '📉' },
  { name: 'Broker', href: '/broker', icon: '🐂' },
]

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!user) {
    return <div>{children}</div>
  }

  const currentPath = router.pathname

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 shadow-xl`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📈</div>
            {sidebarOpen && <h1 className="text-xl font-bold">TradeBot</h1>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = currentPath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          {sidebarOpen ? '◄' : '►'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex justify-between items-center px-8 py-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {navigation.find((n) => n.href === currentPath)?.name || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout()
                  router.push('/login')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
