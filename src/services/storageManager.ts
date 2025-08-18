import { StorageManager, CacheEntry, CacheConfig, ErrorType } from '../types'

/**
 * Storage configuration with sensible defaults
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 100, // 100 entries
  compressionEnabled: false
}

/**
 * Storage keys used throughout the application
 */
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'universal_converter_preferences',
  EXCHANGE_RATES: 'currency_exchange_rates',
  TIMEZONE_DATA: 'timezone_data',
  UNIT_PREFERENCES: 'unit_preferences',
  CACHE_METADATA: 'cache_metadata',
  APP_VERSION: 'app_version'
} as const

/**
 * Cache metadata for tracking storage usage and cleanup
 */
interface CacheMetadata {
  totalSize: number
  entryCount: number
  lastCleanup: number
  version: string
}

/**
 * LocalStorageManager - Primary storage implementation using localStorage
 * with automatic fallback to IndexedDB for larger datasets
 */
export class LocalStorageManager implements StorageManager {
  private readonly config: CacheConfig
  private readonly dbName = 'UniversalConverterDB'
  private readonly dbVersion = 1
  private readonly storeName = 'cache'
  private db: IDBDatabase | null = null
  private isIndexedDBAvailable = false

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.initializeIndexedDB()
    this.scheduleCleanup()
  }

  /**
   * Get a value from storage with automatic fallback
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try localStorage first
      const localValue = await this.getFromLocalStorage<T>(key)
      if (localValue !== null) {
        return localValue
      }

      // Fallback to IndexedDB if available
      if (this.isIndexedDBAvailable) {
        return await this.getFromIndexedDB<T>(key)
      }

      return null
    } catch (error) {
      console.warn(`Failed to get value for key "${key}":`, error)
      return null
    }
  }

  /**
   * Set a value in storage with TTL support
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl : Date.now() + this.config.maxAge
    const cacheEntry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      expiresAt,
      version: '1.0'
    }

    try {
      // Try localStorage first
      await this.setToLocalStorage(key, cacheEntry)
    } catch (error) {
      // If localStorage fails (quota exceeded), try IndexedDB
      if (this.isIndexedDBAvailable) {
        await this.setToIndexedDB(key, cacheEntry)
      } else {
        throw new Error(`Storage quota exceeded and IndexedDB not available: ${error}`)
      }
    }

    // Update cache metadata
    await this.updateCacheMetadata()
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    try {
      // Remove from localStorage
      localStorage.removeItem(key)

      // Remove from IndexedDB if available
      if (this.isIndexedDBAvailable) {
        await this.removeFromIndexedDB(key)
      }

      await this.updateCacheMetadata()
    } catch (error) {
      console.warn(`Failed to remove key "${key}":`, error)
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    try {
      // Clear localStorage (keep user preferences)
      const keysToKeep = [STORAGE_KEYS.USER_PREFERENCES, STORAGE_KEYS.APP_VERSION]
      const keysToRemove: string[] = []
      
      // Collect keys to remove
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && !keysToKeep.includes(key as any)) {
          keysToRemove.push(key)
        }
      }
      
      // Remove collected keys
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // Clear IndexedDB if available
      if (this.isIndexedDBAvailable) {
        await this.clearIndexedDB()
      }

      await this.updateCacheMetadata()
    } catch (error) {
      console.warn('Failed to clear storage:', error)
    }
  }

  /**
   * Get current storage size (approximate)
   */
  async size(): Promise<number> {
    try {
      const metadata = await this.getCacheMetadata()
      return metadata?.totalSize || 0
    } catch {
      return 0
    }
  }

  /**
   * Get value from localStorage with validation
   */
  private async getFromLocalStorage<T>(key: string): Promise<T | null> {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const cacheEntry: CacheEntry<T> = JSON.parse(cached)
      
      // Validate cache entry structure
      if (!this.isValidCacheEntry(cacheEntry)) {
        localStorage.removeItem(key)
        return null
      }

      // Check if expired
      if (Date.now() > cacheEntry.expiresAt) {
        localStorage.removeItem(key)
        return null
      }

      return cacheEntry.data
    } catch (error) {
      console.warn(`Failed to parse cached data for key "${key}":`, error)
      localStorage.removeItem(key) // Remove corrupted data
      return null
    }
  }

  /**
   * Set value to localStorage with size checking
   */
  private async setToLocalStorage<T>(key: string, cacheEntry: CacheEntry<T>): Promise<void> {
    const serialized = JSON.stringify(cacheEntry)
    
    // Check if the data is too large for localStorage (approximate 5MB limit)
    if (serialized.length > 5 * 1024 * 1024) {
      throw new Error('Data too large for localStorage')
    }

    try {
      localStorage.setItem(key, serialized)
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof DOMException && error.code === 22) {
        // Try to free up space by cleaning expired entries
        await this.cleanupExpiredEntries()
        
        // Try again
        localStorage.setItem(key, serialized)
      } else {
        throw error
      }
    }
  }

  /**
   * Initialize IndexedDB for fallback storage
   */
  private async initializeIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported')
      return
    }

    try {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => {
        console.warn('Failed to open IndexedDB')
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        this.isIndexedDBAvailable = true
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
        }
      }
    } catch (error) {
      console.warn('Failed to initialize IndexedDB:', error)
    }
  }

  /**
   * Get value from IndexedDB
   */
  private async getFromIndexedDB<T>(key: string): Promise<T | null> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          resolve(null)
          return
        }

        const cacheEntry: CacheEntry<T> = result.value
        
        // Check if expired
        if (Date.now() > cacheEntry.expiresAt) {
          this.removeFromIndexedDB(key)
          resolve(null)
          return
        }

        resolve(cacheEntry.data)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Set value to IndexedDB
   */
  private async setToIndexedDB<T>(key: string, cacheEntry: CacheEntry<T>): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not available')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put({ key, value: cacheEntry })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove value from IndexedDB
   */
  private async removeFromIndexedDB(key: string): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all data from IndexedDB
   */
  private async clearIndexedDB(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Validate cache entry structure
   */
  private isValidCacheEntry(entry: any): entry is CacheEntry {
    return (
      entry &&
      typeof entry === 'object' &&
      'data' in entry &&
      'timestamp' in entry &&
      'expiresAt' in entry &&
      'version' in entry &&
      typeof entry.timestamp === 'number' &&
      typeof entry.expiresAt === 'number'
    )
  }

  /**
   * Clean up expired entries from localStorage
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now()
    const keysToRemove: string[] = []

    // Check all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      try {
        const cached = localStorage.getItem(key)
        if (!cached) continue

        const cacheEntry = JSON.parse(cached)
        if (this.isValidCacheEntry(cacheEntry) && now > cacheEntry.expiresAt) {
          keysToRemove.push(key)
        }
      } catch {
        // Remove corrupted entries
        keysToRemove.push(key)
      }
    }

    // Remove expired entries
    keysToRemove.forEach(key => localStorage.removeItem(key))

    // Clean up IndexedDB expired entries
    if (this.isIndexedDBAvailable) {
      await this.cleanupIndexedDBExpired()
    }
  }

  /**
   * Clean up expired entries from IndexedDB
   */
  private async cleanupIndexedDBExpired(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('expiresAt')
      const range = IDBKeyRange.upperBound(Date.now())
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get cache metadata
   */
  private async getCacheMetadata(): Promise<CacheMetadata | null> {
    try {
      const metadata = localStorage.getItem(STORAGE_KEYS.CACHE_METADATA)
      return metadata ? JSON.parse(metadata) : null
    } catch {
      return null
    }
  }

  /**
   * Update cache metadata
   */
  private async updateCacheMetadata(): Promise<void> {
    try {
      let totalSize = 0
      let entryCount = 0

      // Calculate localStorage usage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key)
          if (value) {
            totalSize += value.length
            entryCount++
          }
        }
      }

      const metadata: CacheMetadata = {
        totalSize,
        entryCount,
        lastCleanup: Date.now(),
        version: '1.0'
      }

      localStorage.setItem(STORAGE_KEYS.CACHE_METADATA, JSON.stringify(metadata))
    } catch (error) {
      console.warn('Failed to update cache metadata:', error)
    }
  }

  /**
   * Schedule periodic cleanup
   */
  private scheduleCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredEntries()
    }, 60 * 60 * 1000)

    // Run initial cleanup after 5 seconds
    setTimeout(() => {
      this.cleanupExpiredEntries()
    }, 5000)
  }
}

/**
 * Singleton instance of the storage manager
 */
export const storageManager = new LocalStorageManager()