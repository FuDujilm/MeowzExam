import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import type { Adapter } from "next-auth/adapters"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import { getUserDisplayName } from "@/lib/users/display-name"
import "@/lib/network/proxy-fetch"

const oauthBaseUrl =
  process.env.OAUTH_BASE_URL ?? process.env.NEXT_PUBLIC_OAUTH_BASE_URL
const appBaseUrl =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL

if (!oauthBaseUrl) {
  throw new Error("Missing OAUTH_BASE_URL environment variable")
}

function getOrigin(url?: string | null) {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

const oauthOrigin = getOrigin(oauthBaseUrl)
const appOrigin = getOrigin(appBaseUrl)

export const config = {
  adapter: PrismaAdapter(prisma) as Adapter,
  trustHost: true,
  providers: [
    {
      id: "custom",
      name: "自建OAuth",
      type: "oauth",
      clientId: (process.env.NODE_ENV === 'development' && process.env.HAM_EXAM_CLIENT_ID) 
        ? process.env.HAM_EXAM_CLIENT_ID 
        : process.env.OAUTH_CLIENT_ID!,
      clientSecret: (process.env.NODE_ENV === 'development' && process.env.HAM_EXAM_CLIENT_SECRET)
        ? process.env.HAM_EXAM_CLIENT_SECRET
        : process.env.OAUTH_CLIENT_SECRET!,
      wellKnown: undefined,
      token: {
        url: `${oauthBaseUrl}/oauth/token`,
        conform: async (response: Response) => {
          if (response.ok) {
            return response
          }
          const error = await response.json()
          console.error('[OAuth Error] Token endpoint error:', error)
          throw new Error(JSON.stringify(error))
        },
      },
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      authorization: {
        url: `${oauthBaseUrl}/oauth/authorize`,
        params: {
          scope: "openid profile email",
        },
      },
      userinfo: {
        url: `${oauthBaseUrl}/oauth/userinfo`,
        async request(context: any) {
          // OAuth服务器的access_token是JWT，直接解码获取用户信息
          const token = context.tokens.access_token
          if (!token) throw new Error("No access token")

          // JWT格式: header.payload.signature
          const parts = token.split('.')
          if (parts.length !== 3) throw new Error("Invalid JWT")

          // Base64url解码
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString())
          console.log('[OAuth Debug] JWT Payload:', payload)

          return payload
        },
      },
      profile(profile) {
        console.log('[OAuth Debug] Profile:', profile)
        return {
          id: profile.sub,
          name: profile.name || null,
          email: profile.email || null,
          image: profile.picture || null,
          aiQuotaLimit: null,
          aiQuotaUsed: 0,
          loginDisabled: false,
          manualExplanationDisabled: false,
        }
      },
      checks: ["state"],
    },
  ],
  debug: true,
  callbacks: {
    async redirect({ url, baseUrl }) {
      const resolvedBase = appOrigin ?? getOrigin(baseUrl) ?? baseUrl

      if (url.startsWith("/")) {
        return `${resolvedBase}${url}`
      }

      try {
        const target = new URL(url)
        const targetOrigin = target.origin

        if (
          targetOrigin === baseUrl ||
          targetOrigin === resolvedBase ||
          (oauthOrigin && targetOrigin === oauthOrigin)
        ) {
          return target.toString()
        }
      } catch {
        // ignore parse errors and fall back to app origin
      }

      return resolvedBase
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.callsign = user.callsign ?? null
        session.user.name = getUserDisplayName({
          callsign: user.callsign,
          name: user.name,
          email: session.user.email,
        })
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
  cookies: process.env.NODE_ENV === 'development' ? {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  } : undefined,
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)
