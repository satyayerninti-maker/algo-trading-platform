import { useState } from 'react'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'

const mockPositions = [
  { id: 1, symbol: 'RELIANCE', qty: 10, entry: 2850, current: 3000, pnl: 1500, pnlPct: 5.26, strategy: 'MA Crossover', date: '2024-04-05' },
  { id: 2, symbol: 'INFY', qty: 15, entry: 1450, current: 1420, pnl: -450, pnlPct: -2.07, strategy: 'Mean Reversion', date: '2024-04-05' },
  { id: 3, symbol: 'TCS', qty: 8, entry: 3500, current: 3635, pnl: 1080, pnlPct: 3.86, strategy: 'Momentum', date: '2024-04-04' },
  { id: 4, symbol: 'WIPRO', qty: 20, entry: 410, current: 428, pnl: 360, pnlPct: 4.39, strategy: 'MA Crossover', date: '2024-04-04' },
  { id: 5, symbol: 'HDFC', qty: 5, entry: 2600, current: 2580, pnl: -100, pnlPct: -0.77, strategy: 'Mean Reversion', date: '2024-04-03' },
]

export default function Positions() {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? mockPositions : filter === 'wins' ? mockPositions.filter(p => p.pnl > 0) : mockPositions.filter(p => p.pnl < 0)
  const totalPnl = filtered.reduce((sum, p) => sum + p.pnl, 0)
  const winCount = filtered.filter(p => p.pnl > 0).length
  const avgReturn = filtered.length > 0 ? (filtered.reduce((sum, p) => sum + p.pnlPct, 0) / filtered.length).toFixed(2) : 0

  return (
    <Layout>
      <div className="space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Positions" value={filtered.length} icon="📍" color="blue" />
          <StatCard label="Net P&L" value={`₹${totalPnl.toLocaleString()}`} trend={totalPnl > 0 ? 'up' : 'down'} icon="💰" color={totalPnl > 0 ? 'green' : 'red'} />
          <StatCard label="Winning Trades" value={winCount} subtext={`${((winCount / filtered.length) * 100).toFixed(1)}% win rate`} icon="🎯" color="green" />
          <StatCard label="Avg Return" value={`${avgReturn}%`} icon="📈" color="purple" />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3">
          {['all', 'wins', 'losses'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All Positions' : f === 'wins' ? 'Profitable' : 'Losses'}
            </button>
          ))}
        </div>

        {/* Positions Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Symbol</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Quantity</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Entry</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Current</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Strategy</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">P&L</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Return %</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((pos) => (
                  <tr key={pos.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{pos.symbol}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">{pos.qty}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">₹{pos.entry.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">₹{pos.current.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{pos.strategy}</td>
                    <td className={`px-6 py-4 text-sm text-right font-semibold ${pos.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pos.pnl >= 0 ? '+' : ''}₹{pos.pnl.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 text-sm text-right font-semibold ${pos.pnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="px-3 py-1 text-sm font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors">
                        Close
                      </button>
                    </td>
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
