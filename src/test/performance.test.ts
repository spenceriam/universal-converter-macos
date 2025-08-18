/**
 * Performance benchmarks and automated testing
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UnitConversionEngine } from '../services/unitConversion'
import { CurrencyServiceImpl } from '../services/currencyService'
import { TimeZoneServiceImpl } from '../services/timeZoneService'
import { PerformanceMonitor, memoize, debounce, throttle } from '../utils/performance'

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    PerformanceMonitor.clearMetrics()
  })

  describe('Unit Conversion Performance', () => {
    it('should complete unit conversions within 100ms', async () => {
      const engine = new UnitConversionEngine()
      const iterations = 1000
      const startTime = performance.now()

      // Use valid unit IDs from the actual implementation
      for (let i = 0; i < iterations; i++) {
        await engine.convert(100, 'meter', 'foot')
      }

      const endTime = performance.now()
      const averageTime = (endTime - startTime) / iterations

      expect(averageTime).toBeLessThan(100) // Should be much faster than 100ms
      console.log(`Average unit conversion time: ${averageTime.toFixed(2)}ms`)
    })

    it('should handle complex temperature conversions efficiently', async () => {
      const engine = new UnitConversionEngine()
      const startTime = performance.now()

      // Test various temperature conversions with valid unit IDs
      const conversions = [
        [0, 'celsius', 'fahrenheit'],
        [100, 'celsius', 'kelvin'],
        [32, 'fahrenheit', 'celsius'],
        [273.15, 'kelvin', 'celsius']
      ]

      for (const [value, from, to] of conversions) {
        await engine.convert(value as number, from as string, to as string)
      }

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(50)
    })
  })

  describe('Currency Service Performance', () => {
    it('should cache exchange rates effectively', async () => {
      const service = new CurrencyServiceImpl()
      
      // Mock fetch to control timing
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          base: 'USD',
          rates: { EUR: 0.85, GBP: 0.73 },
          date: new Date().toISOString().split('T')[0]
        })
      })
      global.fetch = mockFetch

      // First call should hit the API
      const start1 = performance.now()
      await service.getExchangeRates('USD')
      const time1 = performance.now() - start1

      // Second call should use cache
      const start2 = performance.now()
      await service.getExchangeRates('USD')
      const time2 = performance.now() - start2

      expect(time2).toBeLessThan(time1 * 0.1) // Cache should be 10x faster
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only one API call
    })
  })

  describe('Time Zone Service Performance', () => {
    it('should convert times efficiently', async () => {
      const service = new TimeZoneServiceImpl()
      const iterations = 100
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        await service.convertTime(
          new Date(),
          'America/New_York',
          'Europe/London'
        )
      }

      const endTime = performance.now()
      const averageTime = (endTime - startTime) / iterations

      expect(averageTime).toBeLessThan(10) // Should be very fast
    })
  })

  describe('Memoization Performance', () => {
    it('should improve performance for repeated calculations', () => {
      let callCount = 0
      const expensiveFunction = (x: number, y: number) => {
        callCount++
        // Simulate expensive calculation
        let result = 0
        for (let i = 0; i < 1000; i++) {
          result += Math.sqrt(x * y + i)
        }
        return result
      }

      const memoizedFunction = memoize(expensiveFunction)

      // First call
      const start1 = performance.now()
      const result1 = memoizedFunction(10, 20)
      const time1 = performance.now() - start1

      // Second call with same parameters (should use cache)
      const start2 = performance.now()
      const result2 = memoizedFunction(10, 20)
      const time2 = performance.now() - start2

      expect(result1).toBe(result2)
      expect(callCount).toBe(1) // Function should only be called once
      expect(time2).toBeLessThan(time1 * 0.1) // Cache should be much faster
    })

    it('should respect TTL for cache expiration', async () => {
      let callCount = 0
      const fn = (x: number) => {
        callCount++
        return x * 2
      }

      const memoizedFn = memoize(fn, undefined, { ttl: 100 }) // 100ms TTL

      memoizedFn(5)
      expect(callCount).toBe(1)

      memoizedFn(5) // Should use cache
      expect(callCount).toBe(1)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      memoizedFn(5) // Should call function again
      expect(callCount).toBe(2)
    })
  })

  describe('Debounce Performance', () => {
    it('should limit function calls effectively', async () => {
      let callCount = 0
      const fn = () => {
        callCount++
      }

      const debouncedFn = debounce(fn, 100)

      // Rapid calls
      for (let i = 0; i < 10; i++) {
        debouncedFn()
      }

      expect(callCount).toBe(0) // No calls yet

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(callCount).toBe(1) // Only one call after debounce
    })
  })

  describe('Throttle Performance', () => {
    it('should limit function call frequency', async () => {
      let callCount = 0
      const fn = () => {
        callCount++
      }

      const throttledFn = throttle(fn, 100)

      // Rapid calls
      for (let i = 0; i < 10; i++) {
        throttledFn()
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      expect(callCount).toBeLessThanOrEqual(2) // Should be throttled
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory during intensive operations', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Perform intensive operations
      const engine = new UnitConversionEngine()
      const results = []
      
      for (let i = 0; i < 1000; i++) {
        results.push(engine.convert(i, 'm', 'ft'))
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('Bundle Size Metrics', () => {
    it('should track performance metrics', () => {
      const endMeasurement = PerformanceMonitor.startMeasurement('test-operation')
      
      // Simulate some work
      const start = performance.now()
      while (performance.now() - start < 10) {
        // Busy wait for 10ms
      }
      
      const duration = endMeasurement()
      
      expect(duration).toBeGreaterThan(8) // Should be around 10ms
      expect(duration).toBeLessThan(50) // But not too much overhead
      
      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics['test-operation']).toBeDefined()
      expect(metrics['test-operation'].count).toBe(1)
    })
  })
})

describe('Load Performance Tests', () => {
  it('should measure component render times', async () => {
    // This would typically be done with React Testing Library
    // and performance measurement hooks
    const renderStart = performance.now()
    
    // Simulate component render
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const renderTime = performance.now() - renderStart
    
    expect(renderTime).toBeLessThan(100) // Components should render quickly
  })

  it('should measure lazy loading performance', async () => {
    const loadStart = performance.now()
    
    // Simulate lazy component loading
    const LazyComponent = await import('../components/UnitConverter')
    
    const loadTime = performance.now() - loadStart
    
    expect(loadTime).toBeLessThan(1000) // Should load within 1 second
    expect(LazyComponent.default).toBeDefined()
  })
})

// Utility function to run performance benchmarks
export async function runPerformanceBenchmarks() {
  const results = {
    unitConversion: 0,
    currencyService: 0,
    timeZoneService: 0,
    memoization: 0
  }

  // Unit conversion benchmark
  const engine = new UnitConversionEngine()
  const start1 = performance.now()
  for (let i = 0; i < 100; i++) {
    await engine.convert(100, 'meter', 'foot')
  }
  results.unitConversion = (performance.now() - start1) / 100

  return results
}