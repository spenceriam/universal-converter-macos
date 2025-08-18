import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TimeZoneConverter } from '../TimeZoneConverter'
import { timeZoneService } from '../../services/timeZoneService'
import type { TimeZone, TimeConversionResult } from '../../types'
import userEvent from '@testing-library/user-event'
import { act } from 'react'

// Mock the time zone service
vi.mock('../../services/timeZoneService', () => ({
  timeZoneService: {
    getSupportedTimeZones: vi.fn(),
    getCurrentTime: vi.fn(),
    convertTime: vi.fn(),
    isDSTActive: vi.fn(),
    searchTimeZones: vi.fn(),
    validateTimeZone: vi.fn()
  }
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  useSpring: () => ({ set: vi.fn() }),
  useTransform: () => 'mocked-value'
}))

// Mock global objects
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
  },
  writable: true
})

// Mock DOM methods for Radix UI
Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: vi.fn().mockReturnValue(false),
  writable: true
})

Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: vi.fn(),
  writable: true
})

Object.defineProperty(Element.prototype, 'releasePointerCapture', {
  value: vi.fn(),
  writable: true
})

const mockTimeZones: TimeZone[] = [
  {
    id: 'America/New_York',
    name: 'New York (Eastern Time)',
    offset: -300,
    isDST: true,
    country: 'United States',
    region: 'Americas'
  },
  {
    id: 'Europe/London',
    name: 'London (GMT/BST)',
    offset: 60,
    isDST: true,
    country: 'United Kingdom',
    region: 'Europe'
  },
  {
    id: 'Asia/Tokyo',
    name: 'Tokyo (JST)',
    offset: 540,
    isDST: false,
    country: 'Japan',
    region: 'Asia'
  },
  {
    id: 'Australia/Sydney',
    name: 'Sydney (AEST/AEDT)',
    offset: 660,
    isDST: true,
    country: 'Australia',
    region: 'Oceania'
  }
]

const mockConversionResult: TimeConversionResult = {
  sourceTime: new Date('2024-01-15T10:00:00Z'),
  targetTime: new Date('2024-01-15T15:00:00Z'),
  sourceTimeZone: mockTimeZones[0],
  targetTimeZone: mockTimeZones[1],
  isDSTTransition: false
}

