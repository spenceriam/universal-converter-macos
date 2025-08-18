import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAccessibility, useFocusManagement, useScreenReader } from '../useAccessibility'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('useAccessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    document.documentElement.className = ''
    document.body.className = ''
  })

  it('initializes with default preferences', () => {
    const { result } = renderHook(() => useAccessibility())
    
    expect(result.current.fontSize).toBe('medium')
    expect(result.current.contrastMode).toBe('normal')
    expect(result.current.motionPreference).toBe('no-preference')
    expect(result.current.announceChanges).toBe(true)
    expect(result.current.keyboardNavigation).toBe(true)
  })

  it('loads preferences from localStorage', () => {
    const storedPreferences = {
      fontSize: 'large',
      contrastMode: 'high',
      motionPreference: 'reduce',
      announceChanges: false,
      keyboardNavigation: false
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences))
    
    const { result } = renderHook(() => useAccessibility())
    
    expect(result.current.fontSize).toBe('large')
    expect(result.current.contrastMode).toBe('high')
    expect(result.current.motionPreference).toBe('reduce')
    expect(result.current.announceChanges).toBe(false)
    expect(result.current.keyboardNavigation).toBe(false)
  })

  it('updates font size and saves to localStorage', () => {
    const { result } = renderHook(() => useAccessibility())
    
    act(() => {
      result.current.setFontSize('large')
    })
    
    expect(result.current.fontSize).toBe('large')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'universal-converter-accessibility',
      expect.stringContaining('"fontSize":"large"')
    )
  })

  it('updates contrast mode and saves to localStorage', () => {
    const { result } = renderHook(() => useAccessibility())
    
    act(() => {
      result.current.setContrastMode('high')
    })
    
    expect(result.current.contrastMode).toBe('high')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'universal-converter-accessibility',
      expect.stringContaining('"contrastMode":"high"')
    )
  })

  it('updates motion preference and saves to localStorage', () => {
    const { result } = renderHook(() => useAccessibility())
    
    act(() => {
      result.current.setMotionPreference('reduce')
    })
    
    expect(result.current.motionPreference).toBe('reduce')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'universal-converter-accessibility',
      expect.stringContaining('"motionPreference":"reduce"')
    )
  })

  it('toggles announce changes setting', () => {
    const { result } = renderHook(() => useAccessibility())
    
    const initialValue = result.current.announceChanges
    
    act(() => {
      result.current.toggleAnnounceChanges()
    })
    
    expect(result.current.announceChanges).toBe(!initialValue)
  })

  it('toggles keyboard navigation setting', () => {
    const { result } = renderHook(() => useAccessibility())
    
    const initialValue = result.current.keyboardNavigation
    
    act(() => {
      result.current.toggleKeyboardNavigation()
    })
    
    expect(result.current.keyboardNavigation).toBe(!initialValue)
  })

  it('returns correct font size class', () => {
    const { result } = renderHook(() => useAccessibility())
    
    expect(result.current.getFontSizeClass()).toBe('text-base')
    
    act(() => {
      result.current.setFontSize('large')
    })
    
    expect(result.current.getFontSizeClass()).toBe('text-lg')
  })

  it('detects keyboard usage', () => {
    const { result } = renderHook(() => useAccessibility())
    
    expect(result.current.isKeyboardUser).toBe(false)
    
    // Simulate Tab key press
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' })
      document.dispatchEvent(event)
    })
    
    expect(result.current.isKeyboardUser).toBe(true)
    expect(result.current.focusMode).toBe('keyboard')
  })
})

describe('useFocusManagement', () => {
  it('finds focusable elements in container', () => {
    const container = document.createElement('div')
    const button = document.createElement('button')
    const input = document.createElement('input')
    const link = document.createElement('a')
    link.href = '#'
    
    container.appendChild(button)
    container.appendChild(input)
    container.appendChild(link)
    document.body.appendChild(container)
    
    const containerRef = { current: container }
    const { result } = renderHook(() => useFocusManagement(containerRef))
    
    expect(result.current.focusableElements).toHaveLength(3)
    
    document.body.removeChild(container)
  })

  it('focuses first element', () => {
    const container = document.createElement('div')
    const button1 = document.createElement('button')
    const button2 = document.createElement('button')
    
    container.appendChild(button1)
    container.appendChild(button2)
    document.body.appendChild(container)
    
    const containerRef = { current: container }
    const { result } = renderHook(() => useFocusManagement(containerRef))
    
    act(() => {
      result.current.focusFirst()
    })
    
    expect(button1).toHaveFocus()
    
    document.body.removeChild(container)
  })

  it('focuses last element', () => {
    const container = document.createElement('div')
    const button1 = document.createElement('button')
    const button2 = document.createElement('button')
    
    container.appendChild(button1)
    container.appendChild(button2)
    document.body.appendChild(container)
    
    const containerRef = { current: container }
    const { result } = renderHook(() => useFocusManagement(containerRef))
    
    act(() => {
      result.current.focusLast()
    })
    
    expect(button2).toHaveFocus()
    
    document.body.removeChild(container)
  })
})

describe('useScreenReader', () => {
  it('creates announcement element', () => {
    renderHook(() => useScreenReader())
    
    const announcementElement = document.getElementById('accessibility-announcements')
    expect(announcementElement).toBeInTheDocument()
    expect(announcementElement).toHaveAttribute('aria-live', 'polite')
    expect(announcementElement).toHaveAttribute('aria-atomic', 'true')
    expect(announcementElement).toHaveClass('sr-only')
  })

  it('announces messages when announceChanges is true', () => {
    const { result } = renderHook(() => useScreenReader())
    
    act(() => {
      result.current.announce('Test message')
    })
    
    const announcementElement = document.getElementById('accessibility-announcements')
    expect(announcementElement?.textContent).toBe('Test message')
  })

  it('supports different announcement priorities', () => {
    const { result } = renderHook(() => useScreenReader())
    
    act(() => {
      result.current.announce('Urgent message', 'assertive')
    })
    
    const announcementElement = document.getElementById('accessibility-announcements')
    expect(announcementElement).toHaveAttribute('aria-live', 'assertive')
  })
})