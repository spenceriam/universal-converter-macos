import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CurrencyConverter } from '../CurrencyConverter'
import { currencyService } from '../../services/currencyService'
import { ErrorType, CurrencyConversionResult } from '../../types'

// Mock the currency service
vi.mock('../../services/currencyService', () => ({
  currencyService: {
    convertCurrency: vi.fn(),
    getSupportedCurrencies: vi.fn(),
    getExchangeRates: vi.fn(),
    getLastUpdateTime: vi.fn(),
    isRateStale: vi.fn()
  }
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  useSpring: (value: number) => ({ set: vi.fn(), get: () => value }),
  useTransform: (spring: any, transform: (value: number) => number) => transform(spring.get())
}))

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

const mockCurrencyService = currencyService as {
  convertCurrency: vi.MockedFunction<any>
  getSupportedCurrencies: vi.MockedFunction<any>
  getExchangeRates: vi.MockedFunction<any>
  getLastUpdateTime: vi.MockedFunction<any>
  isRateStale: vi.MockedFunction<any>
}

describe('CurrencyConverter Focused Tests', () => {
  const mockCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' }
  ]

  const mockConversionResult: CurrencyConversionResult = {
    amount: 85.5,
    formattedAmount: '€85.50',
    fromCurrency: { code: 'USD', name: 'US Dollar', symbol: '$' },
    toCurrency: { code: 'EUR', name: 'Euro', symbol: '€' },
    rate: 0.855,
    timestamp: Date.now(),
    isStale: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockCurrencyService.getSupportedCurrencies.mockReturnValue(mockCurrencies)
    mockCurrencyService.convertCurrency.mockResolvedValue(mockConversionResult)
    mockCurrencyService.getLastUpdateTime.mockReturnValue(new Date())
    mockCurrencyService.isRateStale.mockReturnValue(false)
    mockCurrencyService.getExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { EUR: 0.855 },
      timestamp: Date.now(),
      source: 'frankfurter'
    })
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true })
  })

  describe('Basic Rendering', () => {
    it('should render currency converter with all essential elements', async () => {
      await act(async () => {
        render(<CurrencyConverter />)
      })

      expect(screen.getByText('Currency Converter')).toBeInTheDocument()
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(screen.getByLabelText('Amount')).toBeInTheDocument()
      expect(screen.getByText('From')).toBeInTheDocument()
      expect(screen.getByText('To')).toBeInTheDocument()
    })

    it('should display conversion result when available', async () => {
      await act(async () => {
        render(<CurrencyConverter />)
      })

      await waitFor(() => {
        expect(screen.getByText('85.5')).toBeInTheDocument()
        expect(screen.getByText('€85.50')).toBeInTheDocument()
      })
    })
  })

  describe('Currency Conversion', () => {
    it('should perform conversion when amount changes', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<CurrencyConverter />)
      })

      const amountInput = screen.getByLabelText('Amount')
      
      await act(async () => {
        await user.clear(amountInput)
        await user.type(amountInput, '100')
      })

      // Wait for debounced conversion
      await waitFor(() => {
        expect(mockCurrencyService.convertCurrency).toHaveBeenCalledWith(
          100, 'USD', 'EUR'
        )
      }, { timeout: 1000 })
    })

    it('should call onConversion callback when provided', async () => {
      const onConversion = vi.fn()
      
      await act(async () => {
        render(<CurrencyConverter onConversion={onConversion} />)
      })

      await waitFor(() => {
        expect(onConversion).toHaveBeenCalledWith(mockConversionResult)
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when conversion fails', async () => {
      const error = {
        id: 'test-error',
        type: ErrorType.API_ERROR,
        message: 'Failed to fetch exchange rates',
        timestamp: Date.now(),
        severity: 'medium' as const
      }

      mockCurrencyService.convertCurrency.mockRejectedValue(error)

      await act(async () => {
        render(<CurrencyConverter />)
      })

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch exchange rates')).toBeInTheDocument()
      })
    })
  })

  describe('Online/Offline Status', () => {
    it('should display online status when connected', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true })
      
      await act(async () => {
        render(<CurrencyConverter />)
      })

      expect(screen.getByText('Online')).toBeInTheDocument()
    })

    it('should display offline status and warning when disconnected', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      await act(async () => {
        render(<CurrencyConverter />)
      })

      expect(screen.getByText('Offline')).toBeInTheDocument()
      expect(screen.getByText(/Using cached exchange rates/)).toBeInTheDocument()
    })
  })

  describe('Rate Freshness', () => {
    it('should display rate freshness indicator', async () => {
      const recentTime = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      
      // Mock the conversion result with the older timestamp
      const resultWithOlderTimestamp: CurrencyConversionResult = {
        ...mockConversionResult,
        timestamp: recentTime.getTime()
      }
      
      mockCurrencyService.convertCurrency.mockResolvedValue(resultWithOlderTimestamp)
      mockCurrencyService.getLastUpdateTime.mockReturnValue(recentTime)

      await act(async () => {
        render(<CurrencyConverter />)
      })

      await waitFor(() => {
        expect(screen.getByText('30m ago')).toBeInTheDocument()
      })
    })

    it('should show stale data warning for old rates', async () => {
      const staleResult: CurrencyConversionResult = {
        ...mockConversionResult,
        isStale: true
      }

      mockCurrencyService.convertCurrency.mockResolvedValue(staleResult)

      await act(async () => {
        render(<CurrencyConverter />)
      })

      await waitFor(() => {
        expect(screen.getByText(/Exchange rates may be outdated/)).toBeInTheDocument()
        expect(screen.getByText('Stale')).toBeInTheDocument()
      })
    })
  })

  describe('Input Validation', () => {
    it('should handle invalid amount input gracefully', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<CurrencyConverter />)
      })

      const amountInput = screen.getByLabelText('Amount')
      
      await act(async () => {
        await user.clear(amountInput)
        await user.type(amountInput, 'invalid')
      })

      // Should not call conversion service with invalid input
      await waitFor(() => {
        // The service should not be called with NaN
        const calls = mockCurrencyService.convertCurrency.mock.calls
        const invalidCalls = calls.filter(call => isNaN(call[0]))
        expect(invalidCalls).toHaveLength(0)
      })
    })

    it('should handle empty amount input', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<CurrencyConverter />)
      })

      const amountInput = screen.getByLabelText('Amount')
      
      await act(async () => {
        await user.clear(amountInput)
      })

      // Should clear result when amount is empty
      await waitFor(() => {
        expect(screen.queryByText('85.5')).not.toBeInTheDocument()
      })
    })
  })

  describe('Manual Refresh', () => {
    it('should handle manual rate refresh', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<CurrencyConverter />)
      })

      const refreshButton = screen.getByRole('button', { name: /refresh exchange rates/i })
      
      await act(async () => {
        await user.click(refreshButton)
      })

      await waitFor(() => {
        expect(mockCurrencyService.getExchangeRates).toHaveBeenCalledWith('USD')
      })
    })

    it('should disable refresh button when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      await act(async () => {
        render(<CurrencyConverter />)
      })

      const refreshButton = screen.getByRole('button', { name: /refresh exchange rates/i })
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Currency Swapping', () => {
    it('should swap currencies when swap button is clicked', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<CurrencyConverter />)
      })

      // Wait for initial conversion
      await waitFor(() => {
        expect(mockCurrencyService.convertCurrency).toHaveBeenCalledWith(1, 'USD', 'EUR')
      })

      const swapButton = screen.getByRole('button', { name: /swap currencies/i })
      
      await act(async () => {
        await user.click(swapButton)
      })

      // After swap: EUR -> USD
      await waitFor(() => {
        expect(mockCurrencyService.convertCurrency).toHaveBeenCalledWith(1, 'EUR', 'USD')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', async () => {
      await act(async () => {
        render(<CurrencyConverter />)
      })

      expect(screen.getByLabelText('Amount')).toBeInTheDocument()
      expect(screen.getByText('From')).toBeInTheDocument()
      expect(screen.getByText('To')).toBeInTheDocument()
      
      // Check for proper button labels
      expect(screen.getByRole('button', { name: /refresh exchange rates/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /swap currencies/i })).toBeInTheDocument()
    })
  })
})