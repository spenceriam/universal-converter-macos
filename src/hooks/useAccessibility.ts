import * as React from "react"

// Font size preferences
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large'

// High contrast mode
export type ContrastMode = 'normal' | 'high'

// Reduced motion preference
export type MotionPreference = 'no-preference' | 'reduce'

// Focus management
export type FocusMode = 'keyboard' | 'mouse' | 'touch'

interface AccessibilityPreferences {
  fontSize: FontSize
  contrastMode: ContrastMode
  motionPreference: MotionPreference
  announceChanges: boolean
  keyboardNavigation: boolean
}

interface AccessibilityState extends AccessibilityPreferences {
  focusMode: FocusMode
  isKeyboardUser: boolean
  reducedMotion: boolean
  highContrast: boolean
}

const ACCESSIBILITY_STORAGE_KEY = 'universal-converter-accessibility'

const defaultPreferences: AccessibilityPreferences = {
  fontSize: 'medium',
  contrastMode: 'normal',
  motionPreference: 'no-preference',
  announceChanges: true,
  keyboardNavigation: true
}

// Font size mappings
const fontSizeClasses = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
  'extra-large': 'text-xl'
} as const

// Font size CSS custom properties
const fontSizeVariables = {
  small: { '--font-size-base': '0.875rem', '--font-size-lg': '1rem', '--font-size-xl': '1.125rem' },
  medium: { '--font-size-base': '1rem', '--font-size-lg': '1.125rem', '--font-size-xl': '1.25rem' },
  large: { '--font-size-base': '1.125rem', '--font-size-lg': '1.25rem', '--font-size-xl': '1.5rem' },
  'extra-large': { '--font-size-base': '1.25rem', '--font-size-lg': '1.5rem', '--font-size-xl': '1.75rem' }
} as const

/**
 * Hook for managing accessibility preferences and state
 */
export function useAccessibility() {
  const [state, setState] = React.useState<AccessibilityState>(() => {
    // Load preferences from localStorage
    const stored = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    const preferences = stored ? JSON.parse(stored) : defaultPreferences
    
    // Detect system preferences
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches
    
    return {
      ...preferences,
      focusMode: 'mouse',
      isKeyboardUser: false,
      reducedMotion: preferences.motionPreference === 'reduce' || reducedMotion,
      highContrast: preferences.contrastMode === 'high' || highContrast
    }
  })

  // Save preferences to localStorage
  const savePreferences = React.useCallback((newPreferences: Partial<AccessibilityPreferences>) => {
    const updated = { ...state, ...newPreferences }
    setState(updated)
    
    const toStore: AccessibilityPreferences = {
      fontSize: updated.fontSize,
      contrastMode: updated.contrastMode,
      motionPreference: updated.motionPreference,
      announceChanges: updated.announceChanges,
      keyboardNavigation: updated.keyboardNavigation
    }
    
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(toStore))
  }, [state])

  // Update font size
  const setFontSize = React.useCallback((fontSize: FontSize) => {
    savePreferences({ fontSize })
  }, [savePreferences])

  // Update contrast mode
  const setContrastMode = React.useCallback((contrastMode: ContrastMode) => {
    savePreferences({ contrastMode })
  }, [savePreferences])

  // Update motion preference
  const setMotionPreference = React.useCallback((motionPreference: MotionPreference) => {
    savePreferences({ motionPreference })
  }, [savePreferences])

  // Toggle announce changes
  const toggleAnnounceChanges = React.useCallback(() => {
    savePreferences({ announceChanges: !state.announceChanges })
  }, [state.announceChanges, savePreferences])

  // Toggle keyboard navigation
  const toggleKeyboardNavigation = React.useCallback(() => {
    savePreferences({ keyboardNavigation: !state.keyboardNavigation })
  }, [state.keyboardNavigation, savePreferences])

  // Detect focus mode changes
  React.useEffect(() => {
    let keyboardTimeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        setState(prev => ({ ...prev, focusMode: 'keyboard', isKeyboardUser: true }))
        clearTimeout(keyboardTimeout)
      }
    }

    const handleMouseDown = () => {
      setState(prev => ({ ...prev, focusMode: 'mouse' }))
      keyboardTimeout = setTimeout(() => {
        setState(prev => ({ ...prev, isKeyboardUser: false }))
      }, 1000)
    }

    const handleTouchStart = () => {
      setState(prev => ({ ...prev, focusMode: 'touch' }))
      keyboardTimeout = setTimeout(() => {
        setState(prev => ({ ...prev, isKeyboardUser: false }))
      }, 1000)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('touchstart', handleTouchStart)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('touchstart', handleTouchStart)
      clearTimeout(keyboardTimeout)
    }
  }, [])

  // Listen for system preference changes
  React.useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (state.motionPreference === 'no-preference') {
        setState(prev => ({ ...prev, reducedMotion: e.matches }))
      }
    }

    const handleContrastChange = (e: MediaQueryListEvent) => {
      if (state.contrastMode === 'normal') {
        setState(prev => ({ ...prev, highContrast: e.matches }))
      }
    }

    motionQuery.addEventListener('change', handleMotionChange)
    contrastQuery.addEventListener('change', handleContrastChange)

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
      contrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [state.motionPreference, state.contrastMode])

  // Apply font size to document
  React.useEffect(() => {
    const root = document.documentElement
    const variables = fontSizeVariables[state.fontSize]
    
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Add font size class to body
    document.body.className = document.body.className.replace(/text-(sm|base|lg|xl)/, '')
    document.body.classList.add(fontSizeClasses[state.fontSize])
  }, [state.fontSize])

  // Apply contrast mode
  React.useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', state.highContrast)
  }, [state.highContrast])

  // Apply reduced motion
  React.useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', state.reducedMotion)
  }, [state.reducedMotion])

  // Apply keyboard user class
  React.useEffect(() => {
    document.documentElement.classList.toggle('keyboard-user', state.isKeyboardUser)
  }, [state.isKeyboardUser])

  return {
    // State
    ...state,
    
    // Actions
    setFontSize,
    setContrastMode,
    setMotionPreference,
    toggleAnnounceChanges,
    toggleKeyboardNavigation,
    
    // Utilities
    getFontSizeClass: () => fontSizeClasses[state.fontSize],
    shouldReduceMotion: () => state.reducedMotion,
    shouldUseHighContrast: () => state.highContrast,
    isKeyboardFocused: () => state.focusMode === 'keyboard'
  }
}

