import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CacheManager, cacheManager, CacheUtils } from '../cacheManager'
import { storageManager } from '../storageManager'
import { ExchangeRates, UserPreferences, TimeZoneData, DEFAULT_USER_PREFERENCES } from '../../types'

// Mock the storage manager
vi.mock('../storageManager', () => ({
  storageManager: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    size: vi.fn()
  },
  STORAGE_KEYS: {
    USER_PREFERENCES: 'universal_converter_preferences',
    EXCHANGE_RATES: 'currency_exchange_rates',
    TIMEZONE_DATA: 'timezone_data',
    UNIT_PREFERENCES: 'unit_preferences',
    CACHE_METADATA: 'cache_metadata',
    APP_VERSION: 'app_version'
  }
}))

describe('CacheManager', () => {
  let manager: CacheManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new CacheManager()
  })

  describe('Exchange Rates Caching', () => {
    const validExchangeRates: ExchangeRates = {
      base: 'USD',
      rates: { EUR: 0.85, GBP: 0.73, JPY: 110.0 },
      timestamp: Date.now(),
      source: 'frankfurter'
    }

    it('should cache valid exchange rates', async () => {
      await manager.cacheExchangeRates(validExchangeRates)

      expect(storageManager.set).toHaveBeenCalledWith(
        'currency_exchange_rates',
        validExchangeRates,
        60 * 60 * 1000 // 1 hour TTL
      )
    })

    it('should reject invalid exchange rates', async () => {
      const invalidRates = {
        base: '', // Invalid base
        rates: { EUR: -1 }, // Invalid rate
        timestamp: Date.now()
      } as ExchangeRates

      await expect(manager.cacheExchangeRates(invalidRates))
        .rejects.toThrow('Invalid exchange rates data')
    })

    it('should get cached exchange rates', async () => {
      vi.mocked(storageManager.get).mockResolvedValue(validExchangeRates)

      const result = await manager.getCachedExchangeRates()

      expect(result).toEqual(validExchangeRates)
      expect(storageManager.get).toHaveBeenCalledWith('currency_exchange_rates')
    })

    it('should return null when no cached rates exist', async () => {
      vi.mocked(storageManager.get).mockResolvedValue(null)

      const result = await manager.getCachedExchangeRates()

      expect(result).toBeNull()
    })

    it('should remove corrupted exchange rates', async () => {
      const corruptedRates = {
        base: 'USD',
        rates: { EUR: 'invalid' }, // Invalid rate type
        timestamp: Date.now()
      } as any

      vi.mocked(storageManager.get).mockResolvedValue(corruptedRates)

      const result = await manager.getCachedExchangeRates()

      expect(result).toBeNull()
      expect(storageManager.remove).toHaveBeenCalledWith('currency_exchange_rates')
    })

    it('should validate exchange rates with unreasonable timestamp', async () => {
      const ratesWithBadTimestamp = {
        ...validExchangeRates,
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days ago
      }

      await expect(manager.cacheExchangeRates(ratesWithBadTimestamp))
        .rejects.toThrow('Invalid exchange rates data')
    })
  })

  describe('User Preferences Caching', () => {
    const validPreferences: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      defaultCurrency: 'EUR',
      decimalPlaces: 4
    }

    it('should cache valid user preferences', async () => {
      await manager.cacheUserPreferences(validPreferences)

      expect(storageManager.set).toHaveBeenCalledWith(
        'universal_converter_preferences',
        validPreferences,
        Infinity // Never expire
      )
    })

    it('should reject invalid user preferences', async () => {
      const invalidPreferences = {
        ...validPreferences,
        decimalPlaces: -1 // Invalid decimal places
      }

      await expect(manager.cacheUserPreferences(invalidPreferences))
        .rejects.toThrow('Invalid user preferences')
    })

    it('should get cached user preferences', async () => {
      vi.mocked(storageManager.get).mockResolvedValue(validPreferences)

      const result = await manager.getCachedUserPreferences()

      expect(result).toEqual(validPreferences)
    })

    it('should return defaults when no cached preferences exist', async () => {
      vi.mocked(storageManager.get).mockResolvedValue(null)

      const result = await manager.getCachedUserPreferences()

      expect(result).toEqual(DEFAULT_USER_PREFERENCES)
    })

    it('should merge cached preferences with defaults', async () => {
      const partialPreferences = {
        defaultCurrency: 'EUR',
        decimalPlaces: 4
      }

      vi.mocked(storageManager.get).mockResolvedValue(partialPreferences as UserPreferences)

      const result = await manager.getCachedUserPreferences()

      expect(result.defaultCurrency).toBe('EUR')
      expect(result.decimalPlaces).toBe(4)
      expect(result.theme).toBe(DEFAULT_USER_PREFERENCES.theme)
      expect(result.colorScheme).toBe(DEFAULT_USER_PREFERENCES.colorScheme)
    })

    it('should handle corrupted preferences gracefully', async () => {
      const corruptedPreferences = {
        defaultCurrency: 123, // Wrong type
        decimalPlaces: 'invalid' // Wrong type
      }

      vi.mocked(storageManager.get).mockResolvedValue(corruptedPreferences as any)

      const result = await manager.getCachedUserPreferences()

      expect(result).toEqual(DEFAULT_USER_PREFERENCES)
    })
  })

  describe('TimeZone Data Caching', () => {
    const validTimeZoneData: TimeZoneData = {
      datetime: '2023-12-01T12:00:00.000Z',
      timezone: 'America/New_York',
      utc_offset: '-05:00',
      dst: false,
      dst_offset: 0
    }

    it('should cache valid timezone data', async () => {
      await manager.cacheTimeZoneData('America/New_York', validTimeZoneData)

      expect(storageManager.set).toHaveBeenCalledWith(
        'timezone_data_America/New_York',
        validTimeZoneData,
        24 * 60 * 60 * 1000 // 24 hours TTL
      )
    })

    it('should reject invalid timezone data', async () => {
      const invalidData = {
        datetime: '', // Invalid datetime
        timezone: 'America/New_York',
        utc_offset: '-05:00',
        dst: 'invalid', // Wrong type
        dst_offset: 0
      } as any

      await expect(manager.cacheTimeZoneData('America/New_York', invalidData))
        .rejects.toThrow('Invalid timezone data')
    })

    it('should get cached timezone data', async () => {
      vi.mocked(storageManager.get).mockResolvedValue(validTimeZoneData)

      const result = await manager.getCachedTimeZoneData('America/New_York')

      expect(result).toEqual(validTimeZoneData)
      expect(storageManager.get).toHaveBeenCalledWith('timezone_data_America/New_York')
    })

    it('should remove corrupted timezone data', async () => {
      const corruptedData = {
        datetime: 'invalid-date',
        timezone: 123 // Wrong type
      }

      vi.mocked(storageManager.get).mockResolvedValue(corruptedData as any)

      const result = await manager.getCachedTimeZoneData('America/New_York')

      expect(result).toBeNull()
      expect(storageManager.remove).toHaveBeenCalledWith('timezone_data_America/New_York')
    })
  })

  describe('Unit Preferences Caching', () => {
    const unitPreferences = {
      length: 'meter',
      weight: 'kilogram',
      temperature: 'celsius'
    }

    it('should cache unit preferences', async () => {
      await manager.cacheUnitPreferences(unitPreferences)

      expect(storageManager.set).toHaveBeenCalledWith(
        'unit_preferences',
        unitPreferences,
        7 * 24 * 60 * 60 * 1000 // 1 week TTL
      )
    })

    it('should get cached unit preferences', async () => {
      vi.mocked(storageManager.get).mockResolvedValue(unitPreferences)

      const result = await manager.getCachedUnitPreferences()

      expect(result).toEqual(unitPreferences)
    })

    it('should return null when no unit preferences exist', async () => {
      vi.mocked(storageManager.get).mockResolvedValue(null)

      const result = await manager.getCachedUnitPreferences()

      expect(result).toBeNull()
    })
  })

  describe('Cache Statistics', () => {
    it('should get cache statistics', async () => {
      const mockExchangeRates = {
        base: 'USD',
        rates: { EUR: 0.85, GBP: 0.73 },
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
        source: 'frankfurter'
      }

      const mockPreferences = { ...DEFAULT_USER_PREFERENCES }

      vi.mocked(storageManager.size).mockResolvedValue(1024)
      vi.mocked(storageManager.get).mockImplementation((key) => {
        if (key === 'currency_exchange_rates') return Promise.resolve(mockExchangeRates)
        if (key === 'universal_converter_preferences') return Promise.resolve(mockPreferences)
        return Promise.resolve(null)
      })

      const stats = await manager.getCacheStats()

      expect(stats.totalSize).toBe(1024)
      expect(stats.exchangeRatesAge).toBeCloseTo(30 * 60 * 1000, -3) // ~30 minutes
      expect(stats.userPreferencesExists).toBe(true)
    })

    it('should handle missing data in statistics', async () => {
      vi.mocked(storageManager.size).mockResolvedValue(0)
      vi.mocked(storageManager.get).mockResolvedValue(null)

      const stats = await manager.getCacheStats()

      expect(stats.totalSize).toBe(0)
      expect(stats.exchangeRatesAge).toBeNull()
      expect(stats.userPreferencesExists).toBe(false)
    })
  })

  describe('Cache Clearing', () => {
    it('should clear cache while preserving preferences', async () => {
      const preferences = { ...DEFAULT_USER_PREFERENCES, defaultCurrency: 'EUR' }
      vi.mocked(storageManager.get).mockResolvedValue(preferences)

      await manager.clearCache(true)

      expect(storageManager.clear).toHaveBeenCalled()
      expect(storageManager.set).toHaveBeenCalledWith(
        'universal_converter_preferences',
        preferences,
        Infinity
      )
    })

    it('should clear all cache including preferences', async () => {
      await manager.clearCache(false)

      expect(storageManager.clear).toHaveBeenCalled()
      expect(storageManager.set).not.toHaveBeenCalled()
    })
  })

  describe('Data Staleness Check', () => {
    it('should detect stale data', async () => {
      const staleData = {
        timestamp: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
      }

      vi.mocked(storageManager.get).mockResolvedValue(staleData)

      const isStale = await manager.isDataStale('test-key', 60 * 60 * 1000) // 1 hour max age

      expect(isStale).toBe(true)
    })

    it('should detect fresh data', async () => {
      const freshData = {
        timestamp: Date.now() - 30 * 60 * 1000 // 30 minutes ago
      }

      vi.mocked(storageManager.get).mockResolvedValue(freshData)

      const isStale = await manager.isDataStale('test-key', 60 * 60 * 1000) // 1 hour max age

      expect(isStale).toBe(false)
    })

    it('should consider missing data as stale', async () => {
      vi.mocked(storageManager.get).mockResolvedValue(null)

      const isStale = await manager.isDataStale('test-key', 60 * 60 * 1000)

      expect(isStale).toBe(true)
    })
  })
})

