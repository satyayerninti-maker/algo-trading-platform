import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api-client'

const mockStrategies = [
  {
    id: 1,
    name: 'Moving Average Crossover',
    description: 'Buy when SMA20 > SMA50, Sell when SMA20 < SMA50',
    instruments: [{ symbol: 'RELIANCE', market: 'NSE', quantity: 1 }],
    winRate: 62,
    avgReturn: 4.2,
    totalTrades: 45,
    active: true,
    riskLevel: 'Medium',
    entry_logic: { condition: 'sma_20 > sma_50', price_type: 'market' },
    exit_logic: { stop_loss_percent: 2.0, profit_target_percent: 5.0 },
    risk_params: { max_positions: 5, position_size_percent: 10.0 },
    created_at: '2024-03-15',
  },
  {
    id: 2,
    name: 'Mean Reversion',
    description: 'Reverting to mean when price deviates 2 std devs',
    instruments: [{ symbol: 'INFY', market: 'NSE', quantity: 2 }],
    winRate: 58,
    avgReturn: 3.1,
    totalTrades: 32,
    active: true,
    riskLevel: 'Low',
    entry_logic: { condition: 'price > bb_upper', price_type: 'market' },
    exit_logic: { stop_loss_percent: 1.5, profit_target_percent: 3.0 },
    risk_params: { max_positions: 3, position_size_percent: 8.0 },
    created_at: '2024-03-10',
  },
  {
    id: 3,
    name: 'Momentum Breakout',
    description: 'Entry on price breakout above resistance with volume',
    instruments: [{ symbol: 'TCS', market: 'NSE', quantity: 1 }, { symbol: 'WIPRO', market: 'NSE', quantity: 1 }],
    winRate: 55,
    avgReturn: 5.1,
    totalTrades: 28,
    active: false,
    riskLevel: 'High',
    entry_logic: { condition: 'breakout + volume', price_type: 'limit' },
    exit_logic: { stop_loss_percent: 3.0, profit_target_percent: 7.0 },
    risk_params: { max_positions: 2, position_size_percent: 15.0 },
    created_at: '2024-03-05',
  },
]

export default function StrategiesPage() {
  const { user, accessToken } = useAuth()
  const userId = user?.id

  const [strategies, setStrategies] = useState(mockStrategies)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused'>('all')

  useEffect(() => {
    if (!accessToken || !userId) return

    const fetchStrategies = async () => {
      try {
        const response = await apiClient.listStrategies(userId, accessToken)
        setStrategies(response.data || [])
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchStrategies()
  }, [accessToken, userId])

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
          <Link href="/strategies/create-mean-reversion">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg shadow-lg transition transform hover:scale-105">
              + New Strategy
            </button>
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Strategies" value={strategies.length} icon="⚙️" color="blue" />
          <StatCard label="Active" value={strategies.filter(s => s.active).length} subtext={`${strategies.filter(s => !s.active).length} paused`} icon="▶️" color="green" />
          <StatCard label="Avg Win Rate" value={`${(strategies.reduce((s, x) => s + x.winRate, 0) / strategies.length).toFixed(1)}%`} icon="🎯" color="purple" />
          <StatCard label="Total Trades" value={strategies.reduce((s, x) => s + x.totalTrades, 0)} subtext="All strategies" icon="📊" color="blue" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

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
                            <button className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 font-semibold text-sm rounded-lg transition">
                              Stop
                            </button>
                          ) : (
                            <button className="px-3 py-2 bg-green-100 text-green-600 hover:bg-green-200 font-semibold text-sm rounded-lg transition">
                              Start
                            </button>
                          )}
                          <button className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold text-sm rounded-lg transition">
                            ⋮
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
      </div>
    </Layout>
  )
}
