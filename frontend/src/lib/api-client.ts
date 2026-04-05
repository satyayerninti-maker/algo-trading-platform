import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken')
      if (this.token) {
        this.setAuthHeader(this.token)
      }
    }

    // Response interceptor for handling 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          const refreshToken = localStorage.getItem('refreshToken')
          if (refreshToken) {
            try {
              const response = await this.client.post('/api/auth/refresh', {
                refresh_token: refreshToken,
              })
              const newAccessToken = response.data.access_token
              localStorage.setItem('accessToken', newAccessToken)
              this.setAuthHeader(newAccessToken)
              return this.client.request(error.config!)
            } catch (refreshError) {
              // Redirect to login
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              window.location.href = '/login'
            }
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private setAuthHeader(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  setToken(token: string) {
    this.token = token
    this.setAuthHeader(token)
  }

  // Auth endpoints
  async register(email: string, password: string, name: string) {
    return this.client.post('/api/auth/register', {
      email,
      password,
      name,
    })
  }

  async login(email: string, password: string) {
    return this.client.post('/api/auth/login', {
      email,
      password,
    })
  }

  async refreshToken(refreshToken: string) {
    return this.client.post('/api/auth/refresh', {
      refresh_token: refreshToken,
    })
  }

  async getCurrentUser(token: string) {
    return this.client.get('/api/auth/me', {
      params: { token },
    })
  }

  // Broker endpoints
  async getZerodhaLoginUrl(token: string) {
    return this.client.get('/api/broker/zerodha/login-url', {
      params: { token },
    })
  }

  async getZerodhaAccount(token: string) {
    return this.client.get('/api/broker/zerodha/account', {
      params: { token },
    })
  }

  async disconnectZerodha(token: string) {
    return this.client.delete('/api/broker/zerodha/disconnect', {
      params: { token },
    })
  }

  async exchangeZerodhaToken(requestToken: string, token: string) {
    console.log('[DEBUG] Exchanging token:', {
      requestToken: requestToken.substring(0, 20) + '...',
      token: token.substring(0, 20) + '...',
    })
    return this.client.post('/api/broker/zerodha/exchange-token', null, {
      params: { request_token: requestToken, token },
    })
  }

  async getZerodhaPositions(token: string) {
    return this.client.get('/api/broker/zerodha/positions', {
      params: { token },
    })
  }

  async getZerodhaMargins(token: string) {
    return this.client.get('/api/broker/zerodha/margins', {
      params: { token },
    })
  }

  async getZerodhaAnalytics(token: string, days: number = 30) {
    return this.client.get('/api/broker/zerodha/analytics', {
      params: { token, days },
    })
  }

  // Strategy endpoints
  async createStrategy(strategy: any, userId: number, token: string) {
    return this.client.post('/api/strategies', strategy, {
      params: { user_id: userId, token },
    })
  }

  async listStrategies(userId: number, token: string) {
    return this.client.get('/api/strategies', {
      params: { user_id: userId, token },
    })
  }

  async getStrategy(strategyId: number, userId: number, token: string) {
    return this.client.get(`/api/strategies/${strategyId}`, {
      params: { user_id: userId, token },
    })
  }

  async updateStrategy(strategyId: number, strategy: any, userId: number, token: string) {
    return this.client.put(`/api/strategies/${strategyId}`, strategy, {
      params: { user_id: userId, token },
    })
  }

  async deleteStrategy(strategyId: number, userId: number, token: string) {
    return this.client.delete(`/api/strategies/${strategyId}`, {
      params: { user_id: userId, token },
    })
  }

  // Execution endpoints
  async startStrategy(strategyId: number, capitalAllocated: number, userId: number, token: string) {
    return this.client.post(
      '/api/execution/start',
      {
        strategy_id: strategyId,
        capital_allocated: capitalAllocated,
      },
      { params: { user_id: userId, token } }
    )
  }

  async stopStrategy(activeStrategyId: number, userId: number, token: string, closeTrades: boolean = false) {
    return this.client.post(`/api/execution/stop/${activeStrategyId}`, null, {
      params: { user_id: userId, token, close_trades: closeTrades },
    })
  }

  async getActiveStrategies(userId: number, token: string) {
    return this.client.get('/api/execution', {
      params: { user_id: userId, token },
    })
  }

  // Positions endpoints
  async getPositions(userId: number, token: string) {
    return this.client.get('/api/positions', {
      params: { user_id: userId, token },
    })
  }

  async getPosition(positionId: number, userId: number, token: string) {
    return this.client.get(`/api/positions/${positionId}`, {
      params: { user_id: userId, token },
    })
  }

  async closePosition(positionId: number, userId: number, token: string) {
    return this.client.delete(`/api/positions/${positionId}`, {
      params: { user_id: userId, token },
    })
  }

  // Trades endpoints
  async getTrades(userId: number, token: string) {
    return this.client.get('/api/trades', {
      params: { user_id: userId, token },
    })
  }

  async getStrategyTrades(strategyId: number, userId: number, token: string) {
    return this.client.get(`/api/trades/strategy/${strategyId}`, {
      params: { user_id: userId, token },
    })
  }

  // Analytics endpoints
  async getDailyAnalytics(userId: number, token: string, date?: string) {
    return this.client.get('/api/analytics/daily', {
      params: { user_id: userId, token, date },
    })
  }

  async getPortfolioSummary(userId: number, token: string) {
    return this.client.get('/api/analytics/portfolio-summary', {
      params: { user_id: userId, token },
    })
  }

  async getStrategyAnalytics(strategyId: number, userId: number, token: string) {
    return this.client.get(`/api/analytics/strategy/${strategyId}`, {
      params: { user_id: userId, token },
    })
  }

  async scanMeanReversionStocks(token: string) {
    return this.client.post('/api/strategies/scan/mean-reversion', null, {
      params: { token },
    })
  }

  async scanGoldenCrossStocks(token: string) {
    return this.client.post('/api/strategies/scan/golden-cross', null, {
      params: { token },
    })
  }

  // WebSocket connection
  getWebSocketUrl(token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/ws?token=${token}`
  }
}

export const apiClient = new ApiClient()
