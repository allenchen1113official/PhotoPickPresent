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

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        token.googleAccessToken = account.access_token
        token.googleRefreshToken = account.refresh_token
        token.accessToken = account.access_token
      } else if (account?.provider === 'azure-ad') {
        token.microsoftAccessToken = account.access_token
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
    microsoftAccessToken?: string
  }
}
