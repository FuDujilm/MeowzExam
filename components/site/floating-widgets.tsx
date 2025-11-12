'use client'

import { useSession } from 'next-auth/react'

import { AssistantDialog } from './assistant-dialog'

export function FloatingWidgets() {
  const { data: session, status } = useSession()

  if (status !== 'authenticated' || !session?.user) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <div className="pointer-events-auto">
        <AssistantDialog />
      </div>
    </div>
  )
}
