import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api-client'

export default function StrategiesPage() {
  const { user, accessToken } = useAuth()
  const userId = user?.id

  const [strategies, setStrategies] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused'>('all')
  const [stopModal, setStopModal] = useState<{ visible: boolean; strategyId: number | null }>({
    visible: false,
    strategyId: null,
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{ visible: boolean; strategyId: number | null }>({
    visible: false,
    strategyId: null,
  })
  const [stopping, setStopping] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!accessToken || !userId) return

    const fetchStrategies = async () => {
      try {
        // Fetch both regular strategies and active execution strategies
        const [strategiesResponse, activeResponse] = await Promise.all([
          apiClient.listStrategies(userId, accessToken),
          apiClient.getActiveStrategies(userId, accessToken),
        ])

        let allStrategies = strategiesResponse.data || []

        // Mark strategies as active based on execution data
        if (activeResponse.data && activeResponse.data.length > 0) {
          const activeStrategyIds = new Set(activeResponse.data.map((a: any) => a.strategy_id))
          allStrategies = allStrategies.map((s: any) => ({
            ...s,
            active: activeStrategyIds.has(s.id),
          }))
        }

        // Show real data only - no mock fallback
        setStrategies(allStrategies)
      } catch (err: any) {
        console.error('Error fetching strategies:', err.message)
        // On error, show empty (no fallback to mock)
        setStrategies([])
      }
    }

    // Fetch immediately
    fetchStrategies()

    // Auto-refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchStrategies, 5000)

    return () => clearInterval(interval)
  }, [accessToken, userId])

  const handleStopStrategy = (strategyId: number) => {
    setStopModal({ visible: true, strategyId })
  }

  const handleConfirmStop = async (closeTrades: boolean) => {
    if (!accessToken || !userId || !stopModal.strategyId) return

    try {
      setStopping(true)
      await apiClient.stopStrategy(stopModal.strategyId, userId, accessToken, closeTrades)
      // Update strategy status in local state
      setStrategies((prev) =>
        prev.map((s) =>
          s.id === stopModal.strategyId ? { ...s, active: false } : s
        )
      )
      setStopModal({ visible: false, strategyId: null })
    } catch (err: any) {
      alert('Error stopping strategy: ' + err.message)
    } finally {
      setStopping(false)
    }
  }

  const handleDeleteStrategy = (strategyId: number) => {
    setDeleteConfirm({ visible: true, strategyId })
  }

  const handleConfirmDelete = async () => {
    if (!accessToken || !userId || !deleteConfirm.strategyId) return

    try {
      setDeleting(true)
      await apiClient.deleteStrategy(deleteConfirm.strategyId, userId, accessToken)
      // Remove strategy from local state
      setStrategies((prev) => prev.filter((s) => s.id !== deleteConfirm.strategyId))
      setDeleteConfirm({ visible: false, strategyId: null })
    } catch (err: any) {
      alert('Error deleting strategy: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  const filteredStrategies = strategies.filter((s) => {
    if (activeTab === 'active') return s.active
    if (activeTab === 'paused') return !s.active
    return true
  })

  const RiskBadge = ({ risk }: { risk: string }) => {
    const colors: Record<string, string> = {
      Low: 'bg-green-100 text-green-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      High: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[risk]}`}>
        {risk} Risk
      </span>
    )
  }

  const getStrategyIcon = (name: string) => {
    if (name.includes('Mean')) return '🔄'
    if (name.includes('Crossover')) return '📊'
    if (name.includes('Golden')) return '⭐'
    if (name.includes('Momentum')) return '🚀'
    if (name.includes('Breakout')) return '💥'
    return '⚙️'
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Trading Strategies</h1>
            <p className="text-gray-600 mt-2">Manage and execute your automated trading strategies</p>
          </div>
          <div className="flex gap-3">
            <div className="relative group">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg shadow-lg transition transform hover:scale-105">
                + New Strategy ▼
              </button>
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 group-hover:opacity-100 transition invisible group-hover:visible z-50">
                <Link href="/strategies/create-mean-reversion">
                  <div className="px-4 py-3 hover:bg-blue-50 border-b border-gray-200 cursor-pointer transition">
                    <p className="font-semibold text-gray-900">Mean Reversion</p>
                    <p className="text-xs text-gray-600 mt-1">RSI below 20, exit on bounce</p>
                  </div>
                </Link>
                <Link href="/strategies/create-golden-ratio">
                  <div className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition">
                    <p className="font-semibold text-gray-900">Golden Cross</p>
                    <p className="text-xs text-gray-600 mt-1">50-SMA {'>'} 200-SMA trend follow</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Strategies" value={strategies.length} icon="⚙️" color="blue" />
          <StatCard label="Active" value={strategies.filter(s => s.active).length} subtext={`${strategies.filter(s => !s.active).length} paused`} icon="▶️" color="green" />
          <StatCard label="Avg Win Rate" value={`${(strategies.reduce((s, x) => s + x.winRate, 0) / strategies.length).toFixed(1)}%`} icon="🎯" color="purple" />
          <StatCard label="Total Trades" value={strategies.reduce((s, x) => s + x.totalTrades, 0)} subtext="All strategies" icon="📊" color="blue" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All Strategies ({strategies.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'active'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Active ({strategies.filter(s => s.active).length})
          </button>
          <button
            onClick={() => setActiveTab('paused')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'paused'
                ? 'border-yellow-600 text-yellow-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Paused ({strategies.filter(s => !s.active).length})
          </button>
        </div>

        {/* Strategies Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {filteredStrategies.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-lg font-semibold text-gray-900">No strategies found</p>
              <p className="text-gray-600 mt-2">Create your first strategy to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Strategy</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Instruments</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Win Rate</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Avg Return</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Trades</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Risk</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStrategies.map((strategy: any) => (
                    <tr key={strategy.id} className="hover:bg-blue-50 transition">
                      {/* Strategy Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getStrategyIcon(strategy.name)}</span>
                          <div>
                            <p className="font-semibold text-gray-900">{strategy.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{strategy.description}</p>
                          </div>
                        </div>
                      </td>

                      {/* Instruments */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {strategy.instruments.map((inst: any, idx: number) => (
                            <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                              {inst.symbol}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Win Rate */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-lg font-bold text-green-600">{strategy.winRate}%</span>
                          </div>
                        </div>
                      </td>

                      {/* Avg Return */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600">{strategy.avgReturn}%</span>
                          </div>
                        </div>
                      </td>

                      {/* Total Trades */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-lg font-bold text-purple-600">{strategy.totalTrades}</span>
                          </div>
                        </div>
                      </td>

                      {/* Risk */}
                      <td className="px-6 py-4 text-center">
                        <RiskBadge risk={strategy.riskLevel} />
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        {strategy.active ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-semibold text-green-600">Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 bg-yellow-500 rounded-full"></span>
                            <span className="text-sm font-semibold text-yellow-600">Paused</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {strategy.active ? (
                            <button
                              onClick={() => handleStopStrategy(strategy.id)}
                              className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 font-semibold text-sm rounded-lg transition"
                            >
                              Stop
                            </button>
                          ) : (
                            <button className="px-3 py-2 bg-green-100 text-green-600 hover:bg-green-200 font-semibold text-sm rounded-lg transition cursor-not-allowed opacity-50">
                              Start
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteStrategy(strategy.id)}
                            className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 font-semibold text-sm rounded-lg transition"
                            title="Delete strategy"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-blue-900">Pro Tips</h3>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>✓ Create multiple strategies to diversify your trading approach</li>
                <li>✓ Monitor active strategies on the Dashboard</li>
                <li>✓ Pause strategies to fine-tune parameters without losing history</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stop Strategy Modal */}
        {stopModal.visible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Stop Strategy</h3>
              <p className="text-gray-600 mb-6">
                How would you like to stop this strategy?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleConfirmStop(false)}
                  disabled={stopping}
                  className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stopping ? '⏳ Processing...' : '📂 Keep Trades Open'}
                </button>
                <p className="text-xs text-gray-600 text-center">
                  Stop the strategy but keep all open trades. You can close them manually later.
                </p>
              </div>
              <div className="border-t my-4"></div>
              <div className="space-y-3">
                <button
                  onClick={() => handleConfirmStop(true)}
                  disabled={stopping}
                  className="w-full px-4 py-3 bg-red-50 border-2 border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stopping ? '⏳ Processing...' : '🔴 Auto-Close All Trades'}
                </button>
                <p className="text-xs text-gray-600 text-center">
                  Stop the strategy and automatically close all trades at current market price.
                </p>
              </div>
              <div className="border-t my-4"></div>
              <button
                onClick={() => setStopModal({ visible: false, strategyId: null })}
                disabled={stopping}
                className="w-full px-4 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete Strategy Modal */}
        {deleteConfirm.visible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-red-900 mb-4">Delete Strategy</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this strategy? This action cannot be undone.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '⏳ Deleting...' : '🗑️ Yes, Delete'}
                </button>
                <button
                  onClick={() => setDeleteConfirm({ visible: false, strategyId: null })}
                  disabled={deleting}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
