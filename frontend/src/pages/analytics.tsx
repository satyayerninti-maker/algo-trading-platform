import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

const mockAnalyticsData = [
  { date: 'Mon', trades: 5, wins: 3, losses: 2, pnl: 1200 },
  { date: 'Tue', trades: 8, wins: 5, losses: 3, pnl: 2100 },
  { date: 'Wed', trades: 6, wins: 4, losses: 2, pnl: 1800 },
  { date: 'Thu', trades: 9, wins: 6, losses: 3, pnl: 2800 },
  { date: 'Fri', trades: 7, wins: 5, losses: 2, pnl: 2200 },
]

export default function Analytics() {
  return (
    <Layout>
      <div className="space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Avg Trades/Day" value="7" icon="📊" color="blue" />
          <StatCard label="Win Rate" value="68%" icon="🎯" color="green" />
          <StatCard label="Profit Factor" value="2.3" subtext="Wins/Losses ratio" icon="💹" color="purple" />
          <StatCard label="Avg P&L" value="₹1960" subtext="Per day" icon="💰" color="green" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Performance */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockAnalyticsData}>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly P&L Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockAnalyticsData}>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Breakdown</h3>
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
                {mockAnalyticsData.map((row) => (
                  <tr key={row.date} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{row.date}</td>
                    <td className="px-4 py-3 text-sm text-center">{row.trades}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{row.wins}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{row.losses}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">₹{row.pnl.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