/**
 * Hook for managing focus within a component
 */
export function useFocusManagement(containerRef: React.RefObject<HTMLElement>) {
  const [focusableElements, setFocusableElements] = React.useState<HTMLElement[]>([])
  const [currentFocusIndex, setCurrentFocusIndex] = React.useState(-1)

  // Update focusable elements when container changes
  React.useEffect(() => {
    if (!containerRef.current) return

    const updateFocusableElements = () => {
      const container = containerRef.current!
      const elements = container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>
      
      setFocusableElements(Array.from(elements))
    }

    updateFocusableElements()

    // Use MutationObserver to watch for DOM changes
    const observer = new MutationObserver(updateFocusableElements)
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex']
    })

    return () => observer.disconnect()
  }, [containerRef])

  // Focus management functions
  const focusFirst = React.useCallback(() => {
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
      setCurrentFocusIndex(0)
    }
  }, [focusableElements])

  const focusLast = React.useCallback(() => {
    if (focusableElements.length > 0) {
      const lastIndex = focusableElements.length - 1
      focusableElements[lastIndex].focus()
      setCurrentFocusIndex(lastIndex)
    }
  }, [focusableElements])

  const focusNext = React.useCallback(() => {
    if (focusableElements.length === 0) return
    
    const nextIndex = (currentFocusIndex + 1) % focusableElements.length
    focusableElements[nextIndex].focus()
    setCurrentFocusIndex(nextIndex)
  }, [focusableElements, currentFocusIndex])

  const focusPrevious = React.useCallback(() => {
    if (focusableElements.length === 0) return
    
    const prevIndex = currentFocusIndex <= 0 ? focusableElements.length - 1 : currentFocusIndex - 1
    focusableElements[prevIndex].focus()
    setCurrentFocusIndex(prevIndex)
  }, [focusableElements, currentFocusIndex])

  return {
    focusableElements,
    currentFocusIndex,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious
  }
}

/**
 * Hook for screen reader announcements
 */
export function useScreenReader() {
  const { announceChanges } = useAccessibility()
  const announcementRef = React.useRef<HTMLDivElement>(null)

  // Create announcement element
  React.useEffect(() => {
    if (!announcementRef.current) {
      const element = document.createElement('div')
      element.setAttribute('aria-live', 'polite')
      element.setAttribute('aria-atomic', 'true')
      element.className = 'sr-only'
      element.id = 'accessibility-announcements'
      document.body.appendChild(element)
      announcementRef.current = element
    }

    return () => {
      if (announcementRef.current && document.body.contains(announcementRef.current)) {
        document.body.removeChild(announcementRef.current)
      }
    }
  }, [])

  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceChanges || !announcementRef.current) return

    announcementRef.current.setAttribute('aria-live', priority)
    announcementRef.current.textContent = message

    // Clear after announcement
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = ''
      }
    }, 1000)
  }, [announceChanges])

  return { announce }
}