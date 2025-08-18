import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { LocalStorageManager, STORAGE_KEYS } from '../storageManager'
import { CacheEntry } from '../../types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

// Mock IndexedDB
const mockIDBRequest = {
  onsuccess: null as any,
  onerror: null as any,
  result: null as any
}

const mockIDBTransaction = {
  objectStore: vi.fn(() => ({
    get: vi.fn(() => mockIDBRequest),
    put: vi.fn(() => mockIDBRequest),
    delete: vi.fn(() => mockIDBRequest),
    clear: vi.fn(() => mockIDBRequest),
    createIndex: vi.fn(),
    index: vi.fn(() => ({
      openCursor: vi.fn(() => mockIDBRequest)
    }))
  }))
}

const mockIDBDatabase = {
  transaction: vi.fn(() => mockIDBTransaction),
  objectStoreNames: {
    contains: vi.fn(() => false)
  },
  createObjectStore: vi.fn(() => ({
    createIndex: vi.fn()
  }))
}

const mockIndexedDB = {
  open: vi.fn(() => ({
    onsuccess: null as any,
    onerror: null as any,
    onupgradeneeded: null as any,
    result: mockIDBDatabase
  }))
}

// Setup global mocks
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB
})

describe('LocalStorageManager', () => {
  let storageManager: LocalStorageManager

  beforeEach(() => {
    vi.clearAllMocks()
    storageManager = new LocalStorageManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = await storageManager.get('nonexistent')
      
      expect(result).toBeNull()
      expect(localStorageMock.getItem).toHaveBeenCalledWith('nonexistent')
    })

    it('should return cached data when valid', async () => {
      const testData = { message: 'test' }
      const cacheEntry: CacheEntry = {
        data: testData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000,
        version: '1.0'
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry))

      const result = await storageManager.get('test-key')
      
      expect(result).toEqual(testData)
    })

    it('should return null and remove expired data', async () => {
      const testData = { message: 'test' }
      const cacheEntry: CacheEntry = {
        data: testData,
        timestamp: Date.now() - 120000,
        expiresAt: Date.now() - 60000, // Expired
        version: '1.0'
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry))

      const result = await storageManager.get('expired-key')
      
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('expired-key')
    })

    it('should handle corrupted cache data', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')

      const result = await storageManager.get('corrupted-key')
      
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corrupted-key')
    })

    it('should handle invalid cache entry structure', async () => {
      const invalidEntry = { data: 'test' } // Missing required fields

      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidEntry))

      const result = await storageManager.get('invalid-structure')
      
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('invalid-structure')
    })
  })

  describe('set', () => {
    it('should store data with TTL', async () => {
      const testData = { message: 'test' }
      const ttl = 60000

      await storageManager.set('test-key', testData, ttl)

      expect(localStorageMock.setItem).toHaveBeenCalled()
      
      const setCall = localStorageMock.setItem.mock.calls[0]
      expect(setCall[0]).toBe('test-key')
      
      const storedEntry = JSON.parse(setCall[1])
      expect(storedEntry.data).toEqual(testData)
      expect(storedEntry.version).toBe('1.0')
      expect(storedEntry.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should use default TTL when not specified', async () => {
      const testData = { message: 'test' }

      await storageManager.set('test-key', testData)

      expect(localStorageMock.setItem).toHaveBeenCalled()
      
      const setCall = localStorageMock.setItem.mock.calls[0]
      const storedEntry = JSON.parse(setCall[1])
      expect(storedEntry.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should handle localStorage quota exceeded error', async () => {
      const testData = { message: 'test' }
      const quotaError = new DOMException('QuotaExceededError')
      Object.defineProperty(quotaError, 'code', { value: 22, writable: false })

      localStorageMock.setItem.mockImplementationOnce(() => {
        throw quotaError
      })

      // Mock successful retry after cleanup
      localStorageMock.setItem.mockImplementationOnce(() => {})

      await expect(storageManager.set('test-key', testData)).resolves.not.toThrow()
    })
  })

  describe('remove', () => {
    it('should remove item from localStorage', async () => {
      await storageManager.remove('test-key')

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key')
    })

    it('should handle removal errors gracefully', async () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      await expect(storageManager.remove('test-key')).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('should clear all data except preserved keys', async () => {
      const mockKeys = [
        'some-cache-key',
        'another-cache-key',
        STORAGE_KEYS.USER_PREFERENCES,
        STORAGE_KEYS.APP_VERSION
      ]

      localStorageMock.length = mockKeys.length
      localStorageMock.key.mockImplementation((index) => mockKeys[index] || null)
      
      await storageManager.clear()

      // Should remove non-preserved keys
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('some-cache-key')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('another-cache-key')
      
      // Should not remove preserved keys
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(STORAGE_KEYS.USER_PREFERENCES)
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(STORAGE_KEYS.APP_VERSION)
    })
  })

  describe('size', () => {
    it('should return cache size from metadata', async () => {
      const metadata = {
        totalSize: 1024,
        entryCount: 5,
        lastCleanup: Date.now(),
        version: '1.0'
      }

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.CACHE_METADATA) {
          return JSON.stringify(metadata)
        }
        return null
      })

      const size = await storageManager.size()
      
      expect(size).toBe(1024)
    })

    it('should return 0 when metadata is not available', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const size = await storageManager.size()
      
      expect(size).toBe(0)
    })
  })

  describe('cache validation', () => {
    it('should validate cache entry structure correctly', async () => {
      const validEntry: CacheEntry = {
        data: { test: 'data' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000,
        version: '1.0'
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(validEntry))

      const result = await storageManager.get('valid-entry')
      
      expect(result).toEqual({ test: 'data' })
    })

    it('should reject entries with missing fields', async () => {
      const invalidEntry = {
        data: { test: 'data' },
        timestamp: Date.now()
        // Missing expiresAt and version
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidEntry))

      const result = await storageManager.get('invalid-entry')
      
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('invalid-entry')
    })
  })

  describe('cleanup operations', () => {
    it('should clean up expired entries', async () => {
      const now = Date.now()
      const expiredEntry = {
        data: { test: 'expired' },
        timestamp: now - 120000,
        expiresAt: now - 60000,
        version: '1.0'
      }

      const validEntry = {
        data: { test: 'valid' },
        timestamp: now,
        expiresAt: now + 60000,
        version: '1.0'
      }

      localStorageMock.length = 2
      localStorageMock.key.mockImplementation((index) => 
        index === 0 ? 'expired-key' : 'valid-key'
      )
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'expired-key') return JSON.stringify(expiredEntry)
        if (key === 'valid-key') return JSON.stringify(validEntry)
        return null
      })

      // Trigger cleanup by trying to set when quota is exceeded
      const quotaError = new DOMException('QuotaExceededError')
      Object.defineProperty(quotaError, 'code', { value: 22, writable: false })

      localStorageMock.setItem.mockImplementationOnce(() => {
        throw quotaError
      })
      localStorageMock.setItem.mockImplementationOnce(() => {})

      await storageManager.set('new-key', { test: 'new' })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('expired-key')
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('valid-key')
    })
  })

  describe('error handling', () => {
    it('should handle localStorage access errors', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage access denied')
      })

      const result = await storageManager.get('test-key')
      
      expect(result).toBeNull()
    })

    it('should handle JSON parsing errors', async () => {
      localStorageMock.getItem.mockReturnValue('{"invalid": json}')

      const result = await storageManager.get('test-key')
      
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key')
    })

    it('should handle setItem errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      await expect(storageManager.set('test-key', { test: 'data' }))
        .rejects.toThrow('Storage quota exceeded and IndexedDB not available')
    })
  })
})