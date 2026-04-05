import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api-client'

interface AnalyticsData {
  date: string
  trades: number
  wins: number
  losses: number
  pnl: number
}

interface AnalyticsSummary {
  total_trades: number
  total_wins: number
  total_losses: number
  win_rate: number
  total_pnl: number
  profit_factor: number
  avg_pnl_per_day: number
}

const mockAnalyticsData: AnalyticsData[] = [
  { date: 'Mon', trades: 5, wins: 3, losses: 2, pnl: 1200 },
  { date: 'Tue', trades: 8, wins: 5, losses: 3, pnl: 2100 },
  { date: 'Wed', trades: 6, wins: 4, losses: 2, pnl: 1800 },
  { date: 'Thu', trades: 9, wins: 6, losses: 3, pnl: 2800 },
  { date: 'Fri', trades: 7, wins: 5, losses: 2, pnl: 2200 },
]

const mockSummary: AnalyticsSummary = {
  total_trades: 35,
  total_wins: 23,
  total_losses: 12,
  win_rate: 65.7,
  total_pnl: 10100,
  profit_factor: 1.92,
  avg_pnl_per_day: 2020,
}

export default function Analytics() {
  const { accessToken } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>(mockAnalyticsData)
  const [summary, setSummary] = useState<AnalyticsSummary>(mockSummary)

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!accessToken) {
        return
      }

      try {
        const response = await apiClient.getZerodhaAnalytics(accessToken)
        setAnalyticsData(response.data.daily_data)
        setSummary(response.data.summary)
      } catch (error) {
        console.error('Error fetching analytics:', error)
        // Fallback to mock data
        setAnalyticsData(mockAnalyticsData)
        setSummary(mockSummary)
      }
    }

    fetchAnalytics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [accessToken])

  const avgTradesPerDay = analyticsData.length > 0
    ? (summary.total_trades / analyticsData.length).toFixed(1)
    : '0'

  return (
    <Layout>
      <div className="space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Avg Trades/Day" value={avgTradesPerDay} icon="📊" color="blue" />
          <StatCard label="Win Rate" value={`${summary.win_rate.toFixed(1)}%`} icon="🎯" color="green" />
          <StatCard label="Profit Factor" value={summary.profit_factor.toFixed(2)} subtext="Wins/Losses ratio" icon="💹" color="purple" />
          <StatCard label="Avg P&L" value={`₹${summary.avg_pnl_per_day.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} subtext="Per day" icon="💰" color="green" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Performance */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
                <Legend />
                <Bar dataKey="wins" stackId="a" fill="#10b981" />
                <Bar dataKey="losses" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* P&L Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">P&L Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
                <Legend />
                <Line type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Day</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Trades</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Wins</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Losses</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">P&L</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.map((row, idx) => (
                  <tr key={`${row.date}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{row.date}</td>
                    <td className="px-4 py-3 text-sm text-center">{row.trades}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{row.wins}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{row.losses}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${row.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{row.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats Table */}
        {analyticsData.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-gray-600">Total Trades</p>
                <p className="text-xl font-bold text-gray-900">{summary.total_trades}</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-sm text-gray-600">Total P&L</p>
                <p className="text-xl font-bold text-green-600">₹{summary.total_pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="text-sm text-gray-600">Days Traded</p>
                <p className="text-xl font-bold text-gray-900">{analyticsData.length}</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <p className="text-sm text-gray-600">Win/Loss Ratio</p>
                <p className="text-xl font-bold text-gray-900">{summary.total_wins}W / {summary.total_losses}L</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
