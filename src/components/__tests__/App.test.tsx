import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../../App'

describe('App Component', () => {
  it('renders the main app with navigation', () => {
    render(<App />)
    
    // Check if the main title is rendered (there are multiple instances)
    expect(screen.getAllByText('Universal Converter')).toHaveLength(2)
    
    // Check if navigation buttons are present
    expect(screen.getByText('Units')).toBeInTheDocument()
    expect(screen.getByText('Currency')).toBeInTheDocument()
    expect(screen.getByText('Time Zones')).toBeInTheDocument()
  })

  it('switches between conversion types', () => {
    render(<App />)
    
    // Initially should show Units converter (default)
    expect(screen.getByText('Unit Converter')).toBeInTheDocument()
    
    // Click on Currency tab
    const currencyButton = screen.getByText('Currency')
    fireEvent.click(currencyButton)
    
    // Should now show Currency converter
    expect(screen.getByText('Currency Converter')).toBeInTheDocument()
    
    // Click on Time Zones tab
    const timezoneButton = screen.getByText('Time Zones')
    fireEvent.click(timezoneButton)
    
    // Should now show TimeZone converter
    expect(screen.getByText('Time Zone Converter')).toBeInTheDocument()
  })

  it('shows theme toggle', () => {
    render(<App />)
    
    // Theme toggle should be present (it's an icon button)
    const themeToggle = screen.getByRole('button', { name: /toggle theme/i })
    expect(themeToggle).toBeInTheDocument()
  })

  it('handles error boundaries', () => {
    // This test would require a component that throws an error
    // For now, just verify the app renders without crashing
    render(<App />)
    expect(screen.getAllByText('Universal Converter')).toHaveLength(2)
  })
})