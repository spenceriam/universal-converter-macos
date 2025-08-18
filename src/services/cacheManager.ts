import { storageManager, STORAGE_KEYS } from './storageManager'
import { 
  ExchangeRates, 
  UserPreferences, 
  TimeZoneData, 
  ErrorType,
  DEFAULT_USER_PREFERENCES 
} from '../types'

/**
 * Cache TTL configurations for different data types
 */
export const CACHE_TTL = {
  EXCHANGE_RATES: 60 * 60 * 1000, // 1 hour
  TIMEZONE_DATA: 24 * 60 * 60 * 1000, // 24 hours
  USER_PREFERENCES: Infinity, // Never expire
  UNIT_PREFERENCES: 7 * 24 * 60 * 60 * 1000, // 1 week
} as const

/**
 * Cache validation and integrity checking
 */
interface CacheValidationResult {
  isValid: boolean
  errors: string[]
  shouldRegenerate: boolean
}

/**
 * CacheManager - High-level cache operations with data validation
 */
export class CacheManager {
  /**
   * Cache exchange rates with validation
   */
  async cacheExchangeRates(rates: ExchangeRates): Promise<void> {
    try {
      // Validate exchange rates data
      const validation = this.validateExchangeRates(rates)
      if (!validation.isValid) {
        throw new Error(`Invalid exchange rates data: ${validation.errors.join(', ')}`)
      }

      await storageManager.set(STORAGE_KEYS.EXCHANGE_RATES, rates, CACHE_TTL.EXCHANGE_RATES)
    } catch (error) {
      console.error('Failed to cache exchange rates:', error)
      throw error
    }
  }

  /**
   * Get cached exchange rates with integrity check
   */
  async getCachedExchangeRates(): Promise<ExchangeRates | null> {
    try {
      const rates = await storageManager.get<ExchangeRates>(STORAGE_KEYS.EXCHANGE_RATES)
      
      if (!rates) return null

      // Validate cached data
      const validation = this.validateExchangeRates(rates)
      if (!validation.isValid) {
        console.warn('Cached exchange rates are corrupted, removing from cache')
        await storageManager.remove(STORAGE_KEYS.EXCHANGE_RATES)
        return null
      }

      return rates
    } catch (error) {
      console.error('Failed to get cached exchange rates:', error)
      return null
    }
  }

  /**
   * Cache user preferences with validation
   */
  async cacheUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      // Validate preferences data
      const validation = this.validateUserPreferences(preferences)
      if (!validation.isValid) {
        throw new Error(`Invalid user preferences: ${validation.errors.join(', ')}`)
      }

