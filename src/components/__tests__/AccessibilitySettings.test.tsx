import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccessibilitySettings } from '../AccessibilitySettings'

// Mock the accessibility hook
vi.mock('@/hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    fontSize: 'medium',
    contrastMode: 'normal',
    motionPreference: 'no-preference',
    announceChanges: true,
    keyboardNavigation: true,
    isKeyboardUser: false,
    reducedMotion: false,
    highContrast: false,
    setFontSize: vi.fn(),
    setContrastMode: vi.fn(),
    setMotionPreference: vi.fn(),
    toggleAnnounceChanges: vi.fn(),
    toggleKeyboardNavigation: vi.fn()
  })
}))

describe('AccessibilitySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders accessibility settings button', () => {
    render(<AccessibilitySettings />)
    
    const button = screen.getByRole('button', { name: /open accessibility settings/i })
    expect(button).toBeInTheDocument()
  })

  it('opens settings panel when button is clicked', async () => {
    render(<AccessibilitySettings />)
    
    const button = screen.getByRole('button', { name: /open accessibility settings/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument()
    })
  })

  it('displays font size options', async () => {
    render(<AccessibilitySettings />)
    
    const button = screen.getByRole('button', { name: /open accessibility settings/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Text Size')).toBeInTheDocument()
    })
  })

  it('displays contrast options', async () => {
    render(<AccessibilitySettings />)
    
    const button = screen.getByRole('button', { name: /open accessibility settings/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Contrast')).toBeInTheDocument()
    })
  })

  it('displays animation options', async () => {
    render(<AccessibilitySettings />)
    
    const button = screen.getByRole('button', { name: /open accessibility settings/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Animations')).toBeInTheDocument()
    })
  })

  it('displays keyboard shortcuts help', async () => {
    render(<AccessibilitySettings />)
    
    const button = screen.getByRole('button', { name: /open accessibility settings/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
      expect(screen.getByText('Tab')).toBeInTheDocument()
      expect(screen.getByText('Navigate forward')).toBeInTheDocument()
    })
  })

  it('has proper ARIA attributes', () => {
    render(<AccessibilitySettings />)
    
    const button = screen.getByRole('button', { name: /open accessibility settings/i })
    expect(button).toHaveAttribute('aria-label', 'Open accessibility settings')
  })

  it('supports keyboard navigation', () => {
    render(<AccessibilitySettings />)
    
    const button = screen.getByRole('button', { name: /open accessibility settings/i })
    button.focus()
    expect(button).toHaveFocus()
    
    fireEvent.keyDown(button, { key: 'Enter' })
    // Should open the settings panel
  })
})