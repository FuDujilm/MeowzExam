import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db'

export const GUEST_COOKIE_NAME = 'meowz_guest_key'

const DEFAULT_GUEST_RETENTION_DAYS = 30
const DEFAULT_GUEST_COOKIE_DAYS = 365

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getRetentionDays() {
  const raw = process.env.GUEST_RETENTION_DAYS
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_GUEST_RETENTION_DAYS
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GUEST_RETENTION_DAYS
}

function buildGuestEmail(keyHash: string) {
  return `guest-${keyHash.slice(0, 24)}@guest.local`
}

function buildGuestName(keyHash: string) {
  return `游客-${keyHash.slice(0, 8).toUpperCase()}`
}

export function getGuestCookieValue(request: NextRequest) {
  const value = request.cookies.get(GUEST_COOKIE_NAME)?.value
  return value && value.length >= 32 ? value : null
}

export function createGuestCookieValue() {
  return randomBytes(32).toString('base64url')
}

export function setGuestCookie(response: NextResponse, guestKey: string) {
  response.cookies.set(GUEST_COOKIE_NAME, guestKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DEFAULT_GUEST_COOKIE_DAYS * 24 * 60 * 60,
  })
}

export function attachGuestCookieIfNeeded(
  response: NextResponse,
  resolvedUser: { isGuest?: boolean; shouldSetGuestCookie?: boolean; guestKey?: string } | null,
) {
  if (resolvedUser?.isGuest && resolvedUser.shouldSetGuestCookie && resolvedUser.guestKey) {
    setGuestCookie(response, resolvedUser.guestKey)
  }
  return response
}

export async function cleanupInactiveGuestUsers(client: PrismaClient = prisma) {
  const cutoff = addDays(new Date(), -getRetentionDays())

  await client.user.deleteMany({
    where: {
      userType: 'GUEST',
      OR: [
        { guestMigratedAt: { not: null } },
        { guestLastSeenAt: null, createdAt: { lt: cutoff } },
        { guestLastSeenAt: { lt: cutoff } },
      ],
    },
  })
}

export async function getOrCreateGuestUser(request: NextRequest) {
  const existingKey = getGuestCookieValue(request)
  const guestKey = existingKey ?? createGuestCookieValue()
  const keyHash = sha256(guestKey)
  const now = new Date()

  await cleanupInactiveGuestUsers().catch((error) => {
    console.error('Guest cleanup failed:', error)
  })

  const user = await prisma.user.upsert({
    where: { guestKeyHash: keyHash },
    create: {
      email: buildGuestEmail(keyHash),
      name: buildGuestName(keyHash),
      userType: 'GUEST',
      guestKeyHash: keyHash,
      guestLastSeenAt: now,
      settings: {
        create: {},
      },
    },
    update: {
      guestLastSeenAt: now,
    },
    select: {
      id: true,
      email: true,
      callsign: true,
      userType: true,
      guestKeyHash: true,
    },
  })

  return {
    user,
    guestKey,
    isNewCookie: !existingKey,
  }
}

export function hashMigrationCode(code: string) {
  return sha256(code.trim().toUpperCase())
}

export function createMigrationCode() {
  return randomBytes(5).toString('base64url').replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase()
}
