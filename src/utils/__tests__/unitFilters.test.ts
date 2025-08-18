import { describe, it, expect } from 'vitest'
import {
  filterUnits,
  filterCategories,
  getUnitsByCategory,
  findUnitById,
  getPopularUnits,
  sortUnitsByName,
  sortUnitsBySymbol,
  getConversionFactor,
  canConvert,
  getUnitDisplayText,
  getCategoryDisplayText
} from '../unitFilters'
import { Unit, UnitCategory } from '../../types'

describe('Unit Filter Utilities', () => {
  const mockUnits: Unit[] = [
    { id: 'meter', name: 'Meter', symbol: 'm', category: 'length', baseMultiplier: 1 },
    { id: 'kilometer', name: 'Kilometer', symbol: 'km', category: 'length', baseMultiplier: 1000 },
    { id: 'inch', name: 'Inch', symbol: 'in', category: 'length', baseMultiplier: 0.0254 },
    { id: 'kilogram', name: 'Kilogram', symbol: 'kg', category: 'weight', baseMultiplier: 1 },
    { id: 'pound', name: 'Pound', symbol: 'lb', category: 'weight', baseMultiplier: 0.45359237 }
  ]

  const mockCategories: UnitCategory[] = [
    {
      id: 'length',
      name: 'Length',
      baseUnit: 'meter',
      description: 'Distance measurements',
      units: mockUnits.filter(u => u.category === 'length')
    },
    {
      id: 'weight',
      name: 'Weight',
      baseUnit: 'kilogram',
      description: 'Mass measurements',
      units: mockUnits.filter(u => u.category === 'weight')
    }
  ]

  describe('filterUnits', () => {
    it('should return all units when search term is empty', () => {
      const result = filterUnits(mockUnits, '')
      expect(result).toEqual(mockUnits)
    })

    it('should filter units by name', () => {
      const result = filterUnits(mockUnits, 'meter')
      expect(result).toHaveLength(2)
      expect(result.map(u => u.id)).toContain('meter')
      expect(result.map(u => u.id)).toContain('kilometer')
    })

    it('should filter units by symbol', () => {
      const result = filterUnits(mockUnits, 'kg')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('kilogram')
    })

    it('should filter units by id', () => {
      const result = filterUnits(mockUnits, 'inch')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('inch')
    })

    it('should be case insensitive', () => {
      const result = filterUnits(mockUnits, 'METER')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('filterCategories', () => {
    it('should return all categories when search term is empty', () => {
      const result = filterCategories(mockCategories, '')
      expect(result).toEqual(mockCategories)
    })

    it('should filter categories by name', () => {
      const result = filterCategories(mockCategories, 'length')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('length')
    })

    it('should filter categories by description', () => {
      const result = filterCategories(mockCategories, 'distance')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('length')
    })
  })

  describe('getUnitsByCategory', () => {
    it('should return units for valid category', () => {
      const result = getUnitsByCategory(mockCategories, 'length')
      expect(result).toHaveLength(3)
      expect(result.every(u => u.category === 'length')).toBe(true)
    })

    it('should return empty array for invalid category', () => {
      const result = getUnitsByCategory(mockCategories, 'invalid')
      expect(result).toEqual([])
    })
  })

  describe('findUnitById', () => {
    it('should find unit by id', () => {
      const result = findUnitById(mockCategories, 'meter')
      expect(result).toBeTruthy()
      expect(result?.id).toBe('meter')
    })

    it('should return null for invalid id', () => {
      const result = findUnitById(mockCategories, 'invalid')
      expect(result).toBeNull()
    })
  })

  describe('getPopularUnits', () => {
    it('should prioritize popular units for length category', () => {
      const lengthUnits = mockUnits.filter(u => u.category === 'length')
      const result = getPopularUnits(lengthUnits, 'length')
      
      expect(result[0].id).toBe('meter')
      expect(result[1].id).toBe('kilometer')
    })

    it('should include all units', () => {
      const lengthUnits = mockUnits.filter(u => u.category === 'length')
      const result = getPopularUnits(lengthUnits, 'length')
      
      expect(result).toHaveLength(lengthUnits.length)
    })
  })

  describe('sortUnitsByName', () => {
    it('should sort units alphabetically by name', () => {
      const result = sortUnitsByName(mockUnits)
      expect(result[0].name).toBe('Inch')
      expect(result[1].name).toBe('Kilogram')
      expect(result[2].name).toBe('Kilometer')
    })

    it('should not mutate original array', () => {
      const original = [...mockUnits]
      sortUnitsByName(mockUnits)
      expect(mockUnits).toEqual(original)
    })
  })

  describe('sortUnitsBySymbol', () => {
    it('should sort units alphabetically by symbol', () => {
      const result = sortUnitsBySymbol(mockUnits)
      expect(result[0].symbol).toBe('in')
      expect(result[1].symbol).toBe('kg')
      expect(result[2].symbol).toBe('km')
    })
  })

  describe('getConversionFactor', () => {
    it('should calculate conversion factor between same category units', () => {
      const meter = mockUnits.find(u => u.id === 'meter')!
      const kilometer = mockUnits.find(u => u.id === 'kilometer')!
      
      const factor = getConversionFactor(kilometer, meter)
      expect(factor).toBe(1000)
    })

    it('should throw error for different categories', () => {
      const meter = mockUnits.find(u => u.id === 'meter')!
      const kilogram = mockUnits.find(u => u.id === 'kilogram')!
      
      expect(() => getConversionFactor(meter, kilogram)).toThrow()
    })

    it('should return 1 for temperature units', () => {
      const celsius: Unit = { id: 'celsius', name: 'Celsius', symbol: '°C', category: 'temperature', baseMultiplier: 1 }
      const fahrenheit: Unit = { id: 'fahrenheit', name: 'Fahrenheit', symbol: '°F', category: 'temperature', baseMultiplier: 1 }
      
      const factor = getConversionFactor(celsius, fahrenheit)
      expect(factor).toBe(1)
    })
  })

  describe('canConvert', () => {
    it('should return true for same category units', () => {
      const meter = mockUnits.find(u => u.id === 'meter')!
      const kilometer = mockUnits.find(u => u.id === 'kilometer')!
      
      expect(canConvert(meter, kilometer)).toBe(true)
    })

    it('should return false for different category units', () => {
      const meter = mockUnits.find(u => u.id === 'meter')!
      const kilogram = mockUnits.find(u => u.id === 'kilogram')!
      
      expect(canConvert(meter, kilogram)).toBe(false)
    })
  })

  describe('getUnitDisplayText', () => {
    it('should format unit display text correctly', () => {
      const meter = mockUnits.find(u => u.id === 'meter')!
      const result = getUnitDisplayText(meter)
      expect(result).toBe('Meter (m)')
    })
  })

  describe('getCategoryDisplayText', () => {
    it('should format category display text with unit count', () => {
      const lengthCategory = mockCategories.find(c => c.id === 'length')!
      const result = getCategoryDisplayText(lengthCategory)
      expect(result).toBe('Length (3 units)')
    })
  })
})