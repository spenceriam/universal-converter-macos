import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConversionContainer } from '../ConversionContainer'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  useSpring: () => ({ set: vi.fn() }),
  useTransform: () => 123,
}))

describe('ConversionContainer', () => {
  it('renders with title and children', () => {
    render(
      <ConversionContainer title="Test Converter">
        <div>Test content</div>
      </ConversionContainer>
    )

    expect(screen.getByText('Test Converter')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('shows loading state when isLoading is true', () => {
    render(
      <ConversionContainer title="Test Converter" isLoading={true}>
        <div>Test content</div>
      </ConversionContainer>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Test content')).not.toBeInTheDocument()
  })

  it('shows error message when error is provided', () => {
    render(
      <ConversionContainer title="Test Converter" error="Something went wrong">
        <div>Test content</div>
      </ConversionContainer>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows copy button when copyValue and onCopy are provided', () => {
    const mockOnCopy = vi.fn()
    
    render(
      <ConversionContainer 
        title="Test Converter" 
        copyValue="test value"
        onCopy={mockOnCopy}
      >
        <div>Test content</div>
      </ConversionContainer>
    )

    const copyButton = screen.getByRole('button')
    expect(copyButton).toBeInTheDocument()
  })
})