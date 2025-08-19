import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UnitConverter } from '../UnitConverter'
import { unitConverter } from '@/services/unitConversion'
import type { ConversionResult } from '@/types'

// Mock the unit conversion service
vi.mock('@/services/unitConversion', () => ({
  unitConverter: {
    getCategories: vi.fn(),
    convert: vi.fn(),
    getSupportedUnits: vi.fn(),
    validateInput: vi.fn()
  }
}))

// Mock framer-motion components
vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  useSpring: vi.fn((value) => ({ set: vi.fn(), get: () => value })),
  useTransform: vi.fn((spring, transform) => transform(spring.get()))
}))

// Mock UI components
vi.mock('@/components/ui/blur-fade', () => ({
  BlurFade: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

vi.mock('@/components/ui/animated-number', () => ({
  AnimatedNumber: ({ value, ...props }: any) => <span {...props}>{value}</span>
}))

const mockCategories = [
  {
    id: 'length',
    name: 'Length',
    baseUnit: 'meter',
    description: 'Distance and length measurements',
    units: [
      { id: 'meter', name: 'Meter', symbol: 'm', category: 'length', baseMultiplier: 1 },
      { id: 'kilometer', name: 'Kilometer', symbol: 'km', category: 'length', baseMultiplier: 1000 },
      { id: 'foot', name: 'Foot', symbol: 'ft', category: 'length', baseMultiplier: 0.3048 }
    ]
  }
]

const mockConversionResult: ConversionResult = {
  value: 0.001,
  formattedValue: '0.001',
  unit: mockCategories[0].units[1], // kilometer
  precision: 3,
  timestamp: Date.now()
}

describe('UnitConverter - Basic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(unitConverter.getCategories).mockReturnValue(mockCategories)
    vi.mocked(unitConverter.convert).mockResolvedValue(mockConversionResult)
    vi.mocked(unitConverter.validateInput).mockReturnValue(true)
  })

  it('renders the component with title', () => {
    render(<UnitConverter />)
    expect(screen.getByText('Unit Converter')).toBeInTheDocument()
  })

  it('displays category selector', () => {
    render(<UnitConverter />)
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Length')).toBeInTheDocument()
  })

  it('displays from and to sections', () => {
    render(<UnitConverter />)
    expect(screen.getByText('From')).toBeInTheDocument()
    expect(screen.getByText('To')).toBeInTheDocument()
  })

  it('shows default input value', async () => {
    render(<UnitConverter />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
  })

  it('displays unit information section', async () => {
    render(<UnitConverter />)
    await waitFor(() => {
      expect(screen.getByText('Source Unit')).toBeInTheDocument()
      expect(screen.getByText('Target Unit')).toBeInTheDocument()
    })
  })

  it('handles input changes', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '5' } })
    
    expect(input).toHaveValue('5')
  })

  it('calls conversion service when input changes', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '2' } })
    
    // Wait for debounced conversion
    await waitFor(() => {
      expect(unitConverter.convert).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('displays conversion result', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '1' } })
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('0.001')).toBeInTheDocument()
    })
  })

  it('shows unit symbols in badges', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      // Should show meter symbol in badges
      const meterBadges = screen.getAllByText('m')
      expect(meterBadges.length).toBeGreaterThan(0)
      // Should show kilometer symbol in badges
      const kilometerBadges = screen.getAllByText('km')
      expect(kilometerBadges.length).toBeGreaterThan(0)
    })
  })

  it('handles conversion errors', async () => {
    const errorMessage = 'Conversion failed'
    vi.mocked(unitConverter.convert).mockRejectedValue(new Error(errorMessage))
    
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '5' } })
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('validates input and shows error for invalid values', async () => {
    render(<UnitConverter />)
    
    // Wait for component to fully load with units selected
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
      // Wait for units to be loaded (check for unit badges or selects)
      expect(screen.getByText('Length')).toBeInTheDocument()
    })
    
    // Wait a bit more for units to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: 'invalid' } })
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid number')
    }, { timeout: 3000 })
  })

  it('accepts custom className', () => {
    render(<UnitConverter className="custom-class" />)
    
    const container = screen.getByText('Unit Converter').closest('.unit-converter')
    expect(container).toHaveClass('custom-class')
  })

  it('calls onConversion callback when conversion completes', async () => {
    const mockOnConversion = vi.fn()
    render(<UnitConverter onConversion={mockOnConversion} />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '2' } })
    
    await waitFor(() => {
      expect(mockOnConversion).toHaveBeenCalledWith(mockConversionResult)
    }, { timeout: 1000 })
  })
})