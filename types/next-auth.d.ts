import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      callsign?: string | null
      aiQuotaLimit?: number | null
      aiQuotaUsed?: number
      loginDisabled?: boolean
      manualExplanationDisabled?: boolean
    }
  }

  interface User {
    callsign?: string | null
    aiQuotaLimit: number | null
    aiQuotaUsed: number
    loginDisabled: boolean
    manualExplanationDisabled: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
