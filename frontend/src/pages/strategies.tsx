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
  },
]

export default function StrategiesPage() {
  const { user, accessToken } = useAuth()
  const userId = user?.id

  const [strategies, setStrategies] = useState(mockStrategies)
  const [error, setError] = useState<string | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<any | null>(null)
  const [capital, setCapital] = useState('')
  const [starting, setStarting] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

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

  const handleStartStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStrategy || !capital || !userId || !accessToken) return

    try {
      setStarting(true)
      // Mock API call
      alert('Strategy started successfully!')
      setSelectedStrategy(null)
      setCapital('')
      setShowDetailModal(false)
    } catch (err: any) {
      alert('Failed to start strategy: ' + err.message)
    } finally {
      setStarting(false)
    }
  }

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
    if (name.includes('Average')) return '📊'
    if (name.includes('Momentum')) return '🚀'
    return '⚙️'
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Trading Strategies</h1>
          <p className="text-gray-600 mt-2">Manage and execute your automated trading strategies</p>
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

        {/* Create Strategy Promo */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl p-6 shadow-lg text-white overflow-hidden relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Create New Strategy</h2>
              <p className="text-blue-100 mb-4">Build Mean Reversion strategies with AI-powered stock scanning</p>
              <ul className="text-sm space-y-1 text-blue-50">
                <li>✓ Automated stock scanner</li>
                <li>✓ Smart entry/exit rules</li>
                <li>✓ Real-time execution</li>
              </ul>
            </div>
            <Link href="/strategies/create-mean-reversion">
              <button className="px-8 py-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-50 transition transform hover:scale-105 shadow-lg whitespace-nowrap">
                🚀 Start Building
              </button>
            </Link>
          </div>
        </div>

        {/* Strategies Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Available Strategies</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
              {strategies.length} total
            </span>
          </div>

          {strategies.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-lg font-semibold text-gray-900">No strategies yet</p>
              <p className="text-gray-600 mt-2">Create your first strategy to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strategies.map((strategy: any) => (
                <div
                  key={strategy.id}
                  onClick={() => {
                    setSelectedStrategy(strategy)
                    setShowDetailModal(true)
                  }}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-xl hover:border-blue-300 transition cursor-pointer transform hover:scale-103"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getStrategyIcon(strategy.name)}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{strategy.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{strategy.instruments.length} instrument(s)</p>
                      </div>
                    </div>
                    {strategy.active && (
                      <span className="inline-block h-3 w-3 bg-green-500 rounded-full animate-pulse" title="Active"></span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{strategy.description}</p>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-100">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-medium">Win Rate</p>
                      <p className="text-xl font-bold text-green-600 mt-1">{strategy.winRate}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-medium">Return</p>
                      <p className="text-xl font-bold text-blue-600 mt-1">{strategy.avgReturn}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-medium">Trades</p>
                      <p className="text-xl font-bold text-purple-600 mt-1">{strategy.totalTrades}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <RiskBadge risk={strategy.riskLevel} />
                    <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1 group">
                      View Details <span className="group-hover:translate-x-1 transition">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Strategy Detail Modal */}
      {showDetailModal && selectedStrategy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getStrategyIcon(selectedStrategy.name)}</span>
                <div>
                  <h2 className="text-2xl font-bold">{selectedStrategy.name}</h2>
                  <p className="text-blue-100 text-sm">{selectedStrategy.description}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-medium">Win Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{selectedStrategy.winRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-medium">Avg Return</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{selectedStrategy.avgReturn}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-medium">Total Trades</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{selectedStrategy.totalTrades}</p>
                </div>
              </div>

              {/* Instruments */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  📈 Trading Instruments
                </h3>
                <div className="space-y-2">
                  {selectedStrategy.instruments.map((inst: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                        {inst.symbol[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{inst.symbol}</p>
                        <p className="text-xs text-gray-600">{inst.market}</p>
                      </div>
                      <span className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        Qty: {inst.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entry & Exit Rules */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-bold text-green-900 mb-2">📥 Entry Rule</h4>
                  <p className="text-sm text-green-700">
                    {typeof selectedStrategy.entry_logic === 'object'
                      ? selectedStrategy.entry_logic.condition
                      : selectedStrategy.entry_logic}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-bold text-red-900 mb-2">📤 Exit Rule</h4>
                  <p className="text-sm text-red-700">
                    {typeof selectedStrategy.exit_logic === 'object'
                      ? `SL: ${selectedStrategy.exit_logic.stop_loss_percent}% | PT: ${selectedStrategy.exit_logic.profit_target_percent}%`
                      : selectedStrategy.exit_logic}
                  </p>
                </div>
              </div>

              {/* Risk Level */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Risk Level</p>
                <RiskBadge risk={selectedStrategy.riskLevel} />
              </div>

              {/* Start Strategy Form */}
              <form onSubmit={handleStartStrategy} className="space-y-4 border-t pt-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Capital to Allocate (₹)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={capital}
                      onChange={(e) => setCapital(e.target.value)}
                      placeholder="Enter amount"
                      min="1000"
                      step="1000"
                      required
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Minimum: ₹1,000 | Recommended: ₹10,000+</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={starting || !capital}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {starting ? '⏳ Starting...' : '▶️ Start Strategy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
