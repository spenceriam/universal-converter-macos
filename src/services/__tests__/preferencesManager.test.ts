import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PreferencesManager } from '../preferencesManager'
import { cacheManager } from '../cacheManager'
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '../../types'

// Mock the cache manager
vi.mock('../cacheManager', () => ({
  cacheManager: {
    getCachedUserPreferences: vi.fn(),
    cacheUserPreferences: vi.fn()
  }
}))

describe('PreferencesManager', () => {
  let manager: PreferencesManager

  beforeEach(async () => {
    vi.clearAllMocks()
    // Set up default mock behavior
    vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(DEFAULT_USER_PREFERENCES)
    manager = new PreferencesManager()
    // Wait for initialization to complete
    await manager.waitForInitialization()
  })

  describe('Initialization', () => {
    it('should initialize with cached preferences', async () => {
      const cachedPreferences: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        defaultCurrency: 'EUR',
        decimalPlaces: 4
      }

      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(cachedPreferences)

      const preferences = await manager.getPreferences()

      expect(preferences).toEqual(cachedPreferences)
      expect(cacheManager.getCachedUserPreferences).toHaveBeenCalled()
    })

    it('should initialize with defaults when cache fails', async () => {
      vi.mocked(cacheManager.getCachedUserPreferences).mockRejectedValue(new Error('Cache error'))

      const preferences = await manager.getPreferences()

      expect(preferences).toEqual(DEFAULT_USER_PREFERENCES)
    })

    it('should return defaults synchronously before initialization', () => {
      const preferences = manager.getPreferencesSync()

      expect(preferences).toEqual(DEFAULT_USER_PREFERENCES)
    })
  })

  describe('Preference Updates', () => {
    beforeEach(async () => {
      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(DEFAULT_USER_PREFERENCES)
      await manager.getPreferences() // Ensure initialization
    })

    it('should update valid preferences', async () => {
      const updates = {
        defaultCurrency: 'EUR',
        decimalPlaces: 4,
        enableAnimations: false
      }

      await manager.updatePreferences(updates)

      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith({
        ...DEFAULT_USER_PREFERENCES,
        ...updates
      })
    })

    it('should validate and normalize currency codes', async () => {
      await manager.updatePreferences({ defaultCurrency: 'eur' })

      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith({
        ...DEFAULT_USER_PREFERENCES,
        defaultCurrency: 'EUR'
      })
    })

    it('should reject invalid decimal places', async () => {
      await manager.updatePreferences({ decimalPlaces: -1 })

      // Should not update invalid values
      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith(DEFAULT_USER_PREFERENCES)
    })

    it('should reject invalid theme values', async () => {
      await manager.updatePreferences({ theme: 'invalid' as any })

      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith(DEFAULT_USER_PREFERENCES)
    })

    it('should validate boolean fields', async () => {
      await manager.updatePreferences({ 
        autoUpdateRates: true,
        showCopyFeedback: false,
        enableAnimations: true
      })

      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith({
        ...DEFAULT_USER_PREFERENCES,
        autoUpdateRates: true,
        showCopyFeedback: false,
        enableAnimations: true
      })
    })

    it('should handle preferredUnits object', async () => {
      const preferredUnits = {
        length: 'foot',
        weight: 'pound',
        temperature: 'fahrenheit'
      }

      await manager.updatePreferences({ preferredUnits })

      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith({
        ...DEFAULT_USER_PREFERENCES,
        preferredUnits
      })
    })
  })

  describe('Individual Preference Access', () => {
    beforeEach(async () => {
      const testPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        defaultCurrency: 'EUR',
        decimalPlaces: 4
      }
      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(testPreferences)
      await manager.getPreferences()
    })

    it('should get individual preference value', async () => {
      const currency = await manager.getPreference('defaultCurrency')
      expect(currency).toBe('EUR')

      const decimalPlaces = await manager.getPreference('decimalPlaces')
      expect(decimalPlaces).toBe(4)
    })

    it('should set individual preference value', async () => {
      await manager.setPreference('defaultCurrency', 'GBP')

      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultCurrency: 'GBP'
        })
      )
    })
  })

  describe('Specialized Preference Getters', () => {
    beforeEach(async () => {
      const testPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        theme: 'dark' as const,
        colorScheme: 'warm' as const,
        fontSize: 'large' as const,
        enableAnimations: false,
        defaultCurrency: 'EUR',
        decimalPlaces: 4
      }
      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(testPreferences)
      await manager.getPreferences()
    })

    it('should get theme preferences', async () => {
      const themePrefs = await manager.getThemePreferences()

      expect(themePrefs).toEqual({
        theme: 'dark',
        colorScheme: 'warm',
        fontSize: 'large',
        enableAnimations: false
      })
    })

    it('should get conversion preferences', async () => {
      const conversionPrefs = await manager.getConversionPreferences()

      expect(conversionPrefs).toEqual({
        defaultCurrency: 'EUR',
        defaultTimeZone: DEFAULT_USER_PREFERENCES.defaultTimeZone,
        preferredUnits: DEFAULT_USER_PREFERENCES.preferredUnits,
        decimalPlaces: 4,
        autoUpdateRates: DEFAULT_USER_PREFERENCES.autoUpdateRates
      })
    })
  })

  describe('Change Listeners', () => {
    it('should notify listeners on preference changes', async () => {
      const listener = vi.fn()
      const unsubscribe = manager.addChangeListener(listener)

      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(DEFAULT_USER_PREFERENCES)
      await manager.getPreferences() // Initialize

      await manager.updatePreferences({ defaultCurrency: 'EUR' })

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultCurrency: 'EUR'
        })
      )

      // Test unsubscribe
      unsubscribe()
      await manager.updatePreferences({ defaultCurrency: 'GBP' })

      expect(listener).toHaveBeenCalledTimes(2) // Should not be called again
    })

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      
      manager.addChangeListener(errorListener)

      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(DEFAULT_USER_PREFERENCES)
      await manager.getPreferences()

      // Should not throw despite listener error
      await expect(manager.updatePreferences({ defaultCurrency: 'EUR' }))
        .resolves.not.toThrow()
    })
  })

  describe('Reset Preferences', () => {
    it('should reset preferences to defaults', async () => {
      // Set some custom preferences first
      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue({
        ...DEFAULT_USER_PREFERENCES,
        defaultCurrency: 'EUR',
        decimalPlaces: 8
      })
      await manager.getPreferences()

      await manager.resetPreferences()

      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith(DEFAULT_USER_PREFERENCES)
    })
  })

  describe('Import/Export', () => {
    beforeEach(async () => {
      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(DEFAULT_USER_PREFERENCES)
      await manager.getPreferences()
    })

    it('should export preferences as JSON', async () => {
      const exported = await manager.exportPreferences()
      const parsed = JSON.parse(exported)

      expect(parsed.preferences).toEqual(DEFAULT_USER_PREFERENCES)
      expect(parsed.version).toBe('1.0')
      expect(parsed.exportDate).toBeDefined()
    })

    it('should import valid preferences', async () => {
      const importData = {
        preferences: {
          ...DEFAULT_USER_PREFERENCES,
          defaultCurrency: 'EUR',
          decimalPlaces: 4
        },
        version: '1.0',
        exportDate: new Date().toISOString()
      }

      await manager.importPreferences(JSON.stringify(importData))

      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith({
        ...DEFAULT_USER_PREFERENCES,
        defaultCurrency: 'EUR',
        decimalPlaces: 4
      })
    })

    it('should reject invalid import format', async () => {
      const invalidData = { invalid: 'format' }

      await expect(manager.importPreferences(JSON.stringify(invalidData)))
        .rejects.toThrow('Failed to import preferences')
    })

    it('should reject malformed JSON', async () => {
      await expect(manager.importPreferences('invalid json'))
        .rejects.toThrow('Failed to import preferences')
    })

    it('should validate imported preferences', async () => {
      const importData = {
        preferences: {
          ...DEFAULT_USER_PREFERENCES,
          defaultCurrency: 'invalid',
          decimalPlaces: -1 // Invalid
        },
        version: '1.0'
      }

      await manager.importPreferences(JSON.stringify(importData))

      // Should merge with defaults, filtering out invalid values
      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultCurrency: DEFAULT_USER_PREFERENCES.defaultCurrency, // Should use default
          decimalPlaces: DEFAULT_USER_PREFERENCES.decimalPlaces // Should use default
        })
      )
    })
  })

  describe('Initialization Status', () => {
    it('should track initialization status', () => {
      const newManager = new PreferencesManager()
      
      expect(newManager.isReady()).toBe(false)
    })

    it('should wait for initialization', async () => {
      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(DEFAULT_USER_PREFERENCES)
      
      const newManager = new PreferencesManager()
      
      // Should resolve when initialization completes
      await expect(newManager.waitForInitialization()).resolves.not.toThrow()
      expect(newManager.isReady()).toBe(true)
    })
  })

  describe('Validation Edge Cases', () => {
    beforeEach(async () => {
      vi.mocked(cacheManager.getCachedUserPreferences).mockResolvedValue(DEFAULT_USER_PREFERENCES)
      await manager.getPreferences()
    })

    it('should handle extreme decimal places values', async () => {
      await manager.updatePreferences({ decimalPlaces: 20 }) // Too high
      await manager.updatePreferences({ decimalPlaces: -5 }) // Too low
      await manager.updatePreferences({ decimalPlaces: 3.7 }) // Should floor to 3

      const calls = vi.mocked(cacheManager.cacheUserPreferences).mock.calls
      
      // First two calls should not change decimalPlaces (invalid values)
      expect(calls[0][0].decimalPlaces).toBe(DEFAULT_USER_PREFERENCES.decimalPlaces)
      expect(calls[1][0].decimalPlaces).toBe(DEFAULT_USER_PREFERENCES.decimalPlaces)
      
      // Third call should floor the value
      expect(calls[2][0].decimalPlaces).toBe(3)
    })

    it('should handle null and undefined values', async () => {
      await manager.updatePreferences({ 
        defaultCurrency: null as any,
        decimalPlaces: undefined as any,
        enableAnimations: null as any
      })

      // Should not update with null/undefined values
      expect(cacheManager.cacheUserPreferences).toHaveBeenCalledWith(DEFAULT_USER_PREFERENCES)
    })

    it('should validate fontSize enum values', async () => {
      await manager.updatePreferences({ fontSize: 'small' })
      await manager.updatePreferences({ fontSize: 'medium' })
      await manager.updatePreferences({ fontSize: 'large' })
      await manager.updatePreferences({ fontSize: 'invalid' as any })

      const calls = vi.mocked(cacheManager.cacheUserPreferences).mock.calls
      
      expect(calls[0][0].fontSize).toBe('small')
      expect(calls[1][0].fontSize).toBe('medium')
      expect(calls[2][0].fontSize).toBe('large')
      expect(calls[3][0].fontSize).toBe(DEFAULT_USER_PREFERENCES.fontSize) // Should not change
    })
  })
})