import { describe, it, expect, beforeEach } from 'vitest'
import { UnitConversionEngine } from '../unitConversion'
import { ConversionResult } from '../../types'

describe('UnitConversionEngine', () => {
  let engine: UnitConversionEngine

  beforeEach(() => {
    engine = new UnitConversionEngine()
  })

  describe('Basic functionality', () => {
    it('should initialize with all categories', () => {
      const categories = engine.getCategories()
      expect(categories).toHaveLength(11)
      
      const categoryIds = categories.map(c => c.id)
      expect(categoryIds).toContain('length')
      expect(categoryIds).toContain('weight')
      expect(categoryIds).toContain('temperature')
      expect(categoryIds).toContain('volume')
      expect(categoryIds).toContain('area')
      expect(categoryIds).toContain('speed')
      expect(categoryIds).toContain('time')
      expect(categoryIds).toContain('digital_storage')
      expect(categoryIds).toContain('energy')
      expect(categoryIds).toContain('pressure')
      expect(categoryIds).toContain('angle')
    })

    it('should return units for valid category', () => {
      const lengthUnits = engine.getSupportedUnits('length')
      expect(lengthUnits.length).toBeGreaterThan(0)
      expect(lengthUnits.every(unit => unit.category === 'length')).toBe(true)
    })

    it('should return empty array for invalid category', () => {
      const units = engine.getSupportedUnits('invalid_category')
      expect(units).toEqual([])
    })

    it('should validate input correctly', () => {
      expect(engine.validateInput('123')).toBe(true)
      expect(engine.validateInput('123.456')).toBe(true)
      expect(engine.validateInput('-123.456')).toBe(true)
      expect(engine.validateInput('0')).toBe(true)
      expect(engine.validateInput('abc')).toBe(false)
      expect(engine.validateInput('')).toBe(false)
      expect(engine.validateInput('Infinity')).toBe(false)
      expect(engine.validateInput('NaN')).toBe(false)
    })
  })

  describe('Length conversions', () => {
    it('should convert meters to kilometers correctly', async () => {
      const result = await engine.convert(1000, 'meter', 'kilometer')
      expect(result.value).toBe(1)
      expect(result.unit.id).toBe('kilometer')
    })

    it('should convert inches to centimeters correctly', async () => {
      const result = await engine.convert(1, 'inch', 'centimeter')
      expect(result.value).toBeCloseTo(2.54, 10)
    })

    it('should convert feet to meters correctly', async () => {
      const result = await engine.convert(1, 'foot', 'meter')
      expect(result.value).toBeCloseTo(0.3048, 10)
    })

    it('should handle high precision conversions', async () => {
      const result = await engine.convert(1, 'meter', 'inch')
      expect(result.value).toBeCloseTo(39.3700787402, 10)
    })

    it('should convert light years to meters', async () => {
      const result = await engine.convert(1, 'light_year', 'meter')
      expect(result.value).toBeCloseTo(9.4607304725808e15, 5)
    })
  })

  describe('Weight conversions', () => {
    it('should convert kilograms to pounds correctly', async () => {
      const result = await engine.convert(1, 'kilogram', 'pound')
      expect(result.value).toBeCloseTo(2.20462262185, 9)
    })

    it('should convert grams to ounces correctly', async () => {
      const result = await engine.convert(100, 'gram', 'ounce')
      expect(result.value).toBeCloseTo(3.5273961949580412, 10)
    })

    it('should convert tonnes to kilograms correctly', async () => {
      const result = await engine.convert(1, 'tonne', 'kilogram')
      expect(result.value).toBe(1000)
    })

    it('should handle small units like micrograms', async () => {
      const result = await engine.convert(1000000, 'microgram', 'gram')
      expect(result.value).toBe(1)
    })
  })

  describe('Temperature conversions', () => {
    it('should convert Celsius to Fahrenheit correctly', async () => {
      const result = await engine.convert(0, 'celsius', 'fahrenheit')
      expect(result.value).toBe(32)
    })

    it('should convert Fahrenheit to Celsius correctly', async () => {
      const result = await engine.convert(32, 'fahrenheit', 'celsius')
      expect(result.value).toBe(0)
    })

    it('should convert Celsius to Kelvin correctly', async () => {
      const result = await engine.convert(0, 'celsius', 'kelvin')
      expect(result.value).toBe(273.15)
    })

    it('should convert Kelvin to Celsius correctly', async () => {
      const result = await engine.convert(273.15, 'kelvin', 'celsius')
      expect(result.value).toBe(0)
    })

    it('should convert Fahrenheit to Kelvin correctly', async () => {
      const result = await engine.convert(32, 'fahrenheit', 'kelvin')
      expect(result.value).toBe(273.15)
    })

    it('should convert Rankine to Celsius correctly', async () => {
      const result = await engine.convert(491.67, 'rankine', 'celsius')
      expect(result.value).toBe(0)
    })

    it('should handle negative temperatures', async () => {
      const result = await engine.convert(-40, 'celsius', 'fahrenheit')
      expect(result.value).toBe(-40)
    })
  })

  describe('Volume conversions', () => {
    it('should convert liters to milliliters correctly', async () => {
      const result = await engine.convert(1, 'liter', 'milliliter')
      expect(result.value).toBe(1000)
    })

    it('should convert gallons to liters correctly', async () => {
      const result = await engine.convert(1, 'gallon_us', 'liter')
      expect(result.value).toBeCloseTo(3.785411784, 10)
    })

    it('should convert cubic meters to liters correctly', async () => {
      const result = await engine.convert(1, 'cubic_meter', 'liter')
      expect(result.value).toBe(1000)
    })

    it('should handle cooking measurements', async () => {
      const result = await engine.convert(1, 'cup_us', 'milliliter')
      expect(result.value).toBeCloseTo(236.5882365, 7)
    })
  })

  describe('Area conversions', () => {
    it('should convert square meters to square feet correctly', async () => {
      const result = await engine.convert(1, 'square_meter', 'square_foot')
      expect(result.value).toBeCloseTo(10.7639104167, 10)
    })

    it('should convert acres to square meters correctly', async () => {
      const result = await engine.convert(1, 'acre', 'square_meter')
      expect(result.value).toBeCloseTo(4046.8564224, 10)
    })

    it('should convert hectares to acres correctly', async () => {
      const result = await engine.convert(1, 'hectare', 'acre')
      expect(result.value).toBeCloseTo(2.4710538146717, 10)
    })
  })

  describe('Speed conversions', () => {
    it('should convert km/h to m/s correctly', async () => {
      const result = await engine.convert(36, 'kilometer_per_hour', 'meter_per_second')
      expect(result.value).toBeCloseTo(10, 9)
    })

    it('should convert mph to km/h correctly', async () => {
      const result = await engine.convert(60, 'mile_per_hour', 'kilometer_per_hour')
      expect(result.value).toBeCloseTo(96.56064, 5)
    })

    it('should convert knots to m/s correctly', async () => {
      const result = await engine.convert(1, 'knot', 'meter_per_second')
      expect(result.value).toBeCloseTo(0.514444444, 9)
    })
  })

  describe('Time conversions', () => {
    it('should convert hours to seconds correctly', async () => {
      const result = await engine.convert(1, 'hour', 'second')
      expect(result.value).toBe(3600)
    })

    it('should convert days to hours correctly', async () => {
      const result = await engine.convert(1, 'day', 'hour')
      expect(result.value).toBe(24)
    })

    it('should convert years to days correctly', async () => {
      const result = await engine.convert(1, 'year', 'day')
      expect(result.value).toBeCloseTo(365.2425, 4)
    })

    it('should handle small time units', async () => {
      const result = await engine.convert(1000, 'millisecond', 'second')
      expect(result.value).toBe(1)
    })
  })

  describe('Digital Storage conversions', () => {
    it('should convert bytes to bits correctly', async () => {
      const result = await engine.convert(1, 'byte', 'bit')
      expect(result.value).toBe(8)
    })

    it('should convert KB to bytes correctly', async () => {
      const result = await engine.convert(1, 'kilobyte', 'byte')
      expect(result.value).toBe(1000)
    })

    it('should convert KiB to bytes correctly', async () => {
      const result = await engine.convert(1, 'kibibyte', 'byte')
      expect(result.value).toBe(1024)
    })

    it('should convert GB to MB correctly', async () => {
      const result = await engine.convert(1, 'gigabyte', 'megabyte')
      expect(result.value).toBe(1000)
    })

    it('should convert GiB to MiB correctly', async () => {
      const result = await engine.convert(1, 'gibibyte', 'mebibyte')
      expect(result.value).toBe(1024)
    })
  })

  describe('Energy conversions', () => {
    it('should convert kJ to J correctly', async () => {
      const result = await engine.convert(1, 'kilojoule', 'joule')
      expect(result.value).toBe(1000)
    })

    it('should convert calories to joules correctly', async () => {
      const result = await engine.convert(1, 'calorie', 'joule')
      expect(result.value).toBeCloseTo(4.184, 10)
    })

    it('should convert kWh to joules correctly', async () => {
      const result = await engine.convert(1, 'kilowatt_hour', 'joule')
      expect(result.value).toBe(3600000)
    })

    it('should convert BTU to joules correctly', async () => {
      const result = await engine.convert(1, 'btu', 'joule')
      expect(result.value).toBeCloseTo(1055.05585262, 8)
    })
  })

  describe('Pressure conversions', () => {
    it('should convert bar to pascal correctly', async () => {
      const result = await engine.convert(1, 'bar', 'pascal')
      expect(result.value).toBe(100000)
    })

    it('should convert atm to pascal correctly', async () => {
      const result = await engine.convert(1, 'atmosphere', 'pascal')
      expect(result.value).toBe(101325)
    })

    it('should convert psi to pascal correctly', async () => {
      const result = await engine.convert(1, 'psi', 'pascal')
      expect(result.value).toBeCloseTo(6894.75729316836, 8)
    })

    it('should convert mmHg to pascal correctly', async () => {
      const result = await engine.convert(1, 'mmhg', 'pascal')
      expect(result.value).toBeCloseTo(133.322387415, 9)
    })
  })

  describe('Angle conversions', () => {
    it('should convert degrees to radians correctly', async () => {
      const result = await engine.convert(180, 'degree', 'radian')
      expect(result.value).toBeCloseTo(Math.PI, 10)
    })

    it('should convert radians to degrees correctly', async () => {
      const result = await engine.convert(Math.PI, 'radian', 'degree')
      expect(result.value).toBeCloseTo(180, 10)
    })

    it('should convert turns to degrees correctly', async () => {
      const result = await engine.convert(1, 'turn', 'degree')
      expect(result.value).toBe(360)
    })

    it('should convert gradians to degrees correctly', async () => {
      const result = await engine.convert(100, 'gradian', 'degree')
      expect(result.value).toBe(90)
    })
  })

  describe('Error handling', () => {
    it('should throw error for invalid units', async () => {
      await expect(engine.convert(1, 'invalid_unit', 'meter')).rejects.toThrow('Invalid unit specified')
    })

    it('should throw error for cross-category conversion', async () => {
      await expect(engine.convert(1, 'meter', 'kilogram')).rejects.toThrow('Cannot convert between different unit categories')
    })

    it('should throw error for invalid input', async () => {
      await expect(engine.convert(NaN, 'meter', 'kilometer')).rejects.toThrow('Invalid input value')
    })
  })

  describe('Result formatting', () => {
    it('should format results correctly', async () => {
      const result = await engine.convert(1, 'meter', 'centimeter')
      expect(result.formattedValue).toBe('100')
      expect(result.precision).toBe(0)
    })

    it('should handle decimal results', async () => {
      const result = await engine.convert(1, 'inch', 'centimeter')
      expect(result.formattedValue).toBe('2.54')
      expect(result.precision).toBe(2)
    })

    it('should include timestamp', async () => {
      const before = Date.now()
      const result = await engine.convert(1, 'meter', 'kilometer')
      const after = Date.now()
      
      expect(result.timestamp).toBeGreaterThanOrEqual(before)
      expect(result.timestamp).toBeLessThanOrEqual(after)
    })

    it('should round to 10 decimal places maximum', async () => {
      const result = await engine.convert(1, 'meter', 'inch')
      const decimalPlaces = (result.value.toString().split('.')[1] || '').length
      expect(decimalPlaces).toBeLessThanOrEqual(10)
    })
  })

  describe('Precision and accuracy', () => {
    it('should maintain high precision for small conversions', async () => {
      const result = await engine.convert(0.000001, 'meter', 'micrometer')
      expect(result.value).toBe(1)
    })

    it('should handle very large numbers', async () => {
      const result = await engine.convert(1, 'light_year', 'kilometer')
      expect(result.value).toBeCloseTo(9.4607304725808e12, 5)
    })

    it('should be reversible for all conversions', async () => {
      const original = 123.456789
      const forward = await engine.convert(original, 'meter', 'foot')
      const backward = await engine.convert(forward.value, 'foot', 'meter')
      expect(backward.value).toBeCloseTo(original, 8)
    })

    it('should handle zero values', async () => {
      const result = await engine.convert(0, 'celsius', 'fahrenheit')
      expect(result.value).toBe(32)
    })

    it('should handle negative values', async () => {
      const result = await engine.convert(-10, 'celsius', 'fahrenheit')
      expect(result.value).toBe(14)
    })
  })
})