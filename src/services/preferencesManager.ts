import { UserPreferences, DEFAULT_USER_PREFERENCES, ErrorType } from '../types'
import { cacheManager } from './cacheManager'

/**
 * PreferencesManager - Handles user preferences with validation and persistence
 */
export class PreferencesManager {
  private preferences: UserPreferences = { ...DEFAULT_USER_PREFERENCES }
  private isInitialized = false
  private changeListeners: Array<(preferences: UserPreferences) => void> = []

  constructor() {
    this.initialize()
  }

  /**
   * Initialize preferences from cache
   */
  private async initialize(): Promise<void> {
    try {
      const cachedPreferences = await cacheManager.getCachedUserPreferences()
      this.preferences = cachedPreferences
      this.isInitialized = true
      this.notifyListeners()
    } catch (error) {
      console.warn('Failed to initialize preferences:', error)
      this.preferences = { ...DEFAULT_USER_PREFERENCES }
      this.isInitialized = true
    }
  }

  /**
   * Get current preferences (async to ensure initialization)
   */
  async getPreferences(): Promise<UserPreferences> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    return { ...this.preferences }
  }

  /**
   * Get current preferences synchronously (may return defaults if not initialized)
   */
  getPreferencesSync(): UserPreferences {
    return { ...this.preferences }
  }

  /**
   * Update preferences with validation
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Validate updates
    const validatedUpdates = this.validatePreferenceUpdates(updates)
    
    // Merge with current preferences
    const newPreferences = { ...this.preferences, ...validatedUpdates }
    
    // Cache the updated preferences
    await cacheManager.cacheUserPreferences(newPreferences)
    
    // Update local copy
    this.preferences = newPreferences
    
    // Notify listeners
    this.notifyListeners()
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    const defaultPreferences = { ...DEFAULT_USER_PREFERENCES }
    await cacheManager.cacheUserPreferences(defaultPreferences)
    this.preferences = defaultPreferences
    this.notifyListeners()
  }

  /**
   * Get specific preference value
   */
  async getPreference<K extends keyof UserPreferences>(key: K): Promise<UserPreferences[K]> {
    const preferences = await this.getPreferences()
    return preferences[key]
  }

  /**
   * Set specific preference value
   */
  async setPreference<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ): Promise<void> {
    await this.updatePreferences({ [key]: value } as Partial<UserPreferences>)
  }

  /**
   * Add change listener
   */
  addChangeListener(listener: (preferences: UserPreferences) => void): () => void {
    this.changeListeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener)
      if (index > -1) {
        this.changeListeners.splice(index, 1)
      }
    }
  }

  /**
   * Get theme-related preferences
   */
  async getThemePreferences(): Promise<{
    theme: UserPreferences['theme']
    colorScheme: UserPreferences['colorScheme']
    fontSize: UserPreferences['fontSize']
    enableAnimations: UserPreferences['enableAnimations']
  }> {
    const preferences = await this.getPreferences()
    return {
      theme: preferences.theme,
      colorScheme: preferences.colorScheme,
      fontSize: preferences.fontSize,
      enableAnimations: preferences.enableAnimations
    }
  }

  /**
   * Get conversion-related preferences
   */
  async getConversionPreferences(): Promise<{
    defaultCurrency: UserPreferences['defaultCurrency']
    defaultTimeZone: UserPreferences['defaultTimeZone']
    preferredUnits: UserPreferences['preferredUnits']
    decimalPlaces: UserPreferences['decimalPlaces']
    autoUpdateRates: UserPreferences['autoUpdateRates']
  }> {
    const preferences = await this.getPreferences()
    return {
      defaultCurrency: preferences.defaultCurrency,
      defaultTimeZone: preferences.defaultTimeZone,
      preferredUnits: preferences.preferredUnits,
      decimalPlaces: preferences.decimalPlaces,
      autoUpdateRates: preferences.autoUpdateRates
    }
  }

  /**
   * Export preferences for backup
   */
  async exportPreferences(): Promise<string> {
    const preferences = await this.getPreferences()
    return JSON.stringify({
      preferences,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2)
  }

  /**
   * Import preferences from backup
   */
  async importPreferences(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      if (!data.preferences || !data.version) {
        throw new Error('Invalid backup format')
      }

      // Validate imported preferences
      const validatedPreferences = this.validatePreferenceUpdates(data.preferences)
      
      // Merge with defaults to ensure all properties exist
      const importedPreferences = { ...DEFAULT_USER_PREFERENCES, ...validatedPreferences }
      
      await cacheManager.cacheUserPreferences(importedPreferences)
      this.preferences = importedPreferences
      this.notifyListeners()
    } catch (error) {
      throw new Error(`Failed to import preferences: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate preference updates
   */
  private validatePreferenceUpdates(updates: Partial<UserPreferences>): Partial<UserPreferences> {
    const validated: Partial<UserPreferences> = {}

    // Validate string fields
    if (updates.defaultCurrency && typeof updates.defaultCurrency === 'string') {
      validated.defaultCurrency = updates.defaultCurrency.toUpperCase()
    }

    if (updates.defaultTimeZone && typeof updates.defaultTimeZone === 'string') {
      validated.defaultTimeZone = updates.defaultTimeZone
    }

    if (updates.theme && ['light', 'dark', 'system'].includes(updates.theme)) {
      validated.theme = updates.theme
    }

    if (updates.colorScheme && ['warm', 'neutral'].includes(updates.colorScheme)) {
      validated.colorScheme = updates.colorScheme
    }

    if (updates.fontSize && ['small', 'medium', 'large'].includes(updates.fontSize)) {
      validated.fontSize = updates.fontSize
    }

    // Validate numeric fields
    if (typeof updates.decimalPlaces === 'number' && 
        updates.decimalPlaces >= 0 && 
        updates.decimalPlaces <= 15) {
      validated.decimalPlaces = Math.floor(updates.decimalPlaces)
    }

    // Validate boolean fields
    const booleanFields: Array<keyof UserPreferences> = [
      'autoUpdateRates', 
      'showCopyFeedback', 
      'enableAnimations'
    ]
    
    for (const field of booleanFields) {
      if (typeof updates[field] === 'boolean') {
        (validated as any)[field] = updates[field]
      }
    }

    // Validate preferredUnits object
    if (updates.preferredUnits && typeof updates.preferredUnits === 'object') {
      validated.preferredUnits = { ...updates.preferredUnits }
    }

    return validated
  }

  /**
   * Notify all change listeners
   */
  private notifyListeners(): void {
    const preferences = { ...this.preferences }
    this.changeListeners.forEach(listener => {
      try {
        listener(preferences)
      } catch (error) {
        console.warn('Error in preferences change listener:', error)
      }
    })
  }

  /**
   * Check if preferences are initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Wait for preferences to be initialized
   */
  async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return

    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.isInitialized) {
          resolve()
        } else {
          setTimeout(checkInitialized, 10)
        }
      }
      checkInitialized()
    })
  }
}

/**
 * Singleton instance of the preferences manager
 */
export const preferencesManager = new PreferencesManager()

/**
 * React hook for using preferences (to be used in components)
 */
export const usePreferences = () => {
  // This would be implemented as a React hook in a separate file
  // For now, we'll just export the manager
  return preferencesManager
}