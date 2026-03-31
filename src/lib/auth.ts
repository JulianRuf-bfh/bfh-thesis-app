import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      level?: string | null
      programme?: string | null
      specialisation?: string | null
    }
  }
  interface JWT {
    id: string
    role: string
    level?: string | null
    programme?: string | null
    specialisation?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    level?: string | null
    programme?: string | null
    specialisation?: string | null
  }
}

const providers: NextAuthOptions['providers'] = []

// Azure AD SSO — only loaded when all three env vars are set
if (
  process.env.AZURE_AD_CLIENT_ID &&
  process.env.AZURE_AD_CLIENT_SECRET &&
  process.env.AZURE_AD_TENANT_ID
) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    })
  )
}

// Credentials login — always available (for dev/testing and fallback)
providers.push(
  CredentialsProvider({
    name: 'Email & Password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      // Rate limit by email to prevent brute-force attacks
      const rl = rateLimit(`auth:${credentials.email}`, RATE_LIMITS.auth)
      if (!rl.success) return null

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      })
      if (!user || !user.password) return null
      const valid = await compare(credentials.password, user.password)
      if (!valid) return null
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level,
        programme: user.programme,
        specialisation: user.specialisation,
      } as any
    },
  })
)

const isProduction = process.env.NODE_ENV === 'production'

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: isProduction
    ? {
        sessionToken: {
          name: '__Secure-next-auth.session-token',
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: true,
          },
        },
      }
    : undefined,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      // For Azure AD — create or update user record
      if (account?.provider === 'azure-ad') {
        const email = user.email!
        const existing = await prisma.user.findUnique({ where: { email } })
        if (!existing) {
          await prisma.user.create({
            data: {
              name: user.name ?? email,
              email,
              azureId: user.id,
              role: 'STUDENT', // default role; admins can promote in admin panel
            },
          })
        } else if (!existing.azureId) {
          await prisma.user.update({
            where: { email },
            data: { azureId: user.id },
          })
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        // First sign-in — populate from authorize()
        token.id = (user as any).id ?? token.sub!
        token.role = (user as any).role ?? 'STUDENT'
        token.level = (user as any).level ?? null
        token.programme = (user as any).programme ?? null
        token.specialisation = (user as any).specialisation ?? null
      } else {
        // Subsequent requests — refresh from DB so role/profile changes take effect
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id ?? token.sub },
          select: { id: true, role: true, level: true, programme: true, specialisation: true, name: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.level = dbUser.level
          token.programme = dbUser.programme
          token.specialisation = dbUser.specialisation
          token.name = dbUser.name
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.level = token.level
      session.user.programme = token.programme
      session.user.specialisation = token.specialisation
      return session
    },
  },
}

export const getAuth = () => getServerSession(authOptions)
