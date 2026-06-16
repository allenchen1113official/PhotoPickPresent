import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'

const providers: NextAuthOptions['providers'] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  }),
]

// Only register AzureAD when both env vars are set
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID || 'common',
      authorization: {
        params: {
          scope: 'openid email profile User.Read Files.Read',
        },
      },
    })
  )
}

async function refreshGoogleToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh Google token')
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        return {
          ...token,
          googleAccessToken: account.access_token,
          googleRefreshToken: account.refresh_token,
          accessToken: account.access_token,
          googleTokenExpires: Date.now() + (account.expires_in as number ?? 3600) * 1000,
        }
      }
      if (account?.provider === 'azure-ad') {
        return { ...token, microsoftAccessToken: account.access_token }
      }

      // Refresh Google token if expired (with 60s buffer)
      if (token.googleRefreshToken && token.googleTokenExpires) {
        if (Date.now() > (token.googleTokenExpires as number) - 60_000) {
          try {
            const refreshed = await refreshGoogleToken(token.googleRefreshToken as string)
            return {
              ...token,
              googleAccessToken: refreshed.access_token,
              accessToken: refreshed.access_token,
              googleTokenExpires: Date.now() + refreshed.expires_in * 1000,
            }
          } catch {
            return { ...token, googleAccessToken: undefined, accessToken: undefined }
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.googleAccessToken as string | undefined
      session.googleAccessToken = token.googleAccessToken as string | undefined
      session.microsoftAccessToken = token.microsoftAccessToken as string | undefined
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    googleAccessToken?: string
    microsoftAccessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    googleAccessToken?: string
    googleRefreshToken?: string
    googleTokenExpires?: number
    microsoftAccessToken?: string
  }
}
