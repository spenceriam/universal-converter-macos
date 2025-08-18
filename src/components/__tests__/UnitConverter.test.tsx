import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

// Mock framer-motion for AnimatedNumber and BlurFade
vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  useSpring: vi.fn((value) => ({ set: vi.fn(), get: () => value })),
  useTransform: vi.fn((spring, transform) => transform(spring.get()))
}))

// Mock UI components that might cause issues
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
      { id: 'centimeter', name: 'Centimeter', symbol: 'cm', category: 'length', baseMultiplier: 0.01 },
      { id: 'foot', name: 'Foot', symbol: 'ft', category: 'length', baseMultiplier: 0.3048 },
      { id: 'inch', name: 'Inch', symbol: 'in', category: 'length', baseMultiplier: 0.0254 }
    ]
  },
  {
    id: 'weight',
    name: 'Weight & Mass',
    baseUnit: 'kilogram',
    description: 'Mass and weight measurements',
    units: [
      { id: 'kilogram', name: 'Kilogram', symbol: 'kg', category: 'weight', baseMultiplier: 1 },
      { id: 'gram', name: 'Gram', symbol: 'g', category: 'weight', baseMultiplier: 0.001 },
      { id: 'pound', name: 'Pound', symbol: 'lb', category: 'weight', baseMultiplier: 0.45359237 }
    ]
  }
]

const mockConversionResult: ConversionResult = {
  value: 3.28084,
  formattedValue: '3.28084',
  unit: mockCategories[0].units[3], // foot
  precision: 5,
  timestamp: Date.now()
}

describe('UnitConverter', () => {
  const mockOnConversion = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(unitConverter.getCategories).mockReturnValue(mockCategories)
    vi.mocked(unitConverter.convert).mockResolvedValue(mockConversionResult)
    vi.mocked(unitConverter.validateInput).mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('renders with default category and units', async () => {
    render(<UnitConverter />)
    
    expect(screen.getByText('Unit Converter')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('From')).toBeInTheDocument()
    expect(screen.getByText('To')).toBeInTheDocument()
    
    // Should show length category by default
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
  })

  it('initializes with correct default units for length category', async () => {
    render(<UnitConverter initialCategory="length" />)
    
    await waitFor(() => {
      // Should have meter and kilometer as default units (popular units)
      expect(screen.getByText('Meter')).toBeInTheDocument()
    })
  })

  it('changes category and updates available units', async () => {
    render(<UnitConverter />)
    
    // Find and click the category selector
    const categorySelect = screen.getByRole('combobox')
    fireEvent.click(categorySelect)
    
    // Select weight category
    const weightOption = screen.getByText('Weight & Mass')
    fireEvent.click(weightOption)
    
    await waitFor(() => {
      // Should now show weight units
      expect(screen.getByText('Kilogram')).toBeInTheDocument()
    })
  })

  it('performs conversion when input changes', async () => {
    render(<UnitConverter onConversion={mockOnConversion} />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Change input value
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '5' } })
    
    // Wait for debounced conversion
    await waitFor(() => {
      expect(unitConverter.convert).toHaveBeenCalledWith(5, 'meter', 'kilometer')
    }, { timeout: 1000 })
    
    expect(mockOnConversion).toHaveBeenCalledWith(mockConversionResult)
  })

  it('swaps source and target units', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Find and click the swap button
    const swapButton = screen.getByRole('button')
    fireEvent.click(swapButton)
    
    // Should trigger a new conversion with swapped units
    await waitFor(() => {
      expect(unitConverter.convert).toHaveBeenCalled()
    })
  })

  it('filters units based on search input', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Open source unit selector
    const sourceSelect = screen.getAllByRole('combobox')[1] // Second combobox is source unit
    fireEvent.click(sourceSelect)
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search units...')
    fireEvent.change(searchInput, { target: { value: 'meter' } })
    
    // Should show filtered results
    await waitFor(() => {
      expect(screen.getByText('Meter')).toBeInTheDocument()
      expect(screen.getByText('Centimeter')).toBeInTheDocument()
      expect(screen.getByText('Kilometer')).toBeInTheDocument()
    })
  })

  it('validates input and shows error for invalid values', async () => {
    vi.mocked(unitConverter.validateInput).mockReturnValue(false)
    
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Enter invalid input
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: 'invalid' } })
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid number')).toBeInTheDocument()
    })
  })

  it('handles conversion errors gracefully', async () => {
    const errorMessage = 'Conversion failed'
    vi.mocked(unitConverter.convert).mockRejectedValue(new Error(errorMessage))
    
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Change input to trigger conversion
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '5' } })
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('displays result with animated number', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Change input to trigger conversion
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '1' } })
    
    await waitFor(() => {
      expect(screen.getByText('3.28084')).toBeInTheDocument()
    })
  })

  it('shows unit badges with correct symbols', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      // Should show unit symbols in badges
      expect(screen.getByText('m')).toBeInTheDocument() // meter symbol
    })
  })

  it('displays conversion summary with precision info', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Trigger conversion
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '1' } })
    
    await waitFor(() => {
      expect(screen.getByText(/Result rounded to \d+ decimal places/)).toBeInTheDocument()
    })
  })

  it('supports keyboard navigation', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Focus first combobox
    const categorySelect = screen.getAllByRole('combobox')[0]
    categorySelect.focus()
    expect(categorySelect).toHaveFocus()
  })

  it('handles responsive layout classes', () => {
    render(<UnitConverter className="custom-class" />)
    
    const container = screen.getByText('Unit Converter').closest('.unit-converter')
    expect(container).toHaveClass('custom-class')
  })

  it('debounces conversion calls', async () => {
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    const input = screen.getByDisplayValue('1')
    
    // Change input multiple times quickly
    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.change(input, { target: { value: '123' } })
    
    // Should only call convert once after debounce
    await waitFor(() => {
      expect(unitConverter.convert).toHaveBeenCalledTimes(1)
    }, { timeout: 1000 })
  })

  it('shows loading state during conversion', async () => {
    // Mock a slow conversion
    vi.mocked(unitConverter.convert).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockConversionResult), 500))
    )
    
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Trigger conversion
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '5' } })
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  it('provides copy functionality through ConversionContainer', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
    
    render(<UnitConverter />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
    
    // Trigger conversion to get a result
    const input = screen.getByDisplayValue('1')
    fireEvent.change(input, { target: { value: '1' } })
    
    await waitFor(() => {
      expect(screen.getByText('3.28084')).toBeInTheDocument()
    })
    
    // Find and click copy button
    const copyButton = screen.getByRole('button')
    fireEvent.click(copyButton)
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('3.28084 ft')
  })
})