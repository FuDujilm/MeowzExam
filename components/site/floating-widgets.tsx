import { AssistantDialog } from './assistant-dialog'

export function FloatingWidgets() {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <div className="pointer-events-auto">
        <AssistantDialog />
      </div>
    </div>
  )
}
