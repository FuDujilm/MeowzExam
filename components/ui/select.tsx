"use client"

import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp, X } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

type SelectComponent = ((props: SelectPrimitive.SelectProps) => React.JSX.Element) & {
  displayName?: string
}

type SelectContextValue = {
  isMobile: boolean
  open: boolean
  setOpen: (value: boolean) => void
}

const SelectDrawerContext = createContext<SelectContextValue | null>(null)

function useSelectDrawer() {
  const context = useContext(SelectDrawerContext)
  if (!context) {
    throw new Error("Select components must be used within <Select>")
  }
  return context
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia("(max-width: 768px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return isMobile
}

const Select: SelectComponent = ({
  children,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}) => {
  const isMobile = useIsMobile()
  const isControlled = open !== undefined
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen ?? false)

  const resolvedOpen = isControlled ? (open as boolean) : internalOpen

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const value = useMemo<SelectContextValue>(
    () => ({
      isMobile,
      open: resolvedOpen,
      setOpen: handleOpenChange,
    }),
    [isMobile, resolvedOpen, handleOpenChange],
  )

  useEffect(() => {
    if (!isMobile) return undefined
    if (!resolvedOpen) return undefined
    const { body } = document
    const original = body.style.overflow
    body.style.overflow = "hidden"
    return () => {
      body.style.overflow = original
    }
  }, [isMobile, resolvedOpen])

  return (
    <SelectDrawerContext.Provider value={value}>
      <SelectPrimitive.Root
        {...props}
        open={resolvedOpen}
        defaultOpen={defaultOpen}
        onOpenChange={handleOpenChange}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectDrawerContext.Provider>
  )
}
Select.displayName = "Select"

const SelectGroup = SelectPrimitive.Group
const SelectValue = (
  props: SelectPrimitive.SelectValueProps,
): React.JSX.Element => <SelectPrimitive.Value {...props} />
SelectValue.displayName = SelectPrimitive.Value.displayName

const SelectTrigger = ({
  className,
  children,
  ...props
}: SelectPrimitive.SelectTriggerProps): React.JSX.Element => (
  <SelectPrimitive.Trigger
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
)
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = ({
  className,
  ...props
}: SelectPrimitive.SelectScrollUpButtonProps): React.JSX.Element => (
  <SelectPrimitive.ScrollUpButton
    className={cn(
      "hidden cursor-default items-center justify-center py-1 md:flex",
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
)
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = ({
  className,
  ...props
}: SelectPrimitive.SelectScrollDownButtonProps): React.JSX.Element => (
  <SelectPrimitive.ScrollDownButton
    className={cn(
      "hidden cursor-default items-center justify-center py-1 md:flex",
      className,
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
)
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const mobileHeaderLabel = "\u8bf7\u9009\u62e9"
const closeLabel = "\u5173\u95ed"

const SelectContent = ({
  className,
  children,
  position = "popper",
  side,
  align,
  sideOffset,
  avoidCollisions,
  ...props
}: SelectPrimitive.SelectContentProps): React.JSX.Element => {
  const { isMobile, open, setOpen } = useSelectDrawer()

  if (isMobile) {
    if (!open) {
      return <></>
    }
    return (
      <SelectPrimitive.Portal>
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-full flex-col bg-white text-slate-900 shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-950 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-base font-semibold">{mobileHeaderLabel}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{'\u8bf7\u9009\u62e9\u4e0b\u65b9\u9009\u9879'}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500"
                aria-label={closeLabel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SelectPrimitive.Content
              className="flex flex-1 flex-col bg-transparent"
              position="item-aligned"
              side="bottom"
              align="end"
              sideOffset={0}
              avoidCollisions={false}
              {...props}
            >
              <SelectPrimitive.Viewport className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{'\u5df2\u9009\u9879'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{'\u5728\u4ee5\u4e0b\u5217\u8868\u4e2d\u70b9\u51fb\u9009\u62e9\u9879\u76ee'}</p>
                </div>
                <div className="mt-4 space-y-2">
                  {children}
                </div>
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </div>
        </div>
      </SelectPrimitive.Portal>
    )
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        side={side}
        align={align}
        sideOffset={sideOffset}
        avoidCollisions={avoidCollisions}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = ({
  className,
  ...props
}: SelectPrimitive.SelectLabelProps): React.JSX.Element => (
  <SelectPrimitive.Label
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
)
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = ({
  className,
  children,
  ...props
}: SelectPrimitive.SelectItemProps): React.JSX.Element => (
  <SelectPrimitive.Item
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-lg border border-transparent bg-white/70 py-2 pl-8 pr-3 text-base text-slate-800 outline-none transition focus:border-indigo-200 focus:bg-indigo-50 focus:text-indigo-600 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-indigo-500/60 dark:focus:bg-indigo-500/15",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
)
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = ({
  className,
  ...props
}: SelectPrimitive.SelectSeparatorProps): React.JSX.Element => (
  <SelectPrimitive.Separator
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
)
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
