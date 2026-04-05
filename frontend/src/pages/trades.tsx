import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'

const mockTrades = [
  { id: 1, symbol: 'RELIANCE', side: 'BUY', qty: 10, entryPrice: 2850, exitPrice: 3000, pnl: 1500, status: 'Closed', strategy: 'MA Crossover', exitedAt: '2024-04-05 14:30' },
  { id: 2, symbol: 'INFY', side: 'SELL', qty: 15, entryPrice: 1450, exitPrice: 1420, pnl: 450, status: 'Closed', strategy: 'Mean Reversion', exitedAt: '2024-04-05 13:45' },
  { id: 3, symbol: 'TCS', side: 'BUY', qty: 8, entryPrice: 3500, exitPrice: 3635, pnl: 1080, status: 'Closed', strategy: 'Momentum', exitedAt: '2024-04-05 12:15' },
  { id: 4, symbol: 'WIPRO', side: 'BUY', qty: 20, entryPrice: 410, exitPrice: 428, pnl: 360, status: 'Closed', strategy: 'MA Crossover', exitedAt: '2024-04-05 11:00' },
  { id: 5, symbol: 'HDFC', side: 'SELL', qty: 5, entryPrice: 2600, exitPrice: 2580, pnl: 100, status: 'Closed', strategy: 'Mean Reversion', exitedAt: '2024-04-05 10:30' },
  { id: 6, symbol: 'BAJAJ', side: 'BUY', qty: 12, entryPrice: 8200, exitPrice: 8050, pnl: -1800, status: 'Closed', strategy: 'Momentum', exitedAt: '2024-04-04 15:00' },
  { id: 7, symbol: 'MARUTI', side: 'SELL', qty: 3, entryPrice: 9800, exitPrice: 9950, pnl: -450, status: 'Closed', strategy: 'MA Crossover', exitedAt: '2024-04-04 14:30' },
  { id: 8, symbol: 'SUNPHARMA', side: 'BUY', qty: 25, entryPrice: 650, exitPrice: 720, pnl: 1750, status: 'Closed', strategy: 'Mean Reversion', exitedAt: '2024-04-04 13:00' },
]

export default function Trades() {
  const closedTrades = mockTrades.filter(t => t.status === 'Closed')
  const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0)
  const wins = closedTrades.filter(t => t.pnl > 0).length
  const losses = closedTrades.filter(t => t.pnl < 0).length
  const avgWin = wins > 0 ? (closedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / wins).toFixed(0) : 0
  const avgLoss = losses > 0 ? (closedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losses).toFixed(0) : 0

  return (
    <Layout>
      <div className="space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Trades" value={closedTrades.length} icon="📝" color="blue" />
          <StatCard label="Total P&L" value={`₹${totalPnl.toLocaleString()}`} trend={totalPnl > 0 ? 'up' : 'down'} icon="💹" color={totalPnl > 0 ? 'green' : 'red'} />
          <StatCard label="Win/Loss" value={`${wins}/${losses}`} subtext={`${((wins / (wins + losses)) * 100).toFixed(1)}% win rate`} icon="📊" color="blue" />
          <StatCard label="Avg Win/Loss" value={`₹${avgWin}/₹${Math.abs(Number(avgLoss))}`} subtext="Win/Loss ratio" icon="🎯" color="purple" />
        </div>

        {/* Trades Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Symbol</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Side</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Qty</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Entry</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Exit</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Strategy</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">P&L</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Exited At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{trade.symbol}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${trade.side === 'BUY' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">{trade.qty}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">₹{trade.entryPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">₹{trade.exitPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{trade.strategy}</td>
                    <td className={`px-6 py-4 text-sm text-right font-semibold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{trade.exitedAt}</td>
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