describe('CacheUtils', () => {
  describe('formatCacheSize', () => {
    it('should format bytes correctly', () => {
      expect(CacheUtils.formatCacheSize(0)).toBe('0 B')
      expect(CacheUtils.formatCacheSize(1024)).toBe('1 KB')
      expect(CacheUtils.formatCacheSize(1024 * 1024)).toBe('1 MB')
      expect(CacheUtils.formatCacheSize(1536)).toBe('1.5 KB')
    })
  })

  describe('formatCacheAge', () => {
    it('should format age correctly', () => {
      const now = Date.now()
      
      expect(CacheUtils.formatCacheAge(now)).toBe('Just now')
      expect(CacheUtils.formatCacheAge(now - 30 * 1000)).toBe('Just now')
      expect(CacheUtils.formatCacheAge(now - 5 * 60 * 1000)).toBe('5 minutes ago')
      expect(CacheUtils.formatCacheAge(now - 2 * 60 * 60 * 1000)).toBe('2 hours ago')
      expect(CacheUtils.formatCacheAge(now - 3 * 24 * 60 * 60 * 1000)).toBe('3 days ago')
    })

    it('should handle singular forms', () => {
      const now = Date.now()
      
      expect(CacheUtils.formatCacheAge(now - 1 * 60 * 1000)).toBe('1 minute ago')
      expect(CacheUtils.formatCacheAge(now - 1 * 60 * 60 * 1000)).toBe('1 hour ago')
      expect(CacheUtils.formatCacheAge(now - 1 * 24 * 60 * 60 * 1000)).toBe('1 day ago')
    })
  })

  describe('isCacheHealthy', () => {
    it('should return true for healthy cache', async () => {
      vi.mocked(storageManager.size).mockResolvedValue(1024) // 1KB
      vi.mocked(storageManager.get).mockResolvedValue({
        timestamp: Date.now() - 60 * 60 * 1000 // 1 hour ago
      })

      const isHealthy = await CacheUtils.isCacheHealthy()

      expect(isHealthy).toBe(true)
    })

    it('should return false for oversized cache', async () => {
      vi.mocked(storageManager.size).mockResolvedValue(15 * 1024 * 1024) // 15MB
      vi.mocked(storageManager.get).mockResolvedValue({
        timestamp: Date.now() - 60 * 60 * 1000
      })

      const isHealthy = await CacheUtils.isCacheHealthy()

      expect(isHealthy).toBe(false)
    })

    it('should return false for very stale exchange rates', async () => {
      vi.mocked(storageManager.size).mockResolvedValue(1024)
      vi.mocked(storageManager.get).mockResolvedValue({
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days ago
      })

      const isHealthy = await CacheUtils.isCacheHealthy()

      expect(isHealthy).toBe(false)
    })

    it('should handle cache check errors', async () => {
      // Mock getCacheStats to throw an error
      const originalGetCacheStats = cacheManager.getCacheStats
      cacheManager.getCacheStats = vi.fn().mockRejectedValue(new Error('Storage error'))

      const isHealthy = await CacheUtils.isCacheHealthy()

      expect(isHealthy).toBe(false)

      // Restore original method
      cacheManager.getCacheStats = originalGetCacheStats
    })
  })
})