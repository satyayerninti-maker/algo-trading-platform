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

  return (
    <Layout>
      <div className="space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Strategies" value={strategies.length} icon="⚙️" color="blue" />
          <StatCard label="Active" value={strategies.filter(s => s.active).length} subtext={`${strategies.filter(s => !s.active).length} paused`} icon="▶️" color="green" />
          <StatCard label="Avg Win Rate" value={`${(strategies.reduce((s, x) => s + x.winRate, 0) / strategies.length).toFixed(1)}%`} icon="🎯" color="purple" />
          <StatCard label="Total Trades" value={strategies.reduce((s, x) => s + x.totalTrades, 0)} subtext="All strategies" icon="📊" color="blue" />
        </div>

        {/* Create Strategy Button */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">🚀 Create a New Strategy</h2>
              <p className="text-blue-100">Get started with Mean Reversion, a positional strategy for capturing oversold bounces</p>
            </div>
            <Link href="/strategies/create-mean-reversion">
              <button className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition whitespace-nowrap">
                Create Mean Reversion →
              </button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy List */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Strategies</h2>
            <div className="space-y-3">
              {strategies.length === 0 ? (
                <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
                  No strategies available
                </div>
              ) : (
                strategies.map((strategy: any) => (
                  <button
                    key={strategy.id}
                    onClick={() => setSelectedStrategy(strategy)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedStrategy?.id === strategy.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
                        <p className="text-xs text-gray-600 mt-1">{strategy.description}</p>
                      </div>
                      {strategy.active && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Win: {strategy.winRate}%</span>
                        <span className="text-gray-600">Return: {strategy.avgReturn}%</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Strategy Details - Main Panel */}
          <div className="lg:col-span-2">
            {selectedStrategy ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedStrategy.name}</h2>
                    <p className="text-gray-600 mt-1">{selectedStrategy.description}</p>
                  </div>
                  <RiskBadge risk={selectedStrategy.riskLevel} />
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Win Rate</p>
                    <p className="text-2xl font-bold text-green-600">{selectedStrategy.winRate}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Avg Return</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedStrategy.avgReturn}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Trades</p>
                    <p className="text-2xl font-bold text-purple-600">{selectedStrategy.totalTrades}</p>
                  </div>
                </div>

                {/* Instruments */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Instruments</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {selectedStrategy.instruments.map((inst: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900">{inst.symbol}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">Market: {inst.market}</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Qty: {inst.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Strategy Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Entry Logic</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 font-mono">
                      <p>{JSON.stringify(selectedStrategy.entry_logic, null, 2)}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Exit Logic</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 font-mono">
                      <p>{JSON.stringify(selectedStrategy.exit_logic, null, 2)}</p>
                    </div>
                  </div>
                </div>

                {/* Risk Parameters */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Risk Parameters</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 font-mono">
                    <p>{JSON.stringify(selectedStrategy.risk_params, null, 2)}</p>
                  </div>
                </div>

                {/* Start Strategy Form */}
                <form onSubmit={handleStartStrategy} className="border-t pt-6">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Capital to Allocate (₹)
                    </label>
                    <input
                      type="number"
                      value={capital}
                      onChange={(e) => setCapital(e.target.value)}
                      placeholder="Enter capital amount"
                      min="1000"
                      step="1000"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-600 mt-1">Minimum capital: ₹1,000</p>
                  </div>

                  <button
                    type="submit"
                    disabled={starting || !capital}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {starting ? '🔄 Starting Strategy...' : '▶️ Start Strategy'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <p className="text-4xl mb-4">📋</p>
                <p className="text-lg font-semibold text-gray-900">Select a strategy to view details</p>
                <p className="text-gray-600 mt-2">Choose from the list on the left to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
