import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TimeZoneConverter } from '../TimeZoneConverter'
import { timeZoneService } from '../../services/timeZoneService'
import type { TimeZone, TimeConversionResult } from '../../types'

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
  }
]

const mockConversionResult: TimeConversionResult = {
  sourceTime: new Date('2024-01-15T10:00:00Z'),
  targetTime: new Date('2024-01-15T15:00:00Z'),
  sourceTimeZone: mockTimeZones[0],
  targetTimeZone: mockTimeZones[1],
  isDSTTransition: false
}

describe('TimeZoneConverter - Basic Tests', () => {
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
    mockGetCurrentTime.mockImplementation(() => {
      return Promise.resolve(new Date('2024-01-15T12:00:00Z'))
    })
    mockConvertTime.mockResolvedValue(mockConversionResult)
    mockIsDSTActive.mockImplementation((tz) => {
      return tz === 'America/New_York' || tz === 'Europe/London'
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
    it('renders with default props', () => {
      render(<TimeZoneConverter />)
      
      expect(screen.getByText('Time Zone Converter')).toBeInTheDocument()
      expect(screen.getByText('From Time Zone')).toBeInTheDocument()
      expect(screen.getByText('To Time Zone')).toBeInTheDocument()
      expect(screen.getByText('Convert Specific Date & Time')).toBeInTheDocument()
    })

    it('displays DST indicators when active', () => {
      render(<TimeZoneConverter />)
      
      const dstBadges = screen.getAllByText('DST')
      expect(dstBadges.length).toBeGreaterThan(0)
    })

    it('has proper form elements', () => {
      render(<TimeZoneConverter />)
      
      // Check for time zone selects
      const selects = screen.getAllByRole('combobox')
      expect(selects).toHaveLength(2)
      
      // Check for date/time input
      const dateTimeInput = screen.getByLabelText(/Date and Time/)
      expect(dateTimeInput).toBeInTheDocument()
      expect(dateTimeInput).toHaveAttribute('type', 'datetime-local')
    })

    it('loads supported time zones on initialization', () => {
      render(<TimeZoneConverter />)
      
      expect(mockGetSupportedTimeZones).toHaveBeenCalled()
    })

    it('initializes current time updates', () => {
      render(<TimeZoneConverter />)
      
      expect(mockGetCurrentTime).toHaveBeenCalledWith('America/New_York')
      expect(mockGetCurrentTime).toHaveBeenCalledWith('Europe/London')
    })
  })

  describe('Props', () => {
    it('uses custom default time zones when provided', () => {
      render(
        <TimeZoneConverter 
          defaultSourceTz="Asia/Tokyo"
          defaultTargetTz="Europe/London"
        />
      )
      
      expect(mockGetCurrentTime).toHaveBeenCalledWith('Asia/Tokyo')
      expect(mockGetCurrentTime).toHaveBeenCalledWith('Europe/London')
    })

    it('accepts onConversion callback', () => {
      const onConversion = vi.fn()
      
      render(<TimeZoneConverter onConversion={onConversion} />)
      
      // Component should render without errors
      expect(screen.getByText('Time Zone Converter')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<TimeZoneConverter className="custom-class" />)
      
      // The className is passed to ConversionContainer
      expect(screen.getByText('Time Zone Converter').closest('.custom-class')).toBeInTheDocument()
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

  describe('Service Integration', () => {
    it('calls time zone service methods', () => {
      render(<TimeZoneConverter />)
      
      expect(mockGetSupportedTimeZones).toHaveBeenCalled()
      expect(mockGetCurrentTime).toHaveBeenCalled()
    })

    it('handles DST status checking', () => {
      render(<TimeZoneConverter />)
      
      expect(mockIsDSTActive).toHaveBeenCalled()
    })
  })
})