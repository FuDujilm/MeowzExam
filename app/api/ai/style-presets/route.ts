import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function GET() {
  const presets = await prisma.aiStylePreset.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      prompt: true,
    },
  })

  return NextResponse.json({
    presets: presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      isDefault: preset.isDefault,
      promptPreview: preset.prompt.slice(0, 120),
    })),
  })
}
