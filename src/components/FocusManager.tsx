import * as React from "react"
import { useFocusManagement, useAccessibility } from "@/hooks/useAccessibility"
import { cn } from "@/lib/utils"

interface FocusManagerProps {
  children: React.ReactNode
  className?: string
  autoFocus?: boolean
  trapFocus?: boolean
  restoreFocus?: boolean
  onEscape?: () => void
}

export function FocusManager({
  children,
  className,
  autoFocus = false,
  trapFocus = false,
  restoreFocus = false,
  onEscape
}: FocusManagerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const previousActiveElement = React.useRef<HTMLElement | null>(null)
  const { keyboardNavigation, isKeyboardFocused } = useAccessibility()
  
  const {
    focusableElements,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious
  } = useFocusManagement(containerRef)

  // Store the previously focused element when component mounts
  React.useEffect(() => {
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }
  }, [restoreFocus])

  // Auto focus first element when component mounts
  React.useEffect(() => {
    if (autoFocus && keyboardNavigation) {
      const timer = setTimeout(() => {
        focusFirst()
      }, 100) // Small delay to ensure DOM is ready
      
      return () => clearTimeout(timer)
    }
  }, [autoFocus, keyboardNavigation, focusFirst])

  // Restore focus when component unmounts
  React.useEffect(() => {
    return () => {
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [restoreFocus])

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!trapFocus && !keyboardNavigation) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }

      // Handle Tab navigation for focus trapping
      if (trapFocus && e.key === 'Tab') {
        if (focusableElements.length === 0) {
          e.preventDefault()
          return
        }

        const activeElement = document.activeElement as HTMLElement
        const currentIndex = focusableElements.indexOf(activeElement)

        if (e.shiftKey) {
          // Shift + Tab (backward)
          if (currentIndex <= 0) {
            e.preventDefault()
            focusLast()
          }
        } else {
          // Tab (forward)
          if (currentIndex >= focusableElements.length - 1) {
            e.preventDefault()
            focusFirst()
          }
        }
      }

      // Handle arrow key navigation (optional enhancement)
      if (keyboardNavigation && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const activeElement = document.activeElement as HTMLElement
        const currentIndex = focusableElements.indexOf(activeElement)
        
        if (currentIndex >= 0) {
          e.preventDefault()
          if (e.key === 'ArrowDown') {
            focusNext()
          } else {
            focusPrevious()
          }
        }
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleKeyDown)
      return () => container.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    trapFocus,
    keyboardNavigation,
    focusableElements,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    onEscape
  ])

  return (
    <div
      ref={containerRef}
      className={cn(
        "focus-manager",
        isKeyboardFocused() && keyboardNavigation && "keyboard-focus-active",
        className
      )}
      role={trapFocus ? "dialog" : undefined}
      aria-modal={trapFocus}
    >
      {children}
    </div>
  )
}

/**
 * Hook for managing focus restoration
 */
export function useFocusRestore() {
  const previousActiveElement = React.useRef<HTMLElement | null>(null)

  const saveFocus = React.useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = React.useCallback(() => {
    if (previousActiveElement.current) {
      previousActiveElement.current.focus()
      previousActiveElement.current = null
    }
  }, [])

  return { saveFocus, restoreFocus }
}

/**
 * Hook for focus trapping within a container
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = React.useRef<HTMLElement>(null)
  const { focusableElements, focusFirst, focusLast } = useFocusManagement(containerRef)

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && focusableElements.length > 0) {
        const activeElement = document.activeElement as HTMLElement
        const currentIndex = focusableElements.indexOf(activeElement)

        if (e.shiftKey) {
          // Shift + Tab
          if (currentIndex <= 0) {
            e.preventDefault()
            focusLast()
          }
        } else {
          // Tab
          if (currentIndex >= focusableElements.length - 1) {
            e.preventDefault()
            focusFirst()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, focusableElements, focusFirst, focusLast])

  return containerRef
}