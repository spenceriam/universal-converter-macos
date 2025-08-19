import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SkipLinks } from '../SkipLinks'

// Mock scrollIntoView
const mockScrollIntoView = vi.fn()
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: mockScrollIntoView,
  writable: true
})

describe('SkipLinks', () => {
  beforeEach(() => {
    // Clear mock calls
    mockScrollIntoView.mockClear()
    
    // Clear any existing elements
    document.body.innerHTML = ''
    
    // Add target elements to the DOM
    const mainContent = document.createElement('main')
    mainContent.id = 'main-content'
    mainContent.setAttribute('tabindex', '-1') // Make it focusable
    document.body.appendChild(mainContent)
    
    const conversionNav = document.createElement('nav')
    conversionNav.id = 'conversion-nav'
    document.body.appendChild(conversionNav)
    
    const conversionForm = document.createElement('div')
    conversionForm.id = 'conversion-form'
    document.body.appendChild(conversionForm)
    
    const conversionResult = document.createElement('div')
    conversionResult.id = 'conversion-result'
    document.body.appendChild(conversionResult)
  })

  it('renders skip links with proper navigation role', () => {
    render(<SkipLinks />)
    
    const navigation = screen.getByRole('navigation', { name: /skip navigation links/i })
    expect(navigation).toBeInTheDocument()
  })

  it('renders default skip links', () => {
    render(<SkipLinks />)
    
    expect(screen.getByText('Skip to main content')).toBeInTheDocument()
    expect(screen.getByText('Skip to conversion navigation')).toBeInTheDocument()
    expect(screen.getByText('Skip to conversion form')).toBeInTheDocument()
    expect(screen.getByText('Skip to conversion result')).toBeInTheDocument()
  })

  it('renders custom skip links when provided', () => {
    const customLinks = [
      { href: '#custom-section', label: 'Skip to custom section' }
    ]
    
    render(<SkipLinks links={customLinks} />)
    
    expect(screen.getByText('Skip to custom section')).toBeInTheDocument()
    expect(screen.queryByText('Skip to main content')).not.toBeInTheDocument()
  })

  it('focuses target element when skip link is clicked', () => {
    render(<SkipLinks />)
    
    const mainContent = document.getElementById('main-content')!
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    
    fireEvent.click(skipLink)
    
    expect(mainContent).toHaveFocus()
  })

  it('scrolls to target element when skip link is clicked', () => {
    render(<SkipLinks />)
    
    const mainContent = document.getElementById('main-content')!
    expect(mainContent).toBeInTheDocument() // Ensure element exists
    
    // Spy on the specific element's scrollIntoView method
    const elementScrollSpy = vi.spyOn(mainContent, 'scrollIntoView')
    
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    
    fireEvent.click(skipLink)
    
    expect(elementScrollSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    })
  })

  it('adds tabindex to non-focusable elements', () => {
    render(<SkipLinks />)
    
    const conversionForm = document.getElementById('conversion-form')!
    const skipLink = screen.getByText('Skip to conversion form')
    
    fireEvent.click(skipLink)
    
    expect(conversionForm).toHaveAttribute('tabindex', '-1')
  })

  it('supports keyboard navigation', () => {
    render(<SkipLinks />)
    
    const skipLink = screen.getByText('Skip to main content')
    skipLink.focus()
    
    expect(skipLink).toHaveFocus()
    
    fireEvent.keyDown(skipLink, { key: 'Enter' })
    // Should trigger the click handler
  })

  it('has proper CSS classes for visibility', () => {
    const { container } = render(<SkipLinks />)
    
    const skipLinksContainer = container.firstChild as HTMLElement
    expect(skipLinksContainer).toHaveClass('-translate-y-full')
    expect(skipLinksContainer).toHaveClass('focus-within:translate-y-0')
  })
})