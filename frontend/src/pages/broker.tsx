import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api-client'

export default function BrokerSettings() {
  const { accessToken, isAuthenticated, isInitialized } = useAuth()
  const router = useRouter()
  const [brokerAccount, setBrokerAccount] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isLinked, setIsLinked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const callbackProcessedRef = useRef(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (isInitialized && !accessToken) {
      router.push('/login')
    }
  }, [isInitialized, accessToken, router])

  const checkBrokerStatus = useCallback(async () => {
    if (!accessToken) return
    try {
      const response = await apiClient.getZerodhaAccount(accessToken)
      setBrokerAccount(response.data)
      setIsLinked(true)
      console.log('[DEBUG] Broker status loaded:', response.data)
    } catch (err: any) {
      console.log('[DEBUG] No broker account linked yet')
      setIsLinked(false)
    }
  }, [accessToken])

  // Handle OAuth callback - runs BEFORE any other effects
  useEffect(() => {
    if (!router.isReady || !accessToken) return

    const { request_token, status } = router.query

    if (request_token && status === 'authenticated' && !callbackProcessedRef.current) {
      callbackProcessedRef.current = true
      console.log('[DEBUG] OAuth callback detected, processing...')

      handleOAuthCallback(request_token as string, accessToken)
    }
  }, [router.isReady, accessToken])

  // Check broker status on mount/when authenticated
  useEffect(() => {
    if (!router.isReady || !isAuthenticated || !accessToken) return

    const { request_token } = router.query
    // Skip checking status if we're in the middle of OAuth callback
    if (request_token && !callbackProcessedRef.current) return

    console.log('[DEBUG] Checking broker status on mount')
    checkBrokerStatus()
  }, [router.isReady, isAuthenticated, accessToken])

  const handleOAuthCallback = async (requestToken: string, token: string) => {
    try {
      setLoading(true)
      setError(null)
      console.log('[DEBUG] Exchanging OAuth token with request_token:', requestToken.substring(0, 20))

      const response = await apiClient.exchangeZerodhaToken(requestToken, token)
      console.log('[DEBUG] Exchange response:', response.data)

      if (response.data?.status === 'success') {
        console.log('[DEBUG] Token exchange successful!')
        setBrokerAccount(response.data)
        setIsLinked(true)

        // Wait for database to sync
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Verify broker account was saved
        await checkBrokerStatus()
        console.log('[DEBUG] OAuth callback complete - broker account confirmed')
      } else {
        setError('Failed to exchange token')
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message
      setError('Failed to link account: ' + errorMsg)
      console.error('[DEBUG] OAuth error:', errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleLinkZerodha = async () => {
    if (!accessToken) {
      setError('Please log in first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getZerodhaLoginUrl(accessToken)
      if (response.data?.login_url) {
        window.location.href = response.data.login_url
      } else {
        setError('Failed to get Zerodha login URL')
      }
    } catch (err: any) {
      setError('Failed to initiate Zerodha login: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Zerodha account?')) return

    if (!accessToken) {
      setError('Please log in first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await apiClient.disconnectZerodha(accessToken)
      setIsLinked(false)
      setBrokerAccount(null)
      alert('Zerodha account disconnected successfully')
    } catch (err: any) {
      setError('Failed to disconnect: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGoToDashboard = () => {
    console.log('[DEBUG] Navigating to dashboard...')
    router.push('/dashboard')
  }

  // Show loading while checking auth
  if (!isInitialized) {
    return <Layout><div></div></Layout>
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Broker Account Settings</h1>
          <p className="text-gray-600">Connect your trading account to start executing strategies</p>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        {/* Zerodha Account Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">🐂</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Zerodha Kite Connect</h2>
                  <p className="text-gray-600 mt-1">Industry-leading trading platform</p>
                </div>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full font-semibold text-sm ${
                isLinked
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {isLinked ? '✓ Connected' : '◐ Not Connected'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2">
                {[
                  'Real-time market data',
                  'Lightning-fast order execution',
                  'Advanced charting tools',
                  'Integrated risk management',
                  'Multi-segment trading',
                  'Mobile app support',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-600">✓</span> {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Account Details</h3>
              {isLinked && brokerAccount ? (
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600">Broker</p>
                    <p className="font-semibold text-gray-900">{brokerAccount.broker_name || 'Zerodha'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <p className="font-semibold text-green-600">Active</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Connected</p>
                    <p className="font-semibold text-gray-900">
                      {brokerAccount.created_at
                        ? new Date(brokerAccount.created_at).toLocaleDateString()
                        : 'Today'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-600">
                  <p>No account linked yet</p>
                  <p className="text-sm mt-1">Click the button below to connect</p>
                </div>
              )}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleGoToDashboard}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-md hover:shadow-lg"
            >
              📊 Go to Dashboard
            </button>
            {!isLinked ? (
              <button
                onClick={handleLinkZerodha}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? '🔄 Connecting...' : '🔗 Link Zerodha Account'}
              </button>
            ) : (
              <>
                <button className="px-6 py-3 bg-gray-100 text-gray-700 border border-gray-300 font-semibold rounded-lg hover:bg-gray-200 transition">
                  📊 View Account Details
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-6 py-3 bg-red-100 text-red-700 border border-red-200 font-semibold rounded-lg hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Disconnecting...' : '🔌 Disconnect'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 How to Connect</h3>
          <ol className="space-y-4">
            {[
              {
                num: '1',
                title: 'Click "Link Zerodha Account"',
                desc: 'You will be taken to Zerodha login page',
              },
              {
                num: '2',
                title: 'Enter your credentials',
                desc: 'Log in with your Kite account',
              },
              {
                num: '3',
                title: 'Grant permissions',
                desc: 'Authorize TradeBot to access your account',
              },
              {
                num: '4',
                title: 'Done!',
                desc: 'Your account is now linked and ready to trade',
              },
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-semibold">
                    {step.num}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{step.title}</p>
                  <p className="text-gray-600 text-sm">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex gap-4">
            <span className="text-2xl">🔒</span>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Your account is secure</h4>
              <p className="text-sm text-gray-700">
                We use industry-standard encryption (AES-256) to protect your API credentials. Your account secrets are stored securely and never exposed.
              </p>
            </div>
          </div>
        </div>

        {/* API Integration Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="API Status" value="Connected" icon="✓" color="green" />
          <StatCard label="Connection Type" value="OAuth2" icon="🔐" color="blue" />
          <StatCard label="Last Sync" value="Just now" icon="🔄" color="purple" />
        </div>
      </div>
    </Layout>
  )
}
