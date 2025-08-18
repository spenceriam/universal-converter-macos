/**
 * Performance utilities for memoization and optimization
 */
import * as React from "react"

// Simple memoization cache with LRU eviction
class MemoCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private maxSize: number
  private ttl: number

  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: string, value: T): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, { value, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Memoization decorator for expensive functions
export function memoize<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  keyFn?: (...args: Args) => string,
  options?: { maxSize?: number; ttl?: number }
): (...args: Args) => Return {
  const cache = new MemoCache<Return>(options?.maxSize, options?.ttl)
  
  return (...args: Args): Return => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args)
    
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

// Debounce function for API calls
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttle function for high-frequency events
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// Performance measurement utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>()

  static startMeasurement(name: string): () => number {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, [])
      }
      
      const measurements = this.measurements.get(name)!
      measurements.push(duration)
      
      // Keep only last 100 measurements
      if (measurements.length > 100) {
        measurements.shift()
      }
      
      return duration
    }
  }

  static getAverageTime(name: string): number {
    const measurements = this.measurements.get(name)
    if (!measurements || measurements.length === 0) return 0
    
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length
  }

  static getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const metrics: Record<string, { average: number; count: number; latest: number }> = {}
    
    for (const [name, measurements] of this.measurements) {
      if (measurements.length > 0) {
        metrics[name] = {
          average: measurements.reduce((sum, time) => sum + time, 0) / measurements.length,
          count: measurements.length,
          latest: measurements[measurements.length - 1]
        }
      }
    }
    
    return metrics
  }

  static clearMetrics(): void {
    this.measurements.clear()
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(name: string) {
  const measurementRef = React.useRef<(() => number) | null>(null)
  
  const startMeasurement = React.useCallback(() => {
    measurementRef.current = PerformanceMonitor.startMeasurement(name)
  }, [name])
  
  const endMeasurement = React.useCallback(() => {
    if (measurementRef.current) {
      const duration = measurementRef.current()
      measurementRef.current = null
      return duration
    }
    return 0
  }, [])
  
  return { startMeasurement, endMeasurement }
}

export { MemoCache }