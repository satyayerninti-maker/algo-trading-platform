import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api-client'

interface ScanResult {
  symbol: string
  current_price: number
  sma_50: number
  sma_200: number
  golden_cross: boolean
}

export default function CreateGoldenRatio() {
  const router = useRouter()
  const { accessToken, user } = useAuth()
  const [step, setStep] = useState<'config' | 'scan' | 'select' | 'review'>('config')
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [selectedStocks, setSelectedStocks] = useState<string[]>([])
  const [strategyName, setStrategyName] = useState('Golden Cross Strategy')
  const [loading, setLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return

    try {
      setScanning(true)
      setScanError(null)
      console.log('[GoldenCross] Starting scan...')
      const response = await apiClient.scanGoldenCrossStocks(accessToken)
      console.log('[GoldenCross] Scan results:', response.data)

      if (response.data.scan_results && response.data.scan_results.length > 0) {
        setScanResults(response.data.scan_results)
        setStep('scan')
      } else {
        const errorCount = response.data.errors?.length || 0
        const errorPreview = response.data.errors?.slice(0, 3)
          ?.map((item: any) => `${item.symbol}: ${item.error}`)
          ?.join(' | ')

        setScanError(
          errorCount > 0
            ? `Scan completed with no matches. ${errorCount} symbols failed. ${errorPreview}`
            : 'No stocks matching criteria found using Zerodha historical data.'
        )
      }
    } catch (error: any) {
      console.error('[GoldenCross] Scan error:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Error scanning stocks'
      setScanError(errorMsg)
    } finally {
      setScanning(false)
    }
  }

  const toggleStock = (symbol: string) => {
    setSelectedStocks((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    )
  }

  const handleProceedToReview = () => {
    if (selectedStocks.length === 0) {
      alert('Please select at least one stock')
      return
    }
    setStep('review')
  }

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !user?.id || selectedStocks.length === 0) return

    try {
      setLoading(true)
      console.log('[GoldenCross] Creating strategy with stocks:', selectedStocks)

      // Create strategy
      const strategyData = {
        name: strategyName,
        description: `Golden Cross strategy trading ${selectedStocks.join(', ')}`,
        instruments: selectedStocks.map((symbol) => ({
          symbol,
          market: 'NSE',
          quantity: 1,
        })),
        entry_logic: {
          condition: 'sma_50 > sma_200 (Golden Cross)',
          price_type: 'market',
          timeframe: 'daily',
        },
        exit_logic: {
          condition: 'sma_50 < sma_200 (Death Cross)',
          check_interval_minutes: 60,
        },
        risk_params: {
          max_positions: selectedStocks.length,
          position_size_percent: 100 / selectedStocks.length,
        },
      }

      const response = await apiClient.createStrategy(strategyData, user.id, accessToken)
      console.log('[GoldenCross] Strategy created:', response.data)

      alert('Strategy created successfully!')
      router.push('/strategies')
    } catch (error) {
      console.error('[GoldenCross] Error creating strategy:', error)
      alert('Error creating strategy. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Golden Cross Strategy Builder</h1>
          <p className="text-gray-600 mt-2">Create a trend-following golden cross trading strategy</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4">
          {['config', 'scan', 'select', 'review'].map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step === s || ['config', 'scan', 'select', 'review'].indexOf(step) > idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {idx + 1}
              </div>
              <span className="text-sm font-medium text-gray-900 hidden md:inline">
                {['Config', 'Scan', 'Select', 'Review'][idx]}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Configuration */}
        {step === 'config' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Strategy Configuration</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">What is Golden Cross?</h3>
                <p className="text-gray-700 mb-4">
                  A Golden Cross occurs when the 50-day Simple Moving Average crosses above the 200-day Simple Moving Average. This is considered a strong bullish signal indicating a potential long-term uptrend.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Entry Rules</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      ✓
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">Stock Universe: Nifty Top 200</p>
                      <p className="text-sm text-gray-600">Limited to Indian stocks in Nifty 200 index</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      ✓
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">50-Day SMA {'>'} 200-Day SMA</p>
                      <p className="text-sm text-gray-600">Golden Cross signal - bullish trend confirmation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      ✓
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">Strong Uptrend</p>
                      <p className="text-sm text-gray-600">Price above both moving averages for confirmation</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Exit Rules</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-block w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      ✓
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">50-Day SMA {'<'} 200-Day SMA (Death Cross)</p>
                      <p className="text-sm text-gray-600">Exit when bearish signal appears. Checked hourly</p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleStartScan} className="border-t pt-6 space-y-4">
                <button
                  type="submit"
                  disabled={scanning}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {scanning ? '🔄 Scanning Stocks...' : '📊 Start Scan'}
                </button>
                {scanError && (
                  <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
                    <p className="font-semibold text-sm">Scan Error</p>
                    <p className="text-sm mt-1">{scanError}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Step 2: Scan Results */}
        {step === 'scan' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Scan Results - Golden Cross Stocks
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      50-Day SMA
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      200-Day SMA
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Golden Cross
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Select
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scanResults.map((result, idx) => (
                    <tr key={result.symbol} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {idx + 1}. {result.symbol}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">
                        ₹{result.current_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">
                        ₹{result.sma_50.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">
                        ₹{result.sma_200.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {result.golden_cross ? (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                            ✓ YES
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full">
                            ✗ NO
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStocks.includes(result.symbol)}
                          onChange={() => toggleStock(result.symbol)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-6 border-t flex gap-3">
              <button
                onClick={() => setStep('config')}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleProceedToReview}
                disabled={selectedStocks.length === 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next → ({selectedStocks.length} selected)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review Strategy</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Selected Stocks</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedStocks.map((symbol) => (
                      <span
                        key={symbol}
                        className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Entry Rules</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-1">
                    <p>• 50-Day SMA {'>'} 200-Day SMA</p>
                    <p>• Golden Cross Signal</p>
                    <p>• Nifty Top 200 only</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Exit Rules</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-1">
                    <p>• 50-Day SMA {'<'} 200-Day SMA</p>
                    <p>• Death Cross Signal</p>
                    <p>• Check: Hourly</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateStrategy} className="border-t pt-6 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? '⏳ Creating Strategy...' : '✓ Create Strategy'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