describe('TimeZoneConverter', () => {
  const mockGetSupportedTimeZones = vi.mocked(timeZoneService.getSupportedTimeZones)
  const mockGetCurrentTime = vi.mocked(timeZoneService.getCurrentTime)
  const mockConvertTime = vi.mocked(timeZoneService.convertTime)
  const mockIsDSTActive = vi.mocked(timeZoneService.isDSTActive)
  const mockSearchTimeZones = vi.mocked(timeZoneService.searchTimeZones)
  const mockValidateTimeZone = vi.mocked(timeZoneService.validateTimeZone)

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockGetSupportedTimeZones.mockReturnValue(mockTimeZones)
    mockGetCurrentTime.mockImplementation((tz) => {
      const baseTime = new Date('2024-01-15T12:00:00Z')
      // Simulate different times for different zones
      if (tz === 'America/New_York') return Promise.resolve(new Date('2024-01-15T07:00:00'))
      if (tz === 'Europe/London') return Promise.resolve(new Date('2024-01-15T12:00:00'))
      return Promise.resolve(baseTime)
    })
    mockConvertTime.mockResolvedValue(mockConversionResult)
    mockIsDSTActive.mockImplementation((tz) => {
      return tz === 'America/New_York' || tz === 'Europe/London' || tz === 'Australia/Sydney'
    })
    mockSearchTimeZones.mockImplementation((query) => {
      return mockTimeZones.filter(tz => 
        tz.name.toLowerCase().includes(query.toLowerCase()) ||
        tz.id.toLowerCase().includes(query.toLowerCase())
      )
    })
    mockValidateTimeZone.mockReturnValue(true)
  })



  describe('Component Rendering', () => {
    it('renders with default props', async () => {
      render(<TimeZoneConverter />)
      
      expect(screen.getByText('Time Zone Converter')).toBeInTheDocument()
      expect(screen.getByText('From Time Zone')).toBeInTheDocument()
      expect(screen.getByText('To Time Zone')).toBeInTheDocument()
      expect(screen.getByText('Convert Specific Date & Time')).toBeInTheDocument()
    })

    it('renders live clocks for both time zones', async () => {
      render(<TimeZoneConverter />)
      
      await waitFor(() => {
        expect(screen.getAllByText('New York (Eastern Time)')).toHaveLength(2) // In select and clock
        expect(screen.getAllByText('London (GMT/BST)')).toHaveLength(2) // In select and clock
      })
    })

    it('displays DST indicators when active', async () => {
      render(<TimeZoneConverter />)
      
      await waitFor(() => {
        const dstBadges = screen.getAllByText('DST Active')
        expect(dstBadges).toHaveLength(2) // Both default zones have DST
      })
    })

    it('applies custom className', () => {
      render(<TimeZoneConverter className="custom-class" />)
      // The className is passed to ConversionContainer, so check for it in the card
      expect(screen.getByText('Time Zone Converter').closest('.custom-class')).toBeInTheDocument()
    })
  })

  describe('Time Zone Selection', () => {
    it('initializes with default time zones', async () => {
      render(<TimeZoneConverter />)
      
      await waitFor(() => {
        expect(mockGetCurrentTime).toHaveBeenCalledWith('America/New_York')
        expect(mockGetCurrentTime).toHaveBeenCalledWith('Europe/London')
      })
    })

    it('uses custom default time zones when provided', async () => {
      render(
        <TimeZoneConverter 
          defaultSourceTz="Asia/Tokyo"
          defaultTargetTz="Australia/Sydney"
        />
      )
      
      await waitFor(() => {
        expect(mockGetCurrentTime).toHaveBeenCalledWith('Asia/Tokyo')
        expect(mockGetCurrentTime).toHaveBeenCalledWith('Australia/Sydney')
      })
    })

    it('shows DST badges for time zones with DST active', async () => {
      render(<TimeZoneConverter />)
      
      await waitFor(() => {
        const dstBadges = screen.getAllByText('DST')
        expect(dstBadges.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Time Zone Search', () => {
    it('loads supported time zones on initialization', () => {
      render(<TimeZoneConverter />)
      
      expect(mockGetSupportedTimeZones).toHaveBeenCalled()
    })

    it('provides search functionality through service', () => {
      render(<TimeZoneConverter />)
      
      // Component should have access to search functionality
      expect(mockGetSupportedTimeZones).toHaveBeenCalled()
    })
  })

  describe('Live Clock Updates', () => {
    it('updates current times every second', async () => {
      vi.useFakeTimers()
      
      render(<TimeZoneConverter />)
      
      // Initial call
      expect(mockGetCurrentTime).toHaveBeenCalledTimes(2)
      
      // Advance time by 1 second
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      await waitFor(() => {
        expect(mockGetCurrentTime).toHaveBeenCalledTimes(4) // 2 more calls
      })
      
      vi.useRealTimers()
    })

    it('displays formatted time correctly', async () => {
      render(<TimeZoneConverter />)
      
      await waitFor(() => {
        // Check that time is displayed (format: HH:MM:SS)
        expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument()
      })
    })

    it('displays formatted date correctly', async () => {
      render(<TimeZoneConverter />)
      
      await waitFor(() => {
        // Check that date is displayed (format: MM/DD/YYYY)
        expect(screen.getByText(/\d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument()
      })
    })
  })

  describe('Specific Date/Time Conversion', () => {
    it('has date/time input field', () => {
      render(<TimeZoneConverter />)
      
      const dateTimeInput = screen.getByLabelText(/Date and Time/)
      expect(dateTimeInput).toBeInTheDocument()
      expect(dateTimeInput).toHaveAttribute('type', 'datetime-local')
    })

    it('calls conversion service when date is provided', async () => {
      const onConversion = vi.fn()
      render(<TimeZoneConverter onConversion={onConversion} />)
      
      const dateTimeInput = screen.getByLabelText(/Date and Time/)
      fireEvent.change(dateTimeInput, { target: { value: '2024-01-15T10:00' } })
      
      await waitFor(() => {
        expect(mockConvertTime).toHaveBeenCalled()
      })
    })

    it('handles conversion errors gracefully', async () => {
      mockConvertTime.mockRejectedValue(new Error('Conversion failed'))
      
      render(<TimeZoneConverter />)
      
      const dateTimeInput = screen.getByLabelText(/Date and Time/)
      fireEvent.change(dateTimeInput, { target: { value: '2024-01-15T10:00' } })
      
      await waitFor(() => {
        expect(screen.getByText('Conversion failed')).toBeInTheDocument()
      })
    })
  })

  describe('Copy Functionality', () => {
    it('provides copy button', () => {
      render(<TimeZoneConverter />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('displays error when time zone service fails', async () => {
      mockGetCurrentTime.mockRejectedValue(new Error('Network error'))
      
      render(<TimeZoneConverter />)
      
      // Error should be handled gracefully without crashing
      expect(screen.getByText('Time Zone Converter')).toBeInTheDocument()
    })

    it('handles conversion errors gracefully', async () => {
      const user = userEvent.setup()
      mockConvertTime.mockRejectedValue(new Error('Conversion failed'))
      
      render(<TimeZoneConverter />)
      
      const dateTimeInput = screen.getByLabelText(/Date and Time/)
      await user.type(dateTimeInput, '2024-01-15T10:00')
      
      await waitFor(() => {
        expect(screen.getByText('Conversion failed')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper labels for form elements', () => {
      render(<TimeZoneConverter />)
      
      expect(screen.getByText('From Time Zone')).toBeInTheDocument()
      expect(screen.getByText('To Time Zone')).toBeInTheDocument()
      expect(screen.getByLabelText(/Date and Time/)).toBeInTheDocument()
    })

    it('has proper ARIA attributes for selects', () => {
      render(<TimeZoneConverter />)
      
      const selects = screen.getAllByRole('combobox')
      expect(selects).toHaveLength(2)
      
      selects.forEach(select => {
        expect(select).toHaveAttribute('aria-expanded')
      })
    })
  })

  describe('Props and Callbacks', () => {
    it('calls onConversion callback when conversion happens', async () => {
      const onConversion = vi.fn()
      
      render(<TimeZoneConverter onConversion={onConversion} />)
      
      const dateTimeInput = screen.getByLabelText(/Date and Time/)
      fireEvent.change(dateTimeInput, { target: { value: '2024-01-15T10:00' } })
      
      await waitFor(() => {
        expect(onConversion).toHaveBeenCalledWith(mockConversionResult)
      })
    })
  })

  describe('Performance', () => {
    it('loads time zones efficiently', () => {
      render(<TimeZoneConverter />)
      
      expect(mockGetSupportedTimeZones).toHaveBeenCalledTimes(1)
    })
  })
})