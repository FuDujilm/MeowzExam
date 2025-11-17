import { NextResponse } from 'next/server'

import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { getR2StatusSummary } from '@/lib/server/r2-storage'

export const runtime = 'nodejs'

export async function GET() {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status ?? 401 })
  }

  const status = getR2StatusSummary()
  return NextResponse.json({ success: true, status })
}

