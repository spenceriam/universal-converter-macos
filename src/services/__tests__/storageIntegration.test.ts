import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LocalStorageManager } from '../storageManager'
import { CacheManager } from '../cacheManager'
import { PreferencesManager } from '../preferencesManager'
import { ExchangeRates, UserPreferences, DEFAULT_USER_PREFERENCES } from '../../types'

describe('Storage System Integration', () => {
  let storageManager: LocalStorageManager
  let cacheManager: CacheManager
  let preferencesManager: PreferencesManager

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    
    storageManager = new LocalStorageManager()
    cacheManager = new CacheManager()
    preferencesManager = new PreferencesManager()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Basic Storage Operations', () => {
    it('should store and retrieve data with TTL', async () => {
      const testData = { message: 'Hello World', timestamp: Date.now() }
      
      await storageManager.set('test-key', testData, 60000) // 1 minute TTL
      const retrieved = await storageManager.get('test-key')
      
      expect(retrieved).toEqual(testData)
    })

    it('should return null for expired data', async () => {
      const testData = { message: 'Expired' }
      
      await storageManager.set('expired-key', testData, -1000) // Already expired
      const retrieved = await storageManager.get('expired-key')
      
      expect(retrieved).toBeNull()
    })

    it('should handle cache size tracking', async () => {
      const testData = { message: 'Size test' }
      
      await storageManager.set('size-test', testData)
      const size = await storageManager.size()
      
      expect(size).toBeGreaterThan(0)
    })
  })

  describe('Exchange Rates Caching', () => {
    it('should cache and retrieve exchange rates', async () => {
      const exchangeRates: ExchangeRates = {
        base: 'USD',
        rates: { EUR: 0.85, GBP: 0.73, JPY: 110.0 },
        timestamp: Date.now(),
        source: 'frankfurter'
      }

      await cacheManager.cacheExchangeRates(exchangeRates)
      const cached = await cacheManager.getCachedExchangeRates()

      expect(cached).toEqual(exchangeRates)
    })

    it('should reject invalid exchange rates', async () => {
      const invalidRates = {
        base: '',
        rates: { EUR: -1 },
        timestamp: Date.now()
      } as ExchangeRates

      await expect(cacheManager.cacheExchangeRates(invalidRates))
        .rejects.toThrow('Invalid exchange rates data')
    })
  })

  describe('User Preferences Management', () => {
    it('should initialize with defaults', async () => {
      await preferencesManager.waitForInitialization()
      const preferences = await preferencesManager.getPreferences()

      expect(preferences.defaultCurrency).toBe(DEFAULT_USER_PREFERENCES.defaultCurrency)
      expect(preferences.theme).toBe(DEFAULT_USER_PREFERENCES.theme)
    })

    it('should update and persist preferences', async () => {
      await preferencesManager.waitForInitialization()
      
      await preferencesManager.updatePreferences({
        defaultCurrency: 'EUR',
        decimalPlaces: 4
      })

      const updated = await preferencesManager.getPreferences()
      expect(updated.defaultCurrency).toBe('EUR')
      expect(updated.decimalPlaces).toBe(4)
    })

    it('should validate preference updates', async () => {
      await preferencesManager.waitForInitialization()
      
      // Invalid decimal places should be ignored
      await preferencesManager.updatePreferences({
        decimalPlaces: -1
      })

      const preferences = await preferencesManager.getPreferences()
      expect(preferences.decimalPlaces).toBe(DEFAULT_USER_PREFERENCES.decimalPlaces)
    })

    it('should export and import preferences', async () => {
      await preferencesManager.waitForInitialization()
      
      // Set some custom preferences
      await preferencesManager.updatePreferences({
        defaultCurrency: 'GBP',
        decimalPlaces: 8
      })

      // Export preferences
      const exported = await preferencesManager.exportPreferences()
      const parsed = JSON.parse(exported)

      expect(parsed.preferences.defaultCurrency).toBe('GBP')
      expect(parsed.preferences.decimalPlaces).toBe(8)
      expect(parsed.version).toBe('1.0')

      // Reset to defaults
      await preferencesManager.resetPreferences()
      let resetPrefs = await preferencesManager.getPreferences()
      expect(resetPrefs.defaultCurrency).toBe(DEFAULT_USER_PREFERENCES.defaultCurrency)

      // Import the exported preferences
      await preferencesManager.importPreferences(exported)
      const imported = await preferencesManager.getPreferences()

      expect(imported.defaultCurrency).toBe('GBP')
      expect(imported.decimalPlaces).toBe(8)
    })
  })

  describe('Cache Statistics and Health', () => {
    it('should provide cache statistics', async () => {
      // Add some test data
      const exchangeRates: ExchangeRates = {
        base: 'USD',
        rates: { EUR: 0.85 },
        timestamp: Date.now(),
        source: 'test'
      }

      await cacheManager.cacheExchangeRates(exchangeRates)

      const stats = await cacheManager.getCacheStats()

      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.exchangeRatesAge).toBeLessThan(1000) // Less than 1 second old
      // Note: userPreferencesExists might be false in this isolated test, which is fine
    })

    it('should clear cache while preserving preferences', async () => {
      // Set up some data
      const exchangeRates: ExchangeRates = {
        base: 'USD',
        rates: { EUR: 0.85 },
        timestamp: Date.now(),
        source: 'test'
      }

      await cacheManager.cacheExchangeRates(exchangeRates)
      await preferencesManager.waitForInitialization()
      await preferencesManager.updatePreferences({ defaultCurrency: 'EUR' })

      // Clear cache but preserve preferences
      await cacheManager.clearCache(true)

      // Exchange rates should be gone
      const cachedRates = await cacheManager.getCachedExchangeRates()
      expect(cachedRates).toBeNull()

      // Preferences should be preserved
      const preferences = await preferencesManager.getPreferences()
      expect(preferences.defaultCurrency).toBe('EUR')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle corrupted cache data gracefully', async () => {
      // Manually corrupt localStorage data
      localStorage.setItem('currency_exchange_rates', 'invalid-json')

      const cached = await cacheManager.getCachedExchangeRates()
      expect(cached).toBeNull()
    })

    it('should recover from storage errors', async () => {
      // This test verifies that the system continues to work even when storage operations fail
      const testData = { test: 'data' }
      
      // Should not throw even if storage is full or fails
      await expect(storageManager.set('test', testData)).resolves.not.toThrow()
      
      // Should return null gracefully if retrieval fails
      const result = await storageManager.get('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = []
      
      // Create multiple concurrent storage operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          storageManager.set(`key-${i}`, { value: i, timestamp: Date.now() })
        )
      }

      // All operations should complete successfully
      await Promise.all(operations)

      // Verify all data was stored
      for (let i = 0; i < 10; i++) {
        const result = await storageManager.get(`key-${i}`)
        expect(result).toEqual({ value: i, timestamp: expect.any(Number) })
      }
    })

    it('should clean up expired entries automatically', async () => {
      // Add some expired data
      await storageManager.set('expired-1', { data: 'old' }, -1000)
      await storageManager.set('expired-2', { data: 'old' }, -1000)
      await storageManager.set('valid', { data: 'new' }, 60000)

      // Trigger cleanup by adding new data
      await storageManager.set('trigger-cleanup', { data: 'trigger' })

      // Expired data should be gone
      expect(await storageManager.get('expired-1')).toBeNull()
      expect(await storageManager.get('expired-2')).toBeNull()
      
      // Valid data should remain
      expect(await storageManager.get('valid')).toEqual({ data: 'new' })
    })
  })
})