import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'

export function useAuth() {
  const { user, accessToken, error, isLoading, logout, isInitialized } = useAuthStore()

  return {
    user,
    accessToken,
    error,
    isLoading,
    logout,
    isAuthenticated: !!accessToken,
    isInitialized,
  }
}

/**
 * Hook to protect pages - redirects to login if not authenticated
 * Use this in your pages instead of manual redirect logic
 */
export function useProtectedPage() {
  const { accessToken, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for both router and auth to be ready
    if (!router.isReady || !isInitialized) return

    // If no access token, redirect to login
    if (!accessToken) {
      console.log('[DEBUG] No access token, redirecting to login from', router.pathname)
      router.push('/login')
    }
  }, [router.isReady, isInitialized, accessToken, router.pathname])

  return { isAuthenticated: !!accessToken, isReady: router.isReady && isInitialized }
}

export function useApi() {
  const { accessToken, user } = useAuthStore()

  return {
    token: accessToken,
    userId: user?.id,
  }
}

export function usePositions() {
  const { token, userId } = useApi()
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPositions = async () => {
    if (!token || !userId) return
    setLoading(true)
    try {
      const { data } = await fetch(
        `/api/positions?user_id=${userId}&token=${token}`
      ).then((r) => r.json())
      setPositions(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPositions()
    const interval = setInterval(fetchPositions, 5000)
    return () => clearInterval(interval)
  }, [token, userId])

  return { positions, loading, error, refetch: fetchPositions }
}

export function useStrategies() {
  const { token, userId } = useApi()
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStrategies = async () => {
    if (!token || !userId) return
    setLoading(true)
    try {
      const response = await fetch(
        `/api/strategies?user_id=${userId}&token=${token}`
      ).then((r) => r.json())
      setStrategies(response || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStrategies()
  }, [token, userId])

  return { strategies, loading, error, refetch: fetchStrategies }
}

export function useWebSocket(onMessage?: (message: any) => void) {
  const { token } = useApi()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${token}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      onMessage?.(message)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnected(false)
    }

    ws.onclose = () => {
      setConnected(false)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [token, onMessage])

  return { connected }
}
