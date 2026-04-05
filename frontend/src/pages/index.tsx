import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'

export default function HomePage() {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()

  useEffect(() => {
    // If user is logged in, go to dashboard
    if (user && accessToken) {
      router.push('/dashboard')
    } else {
      // Otherwise go to login
      router.push('/login')
    }
  }, [user, accessToken, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Algo Trading Platform</h1>
        <p className="text-gray-200">Loading...</p>
      </div>
    </div>
  )
}
