import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api-client'
import StatCard from '@/components/StatCard'
import Layout from '@/components/Layout'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const mockChartData = [
  { time: '9:00', pnl: 500, trades: 2 },
  { time: '10:00', pnl: 1200, trades: 4 },
  { time: '11:00', pnl: 1000, trades: 3 },
  { time: '12:00', pnl: 2100, trades: 5 },
  { time: '1:00', pnl: 1800, trades: 4 },
  { time: '2:00', pnl: 2500, trades: 6 },
  { time: '3:00', pnl: 2300, trades: 5 },
]

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const { user, accessToken, isInitialized } = useAuth()
  const router = useRouter()

  const [positions, setPositions] = useState<any[]>([])
  const [activeStrategies, setActiveStrategies] = useState<any[]>([])
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null)
  const [stopModal, setStopModal] = useState<{ show: boolean; strategyId: number | null }>({
    show: false,
    strategyId: null,
  })
  const [stopping, setStopping] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !accessToken) {
      router.push('/login')
    }
  }, [isInitialized, accessToken, router])

  // Fetch data when authenticated
  useEffect(() => {
    if (!accessToken || !user?.id) {
      return
    }

    const fetchData = async () => {
      try {
        // Fetch real positions and margins data from Zerodha
        const [positionsResponse, marginsResponse] = await Promise.all([
          apiClient.getZerodhaPositions(accessToken!).catch((err) => {
            console.error('[DEBUG] Positions fetch error:', err)
            return null
          }),
          apiClient.getZerodhaMargins(accessToken!).catch((err) => {
            console.error('[DEBUG] Margins fetch error:', err)
            return null
          }),
        ])

        console.log('[DEBUG] Positions response:', JSON.stringify(positionsResponse, null, 2))
        console.log('[DEBUG] Margins response:', JSON.stringify(marginsResponse, null, 2))

        // Parse positions data - Zerodha returns data in data.net format
        let positionsData: any[] = []
        let totalPnl = 0

        if (positionsResponse?.data?.data?.net) {
          // Net positions (overnight positions)
          positionsData = positionsResponse.data.data.net.map((pos: any) => ({
            id: pos.instrument_token,
            symbol: pos.tradingsymbol,
            quantity: pos.quantity,
            average_price: pos.average_price,
            last_price: pos.last_price,
            pnl: pos.pnl || (pos.last_price - pos.average_price) * pos.quantity,
            pnl_percent: ((pos.last_price - pos.average_price) / pos.average_price) * 100,
          }))
          totalPnl = positionsData.reduce((sum: number, p: any) => sum + p.pnl, 0)
        } else if (positionsResponse?.data?.net) {
          // Fallback - data directly in data.net
          positionsData = positionsResponse.data.net.map((pos: any) => ({
            id: pos.instrument_token,
            symbol: pos.tradingsymbol,
            quantity: pos.quantity,
            average_price: pos.average_price,
            last_price: pos.last_price,
            pnl: pos.pnl || (pos.last_price - pos.average_price) * pos.quantity,
            pnl_percent: ((pos.last_price - pos.average_price) / pos.average_price) * 100,
          }))
          totalPnl = positionsData.reduce((sum: number, p: any) => sum + p.pnl, 0)
        }

        // Parse account balance data
        let accountData = {
          total_pnl: totalPnl,
          total_positions: positionsData.length,
          total_trades: 0,
          active_strategies: 0,
          win_rate: 0,
          roi: 0,
          cash: 0,
        }

        if (marginsResponse?.data?.data?.equity) {
          const equity = marginsResponse.data.data.equity
          accountData.cash = equity.cash || 0
          accountData.total_positions = positionsData.length
        } else if (marginsResponse?.data?.equity) {
          const equity = marginsResponse.data.equity
          accountData.cash = equity.cash || 0
          accountData.total_positions = positionsData.length
        }

        console.log('[DEBUG] Parsed positions:', positionsData)
        console.log('[DEBUG] Account data:', accountData)

        setPortfolioSummary(accountData)
        setPositions(positionsData)
        setActiveStrategies([])
      } catch (err: any) {
        console.error('[DEBUG] Error fetching data:', err)
        // Do NOT fall back to mock data - show empty if there's an error
        setPortfolioSummary({
          total_pnl: 0,
          total_positions: 0,
          total_trades: 0,
          active_strategies: 0,
          win_rate: 0,
          roi: 0,
          cash: 0,
        })
        setPositions([])
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [accessToken, user?.id])

  const handleStopStrategy = (strategyId: number) => {
    setStopModal({ show: true, strategyId })
  }

  const handleConfirmStop = async (closeTrades: boolean) => {
    if (!stopModal.strategyId || !accessToken || !user?.id) return

    try {
      setStopping(true)
      await apiClient.stopStrategy(stopModal.strategyId, user.id, accessToken, closeTrades)
      setActiveStrategies((prev) => prev.filter((s) => s.id !== stopModal.strategyId))
      setStopModal({ show: false, strategyId: null })
      alert(
        closeTrades
          ? '✓ Strategy stopped. All trades have been auto-closed.'
          : '✓ Strategy stopped. Trades remain open for manual closure.'
      )
    } catch (error) {
      console.error('Error stopping strategy:', error)
      alert('Error stopping strategy')
    } finally {
      setStopping(false)
    }
  }

  if (!portfolioSummary) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin text-4xl">⚙️</div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total P&L"
          value={
            portfolioSummary?.total_pnl !== undefined
              ? `${portfolioSummary.total_pnl >= 0 ? '+' : ''}₹${(portfolioSummary.total_pnl).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '₹0.00'
          }
          trend={
            portfolioSummary?.total_pnl > 0
              ? 'up'
              : portfolioSummary?.total_pnl < 0
              ? 'down'
              : 'neutral'
          }
          icon="💹"
          color={
            portfolioSummary?.total_pnl > 0
              ? 'green'
              : portfolioSummary?.total_pnl < 0
              ? 'red'
              : 'blue'
          }
        />
        <StatCard
          label="Win Rate"
          value={`${portfolioSummary?.win_rate || 0}%`}
          subtext="Winning trades"
          icon="🎯"
          color="blue"
        />
        <StatCard
          label="ROI"
          value={`${portfolioSummary?.roi || 0}%`}
          subtext="Return on investment"
          icon="📊"
          color="purple"
        />
        <StatCard
          label="Open Positions"
          value={portfolioSummary?.total_positions || 0}
          subtext="Active trades"
          icon="📈"
          color="blue"
        />
        <StatCard
          label="Total Trades"
          value={portfolioSummary?.total_trades || 0}
          subtext="This session"
          icon="💰"
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* P&L Over Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">P&L Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trades by Strategy */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trade Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={activeStrategies}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name.split(' ')[0]} (${entry.pnl > 0 ? '+' : ''}₹${entry.pnl})`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="capital_allocated"
              >
                {activeStrategies.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Strategies */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Active Strategies</h3>
          <Link
            href="/strategies"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All →
          </Link>
        </div>
        <div className="space-y-4">
          {activeStrategies.length > 0 ? (
            activeStrategies.map((strategy) => (
              <div
                key={strategy.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{strategy.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">Capital: ₹{strategy.capital_allocated.toLocaleString()}</p>
                </div>
                <div className="text-right mr-6">
                  <p className={`text-lg font-bold ${strategy.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {strategy.pnl >= 0 ? '+' : ''}₹{strategy.pnl.toLocaleString()}
                  </p>
                  <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    Running
                  </span>
                </div>
                <button
                  onClick={() => handleStopStrategy(strategy.id)}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Stop
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No active strategies. <Link href="/strategies" className="text-blue-600 hover:underline">Start one →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Open Positions</h3>
        {positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Symbol</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Avg Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Last Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">P&L</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Return %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{position.symbol}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{position.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">₹{(position.average_price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">₹{(position.last_price || 0).toFixed(2)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {position.pnl >= 0 ? '+' : ''}₹{(position.pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${position.pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {position.pnl_percent >= 0 ? '+' : ''}{(position.pnl_percent || 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No open positions</p>
            <p className="text-sm mt-1">Your live positions will appear here</p>
          </div>
        )}
      </div>

      {/* Stop Strategy Modal */}
      {stopModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Stop Strategy</h3>

            <p className="text-gray-600 mb-6">
              How would you like to handle the trades opened by this strategy?
            </p>

            <div className="space-y-3 mb-6">
              {/* Option 1: Keep Trades Open */}
              <button
                onClick={() => handleConfirmStop(false)}
                disabled={stopping}
                className="w-full p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition text-left hover:border-blue-400"
              >
                <p className="font-semibold text-gray-900">Keep Trades Open</p>
                <p className="text-sm text-gray-600 mt-1">
                  Stop strategy but keep all open trades active. Manually close them later.
                </p>
              </button>

              {/* Option 2: Auto-Close Trades */}
              <button
                onClick={() => handleConfirmStop(true)}
                disabled={stopping}
                className="w-full p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition text-left hover:border-red-400"
              >
                <p className="font-semibold text-gray-900">Auto-Close All Trades</p>
                <p className="text-sm text-gray-600 mt-1">
                  Stop strategy and immediately close all open positions at market price.
                </p>
              </button>
            </div>

            <button
              onClick={() => setStopModal({ show: false, strategyId: null })}
              disabled={stopping}
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
