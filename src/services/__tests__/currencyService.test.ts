import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { CurrencyServiceImpl } from '../currencyService'
import { ErrorType } from '../../types'

// Mock fetch globally
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock AbortSignal.timeout
global.AbortSignal = {
  timeout: vi.fn(() => ({
    aborted: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
} as any

describe('CurrencyService', () => {
  let currencyService: CurrencyServiceImpl
  const mockFetch = fetch as Mock

  const mockExchangeRateResponse = {
    amount: 1.0,
    base: 'USD',
    date: '2024-01-15',
    rates: {
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
      CAD: 1.25,
      AUD: 1.35
    }
  }

  const mockCachedRates = {
    base: 'USD',
    rates: {
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0
    },
    timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
    source: 'frankfurter'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset navigator.onLine before creating service
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
    
    // Clear localStorage before each test
    localStorageMock.getItem.mockReturnValue(null)
    
    currencyService = new CurrencyServiceImpl()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getExchangeRates', () => {
    it('should fetch fresh rates when cache is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExchangeRateResponse)
      })

      const rates = await currencyService.getExchangeRates('USD')

      expect(rates.base).toBe('USD')
      expect(rates.rates.EUR).toBe(0.85)
      expect(rates.timestamp).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.frankfurter.app/latest?from=USD',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      )
    })

    it('should return cached rates when they are fresh', async () => {
      const freshCachedRates = {
        ...mockCachedRates,
        timestamp: Date.now() - 10 * 60 * 1000 // 10 minutes ago (fresh)
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: freshCachedRates,
        timestamp: freshCachedRates.timestamp,
        version: '1.0'
      }))

      // Create new service instance to load cached data
      currencyService = new CurrencyServiceImpl()
      
      const rates = await currencyService.getExchangeRates('USD')

      expect(rates).toEqual(freshCachedRates)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch fresh rates when cached rates are stale', async () => {
      const staleCachedRates = {
        ...mockCachedRates,
        timestamp: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago (stale)
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: staleCachedRates,
        timestamp: staleCachedRates.timestamp,
        version: '1.0'
      }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExchangeRateResponse)
      })

      const rates = await currencyService.getExchangeRates('USD')

      expect(rates.base).toBe('USD')
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should convert rates to different base currency', async () => {
      const usdRates = {
        base: 'USD',
        rates: { EUR: 0.85, GBP: 0.73 },
        timestamp: Date.now() - 10 * 60 * 1000,
        source: 'frankfurter'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: usdRates,
        timestamp: usdRates.timestamp,
        version: '1.0'
      }))

      // Create new service instance to load cached data
      currencyService = new CurrencyServiceImpl()

      const rates = await currencyService.getExchangeRates('EUR')

      expect(rates.base).toBe('EUR')
      expect(rates.rates.USD).toBeCloseTo(1 / 0.85, 5)
      expect(rates.rates.GBP).toBeCloseTo(0.73 / 0.85, 5)
    })

    it('should handle API errors with retry logic', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      // Mock failed requests followed by success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExchangeRateResponse)
        })

      const rates = await currencyService.getExchangeRates('USD')

      expect(rates.base).toBe('USD')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle rate limiting errors', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({})
      } as Response)

      await expect(currencyService.getExchangeRates('USD'))
        .rejects
        .toMatchObject({
          type: ErrorType.RATE_LIMIT_ERROR,
          message: expect.stringContaining('rate limit')
        })
    })

    it('should fall back to cached rates when API fails', async () => {
      const cachedRates = {
        ...mockCachedRates,
        timestamp: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: cachedRates,
        timestamp: cachedRates.timestamp,
        version: '1.0'
      }))

      mockFetch.mockRejectedValue(new Error('API unavailable'))

      // Create new service instance with cached data
      const fallbackService = new CurrencyServiceImpl()
      
      const rates = await fallbackService.getExchangeRates('USD')

      expect(rates).toEqual(cachedRates)
    })

    it('should handle offline mode', async () => {
      const cachedRates = {
        ...mockCachedRates,
        timestamp: Date.now() - 30 * 60 * 1000
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: cachedRates,
        timestamp: cachedRates.timestamp,
        version: '1.0'
      }))

      // Set offline before creating service
      Object.defineProperty(navigator, 'onLine', { value: false })
      currencyService = new CurrencyServiceImpl()

      const rates = await currencyService.getExchangeRates('USD')

      expect(rates).toEqual(cachedRates)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw error for unsupported currency', async () => {
      await expect(currencyService.getExchangeRates('INVALID'))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('Unsupported base currency')
        })
    })

    it('should throw error when offline with no cache', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      // Set offline before creating service
      Object.defineProperty(navigator, 'onLine', { value: false })
      currencyService = new CurrencyServiceImpl()

      await expect(currencyService.getExchangeRates('USD'))
        .rejects
        .toMatchObject({
          type: ErrorType.NETWORK_ERROR,
          message: expect.stringContaining('No internet connection')
        })
    })
  })

  describe('convertCurrency', () => {
    beforeEach(() => {
      // Setup fresh cached rates for conversion tests
      const cachedRates = {
        base: 'USD',
        rates: { EUR: 0.85, GBP: 0.73, JPY: 110.0 },
        timestamp: Date.now() - 10 * 60 * 1000,
        source: 'frankfurter'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: cachedRates,
        timestamp: cachedRates.timestamp,
        version: '1.0'
      }))
      
      // Create new service instance with cached data
      currencyService = new CurrencyServiceImpl()
    })

    it('should convert currency correctly', async () => {
      const result = await currencyService.convertCurrency(100, 'USD', 'EUR')

      expect(result.amount).toBe(85) // 100 * 0.85
      expect(result.fromCurrency.code).toBe('USD')
      expect(result.toCurrency.code).toBe('EUR')
      expect(result.rate).toBe(0.85)
      expect(result.isStale).toBe(false)
      expect(result.formattedAmount).toContain('85')
    })

    it('should handle same currency conversion', async () => {
      const result = await currencyService.convertCurrency(100, 'USD', 'USD')

      expect(result.amount).toBe(100)
      expect(result.rate).toBe(1)
      expect(result.fromCurrency.code).toBe('USD')
      expect(result.toCurrency.code).toBe('USD')
    })

    it('should validate amount input', async () => {
      await expect(currencyService.convertCurrency(NaN, 'USD', 'EUR'))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('Invalid amount')
        })

      await expect(currencyService.convertCurrency(-100, 'USD', 'EUR'))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('Invalid amount')
        })
    })

    it('should validate currency codes', async () => {
      await expect(currencyService.convertCurrency(100, 'INVALID', 'EUR'))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('Unsupported currency')
        })

      await expect(currencyService.convertCurrency(100, 'USD', 'INVALID'))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('Unsupported currency')
        })
    })

    it('should handle missing exchange rate', async () => {
      // Setup rates without the target currency
      const limitedRates = {
        base: 'USD',
        rates: { EUR: 0.85 }, // Missing GBP
        timestamp: Date.now() - 10 * 60 * 1000,
        source: 'frankfurter'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: limitedRates,
        timestamp: limitedRates.timestamp,
        version: '1.0'
      }))

      // Create new service instance with limited cached data
      const limitedService = new CurrencyServiceImpl()

      await expect(limitedService.convertCurrency(100, 'USD', 'GBP'))
        .rejects
        .toMatchObject({
          type: ErrorType.CONVERSION_ERROR,
          message: expect.stringContaining('Exchange rate not available')
        })
    })

    it('should mark conversion as stale when rates are old', async () => {
      const staleRates = {
        base: 'USD',
        rates: { EUR: 0.85 },
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        source: 'frankfurter'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: staleRates,
        timestamp: staleRates.timestamp,
        version: '1.0'
      }))

      // Set offline to prevent API calls
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      // Create new service instance with stale cached data
      const staleService = new CurrencyServiceImpl()

      const result = await staleService.convertCurrency(100, 'USD', 'EUR')

      expect(result.isStale).toBe(true)
    })
  })

  describe('getSupportedCurrencies', () => {
    it('should return list of supported currencies', () => {
      const currencies = currencyService.getSupportedCurrencies()

      expect(currencies).toHaveLength(20) // Based on SUPPORTED_CURRENCIES
      expect(currencies[0]).toHaveProperty('code')
      expect(currencies[0]).toHaveProperty('name')
      expect(currencies[0]).toHaveProperty('symbol')
      
      // Check for major currencies
      const codes = currencies.map(c => c.code)
      expect(codes).toContain('USD')
      expect(codes).toContain('EUR')
      expect(codes).toContain('GBP')
      expect(codes).toContain('JPY')
    })
  })

  describe('getLastUpdateTime', () => {
    it('should return null when no cached rates', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const lastUpdate = currencyService.getLastUpdateTime()
      
      expect(lastUpdate).toBeNull()
    })

    it('should return cached rates timestamp', async () => {
      const timestamp = Date.now() - 30 * 60 * 1000
      const cachedRates = {
        ...mockCachedRates,
        timestamp
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: cachedRates,
        timestamp,
        version: '1.0'
      }))

      // Create new service instance to load cached data
      const serviceWithCache = new CurrencyServiceImpl()
      
      const lastUpdate = serviceWithCache.getLastUpdateTime()
      
      expect(lastUpdate).toEqual(new Date(timestamp))
    })
  })

  describe('isRateStale', () => {
    it('should return false for fresh rates', () => {
      const freshTimestamp = Date.now() - 60 * 60 * 1000 // 1 hour ago
      
      expect(currencyService.isRateStale(freshTimestamp)).toBe(false)
    })

    it('should return true for stale rates', () => {
      const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      
      expect(currencyService.isRateStale(staleTimestamp)).toBe(true)
    })
  })

  describe('caching behavior', () => {
    it('should cache rates after successful fetch', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExchangeRateResponse)
      })

      await currencyService.getExchangeRates('USD')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'currency_exchange_rates',
        expect.stringContaining('"base":"USD"')
      )
    })

    it('should handle corrupted cache gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExchangeRateResponse)
      })

      // Create new service instance with corrupted cache
      const corruptedService = new CurrencyServiceImpl()
      
      const rates = await corruptedService.getExchangeRates('USD')

      expect(rates.base).toBe('USD')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currency_exchange_rates')
    })

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExchangeRateResponse)
      })

      // Should not throw despite caching error
      const rates = await currencyService.getExchangeRates('USD')
      
      expect(rates.base).toBe('USD')
    })
  })

  describe('error handling', () => {
    it('should handle invalid API response format', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ invalid: 'response' })
      } as Response)

      // Create new service instance for this test
      const invalidResponseService = new CurrencyServiceImpl()

      await expect(invalidResponseService.getExchangeRates('USD'))
        .rejects
        .toMatchObject({
          type: ErrorType.API_ERROR,
          message: expect.stringContaining('Invalid API response')
        })
    })

    it('should handle network timeout', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(currencyService.getExchangeRates('USD'))
        .rejects
        .toMatchObject({
          type: ErrorType.API_ERROR
        })
    })
  })
})