      await storageManager.set(STORAGE_KEYS.USER_PREFERENCES, preferences, CACHE_TTL.USER_PREFERENCES)
    } catch (error) {
      console.error('Failed to cache user preferences:', error)
      throw error
    }
  }

  /**
   * Get cached user preferences with fallback to defaults
   */
  async getCachedUserPreferences(): Promise<UserPreferences> {
    try {
      const preferences = await storageManager.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES)
      
      if (!preferences) {
        // Return default preferences if none cached
        return { ...DEFAULT_USER_PREFERENCES }
      }

      // Always merge with defaults first to ensure all properties exist
      const mergedPreferences = { ...DEFAULT_USER_PREFERENCES, ...preferences }

      // Validate the merged preferences
      const validation = this.validateUserPreferences(mergedPreferences)
      if (!validation.isValid) {
        console.warn('Cached user preferences are corrupted, using defaults')
        return { ...DEFAULT_USER_PREFERENCES }
      }

      return mergedPreferences
    } catch (error) {
      console.error('Failed to get cached user preferences:', error)
      return { ...DEFAULT_USER_PREFERENCES }
    }
  }

  /**
   * Cache timezone data
   */
  async cacheTimeZoneData(timezoneId: string, data: TimeZoneData): Promise<void> {
    try {
      const validation = this.validateTimeZoneData(data)
      if (!validation.isValid) {
        throw new Error(`Invalid timezone data: ${validation.errors.join(', ')}`)
      }

      const key = `${STORAGE_KEYS.TIMEZONE_DATA}_${timezoneId}`
      await storageManager.set(key, data, CACHE_TTL.TIMEZONE_DATA)
    } catch (error) {
      console.error('Failed to cache timezone data:', error)
      throw error
    }
  }

  /**
   * Get cached timezone data
   */
  async getCachedTimeZoneData(timezoneId: string): Promise<TimeZoneData | null> {
    try {
      const key = `${STORAGE_KEYS.TIMEZONE_DATA}_${timezoneId}`
      const data = await storageManager.get<TimeZoneData>(key)
      
      if (!data) return null

      const validation = this.validateTimeZoneData(data)
      if (!validation.isValid) {
        console.warn(`Cached timezone data for ${timezoneId} is corrupted, removing from cache`)
        await storageManager.remove(key)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to get cached timezone data:', error)
      return null
    }
  }

  /**
   * Cache unit preferences
   */
  async cacheUnitPreferences(preferences: Record<string, string>): Promise<void> {
    try {
      await storageManager.set(STORAGE_KEYS.UNIT_PREFERENCES, preferences, CACHE_TTL.UNIT_PREFERENCES)
    } catch (error) {
      console.error('Failed to cache unit preferences:', error)
      throw error
    }
  }

  /**
   * Get cached unit preferences
   */
  async getCachedUnitPreferences(): Promise<Record<string, string> | null> {
    try {
      return await storageManager.get<Record<string, string>>(STORAGE_KEYS.UNIT_PREFERENCES)
    } catch (error) {
      console.error('Failed to get cached unit preferences:', error)
      return null
    }
  }

  /**
   * Check if cached data is stale
   */
  async isDataStale(key: string, maxAge: number): Promise<boolean> {
    try {
      const data = await storageManager.get(key)
      if (!data) return true

      // Check if we have timestamp information
      const now = Date.now()
      if (typeof data === 'object' && data !== null && 'timestamp' in data) {
        const timestamp = (data as any).timestamp
        return now - timestamp > maxAge
      }

      return false
    } catch {
      return true
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number
    entryCount: number
    exchangeRatesAge: number | null
    userPreferencesExists: boolean
  }> {
    try {
      const totalSize = await storageManager.size()
      
      // Check exchange rates age
      const exchangeRates = await storageManager.get<ExchangeRates>(STORAGE_KEYS.EXCHANGE_RATES)
      const exchangeRatesAge = exchangeRates ? Date.now() - exchangeRates.timestamp : null

      // Check if user preferences exist
      const userPreferences = await storageManager.get(STORAGE_KEYS.USER_PREFERENCES)
      const userPreferencesExists = userPreferences !== null

      return {
        totalSize,
        entryCount: 0, // Will be implemented based on storage manager
        exchangeRatesAge,
        userPreferencesExists
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return {
        totalSize: 0,
        entryCount: 0,
        exchangeRatesAge: null,
        userPreferencesExists: false
      }
    }
  }

  /**
   * Clear all cached data except user preferences
   */
  async clearCache(preservePreferences = true): Promise<void> {
    try {
      if (preservePreferences) {
        // Get current preferences before clearing
        const preferences = await this.getCachedUserPreferences()
        
        // Clear all cache
        await storageManager.clear()
        
        // Restore preferences
        await this.cacheUserPreferences(preferences)
      } else {
        await storageManager.clear()
      }
    } catch (error) {
      console.error('Failed to clear cache:', error)
      throw error
    }
  }

  /**
   * Validate exchange rates data structure
   */
  private validateExchangeRates(rates: ExchangeRates): CacheValidationResult {
    const errors: string[] = []

    if (!rates.base || typeof rates.base !== 'string') {
      errors.push('Missing or invalid base currency')
    }

    if (!rates.rates || typeof rates.rates !== 'object') {
      errors.push('Missing or invalid rates object')
    } else {
      // Check if rates contain valid numbers
      for (const [currency, rate] of Object.entries(rates.rates)) {
        if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
          errors.push(`Invalid rate for currency ${currency}: ${rate}`)
        }
      }
    }

    if (!rates.timestamp || typeof rates.timestamp !== 'number') {
      errors.push('Missing or invalid timestamp')
    } else {
      // Check if timestamp is reasonable (not too old or in future)
      const now = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000
      if (rates.timestamp < now - 7 * dayInMs || rates.timestamp > now + dayInMs) {
        errors.push('Timestamp is unreasonable')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      shouldRegenerate: errors.length > 0
    }
  }

  /**
   * Validate user preferences data structure
   */
  private validateUserPreferences(preferences: UserPreferences): CacheValidationResult {
    const errors: string[] = []

    // Check required string fields
    const stringFields = ['defaultCurrency', 'defaultTimeZone', 'theme', 'colorScheme', 'fontSize']
    for (const field of stringFields) {
      if (!(field in preferences) || typeof preferences[field as keyof UserPreferences] !== 'string') {
        errors.push(`Missing or invalid ${field}`)
      }
    }

    // Check numeric fields
    if (typeof preferences.decimalPlaces !== 'number' || preferences.decimalPlaces < 0 || preferences.decimalPlaces > 15) {
      errors.push('Invalid decimalPlaces value')
    }

    // Check boolean fields
    const booleanFields = ['autoUpdateRates', 'showCopyFeedback', 'enableAnimations']
    for (const field of booleanFields) {
      if (typeof preferences[field as keyof UserPreferences] !== 'boolean') {
        errors.push(`Invalid ${field} value`)
      }
    }

    // Check preferredUnits object
    if (!preferences.preferredUnits || typeof preferences.preferredUnits !== 'object') {
      errors.push('Missing or invalid preferredUnits')
    }

    return {
      isValid: errors.length === 0,
      errors,
      shouldRegenerate: false // Don't regenerate preferences, use defaults instead
    }
  }

  /**
   * Validate timezone data structure
   */
  private validateTimeZoneData(data: TimeZoneData): CacheValidationResult {
    const errors: string[] = []

    if (!data.datetime || typeof data.datetime !== 'string') {
      errors.push('Missing or invalid datetime')
    }

    if (!data.timezone || typeof data.timezone !== 'string') {
      errors.push('Missing or invalid timezone')
    }

    if (!data.utc_offset || typeof data.utc_offset !== 'string') {
      errors.push('Missing or invalid utc_offset')
    }

    if (typeof data.dst !== 'boolean') {
      errors.push('Missing or invalid dst flag')
    }

    if (typeof data.dst_offset !== 'number') {
      errors.push('Missing or invalid dst_offset')
    }

    return {
      isValid: errors.length === 0,
      errors,
      shouldRegenerate: errors.length > 0
    }
  }
}

/**
 * Singleton instance of the cache manager
 */
export const cacheManager = new CacheManager()

/**
 * Utility functions for cache management
 */
export const CacheUtils = {
  /**
   * Format cache size for display
   */
  formatCacheSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Format cache age for display
   */
  formatCacheAge(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    
    return 'Just now'
  },

  /**
   * Check if cache is healthy
   */
  async isCacheHealthy(): Promise<boolean> {
    try {
      const stats = await cacheManager.getCacheStats()
      
      // Check if cache size is reasonable (less than 10MB)
      if (stats.totalSize > 10 * 1024 * 1024) {
        return false
      }

      // Check if exchange rates are not too old (less than 7 days)
      if (stats.exchangeRatesAge && stats.exchangeRatesAge > 7 * 24 * 60 * 60 * 1000) {
        return false
      }

      return true
    } catch {
      return false
    }
  }
}