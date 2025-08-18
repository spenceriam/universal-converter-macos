import { Unit, UnitCategory, ConversionResult, ConversionService } from '../types'
import { memoize, PerformanceMonitor } from '../utils/performance'

/**
 * Comprehensive unit conversion engine with high precision calculations
 * Supports 11 categories with accurate conversion factors
 */
export class UnitConversionEngine implements ConversionService {
  private categories: Map<string, UnitCategory> = new Map()
  private units: Map<string, Unit> = new Map()

  constructor() {
    this.initializeUnits()
  }

  /**
   * Convert a value from one unit to another with high precision
   * Memoized for performance optimization
   */
  async convert(value: number, fromUnitId: string, toUnitId: string): Promise<ConversionResult> {
    const endMeasurement = PerformanceMonitor.startMeasurement('unit-conversion')
    
    try {
      return this.memoizedConvert(value, fromUnitId, toUnitId)
    } finally {
      endMeasurement()
    }
  }

  private memoizedConvert = memoize(
    (value: number, fromUnitId: string, toUnitId: string): ConversionResult => {
    if (!this.validateInput(value.toString())) {
      throw new Error('Invalid input value')
    }

    const fromUnit = this.units.get(fromUnitId)
    const toUnit = this.units.get(toUnitId)

    if (!fromUnit || !toUnit) {
      throw new Error('Invalid unit specified')
    }

    if (fromUnit.category !== toUnit.category) {
      throw new Error('Cannot convert between different unit categories')
    }

    let result: number

    // Special handling for temperature conversions
    if (fromUnit.category === 'temperature') {
      result = this.convertTemperature(value, fromUnit, toUnit)
    } else {
      // Standard linear conversion through base unit
      const baseValue = value * fromUnit.baseMultiplier
      result = baseValue / toUnit.baseMultiplier
    }

    // Round to 10 decimal places for precision
    result = Math.round(result * 1e10) / 1e10

    return {
      value: result,
      formattedValue: this.formatResult(result),
      unit: toUnit,
      precision: this.calculatePrecision(result),
      timestamp: Date.now()
    }
  },
  (value: number, fromUnitId: string, toUnitId: string) => `${value}-${fromUnitId}-${toUnitId}`,
  { maxSize: 1000, ttl: 10 * 60 * 1000 } // 10 minutes cache
  )

  /**
   * Get all supported units for a category
   */
  getSupportedUnits(categoryId: string): Unit[] {
    const category = this.categories.get(categoryId)
    return category ? category.units : []
  }

  /**
   * Get all available categories
   */
  getCategories(): UnitCategory[] {
    return Array.from(this.categories.values())
  }

  /**
   * Validate input value
   */
  validateInput(value: string): boolean {
    const num = parseFloat(value)
    return !isNaN(num) && isFinite(num)
  }

  /**
   * Special temperature conversion handling (non-linear)
   */
  private convertTemperature(value: number, fromUnit: Unit, toUnit: Unit): number {
    // Convert to Celsius first (base unit)
    let celsius: number

    switch (fromUnit.id) {
      case 'celsius':
        celsius = value
        break
      case 'fahrenheit':
        celsius = (value - 32) * 5 / 9
        break
      case 'kelvin':
        celsius = value - 273.15
        break
      case 'rankine':
        celsius = (value - 491.67) * 5 / 9
        break
      default:
        throw new Error(`Unsupported temperature unit: ${fromUnit.id}`)
    }

    // Convert from Celsius to target unit
    switch (toUnit.id) {
      case 'celsius':
        return celsius
      case 'fahrenheit':
        return celsius * 9 / 5 + 32
      case 'kelvin':
        return celsius + 273.15
      case 'rankine':
        return (celsius + 273.15) * 9 / 5
      default:
        throw new Error(`Unsupported temperature unit: ${toUnit.id}`)
    }
  }

  /**
   * Format result with appropriate precision
   */
  private formatResult(value: number): string {
    // Remove trailing zeros and unnecessary decimal points
    return parseFloat(value.toFixed(10)).toString()
  }

  /**
   * Calculate precision level of result
   */
  private calculatePrecision(value: number): number {
    const str = value.toString()
    const decimalIndex = str.indexOf('.')
    return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1
  }

  /**
   * Initialize all unit definitions with precise conversion factors
   */
  private initializeUnits(): void {
    const categories = this.createUnitDefinitions()
    
    categories.forEach(category => {
      this.categories.set(category.id, category)
      category.units.forEach(unit => {
        this.units.set(unit.id, unit)
      })
    })
  }

  /**
   * Create comprehensive unit definitions for all categories
   */
  private createUnitDefinitions(): UnitCategory[] {
    return [
      // Length units (base: meter)
      {
        id: 'length',
        name: 'Length',
        baseUnit: 'meter',
        description: 'Distance and length measurements',
        units: [
          { id: 'meter', name: 'Meter', symbol: 'm', category: 'length', baseMultiplier: 1 },
          { id: 'kilometer', name: 'Kilometer', symbol: 'km', category: 'length', baseMultiplier: 1000 },
          { id: 'centimeter', name: 'Centimeter', symbol: 'cm', category: 'length', baseMultiplier: 0.01 },
          { id: 'millimeter', name: 'Millimeter', symbol: 'mm', category: 'length', baseMultiplier: 0.001 },
          { id: 'micrometer', name: 'Micrometer', symbol: 'μm', category: 'length', baseMultiplier: 0.000001 },
          { id: 'nanometer', name: 'Nanometer', symbol: 'nm', category: 'length', baseMultiplier: 0.000000001 },
          { id: 'inch', name: 'Inch', symbol: 'in', category: 'length', baseMultiplier: 0.0254 },
          { id: 'foot', name: 'Foot', symbol: 'ft', category: 'length', baseMultiplier: 0.3048 },
          { id: 'yard', name: 'Yard', symbol: 'yd', category: 'length', baseMultiplier: 0.9144 },
          { id: 'mile', name: 'Mile', symbol: 'mi', category: 'length', baseMultiplier: 1609.344 },
          { id: 'nautical_mile', name: 'Nautical Mile', symbol: 'nmi', category: 'length', baseMultiplier: 1852 },
          { id: 'light_year', name: 'Light Year', symbol: 'ly', category: 'length', baseMultiplier: 9.4607304725808e15 }
        ]
      },

      // Weight/Mass units (base: kilogram)
      {
        id: 'weight',
        name: 'Weight & Mass',
        baseUnit: 'kilogram',
        description: 'Mass and weight measurements',
        units: [
          { id: 'kilogram', name: 'Kilogram', symbol: 'kg', category: 'weight', baseMultiplier: 1 },
          { id: 'gram', name: 'Gram', symbol: 'g', category: 'weight', baseMultiplier: 0.001 },
          { id: 'milligram', name: 'Milligram', symbol: 'mg', category: 'weight', baseMultiplier: 0.000001 },
          { id: 'microgram', name: 'Microgram', symbol: 'μg', category: 'weight', baseMultiplier: 0.000000001 },
          { id: 'tonne', name: 'Tonne', symbol: 't', category: 'weight', baseMultiplier: 1000 },
          { id: 'pound', name: 'Pound', symbol: 'lb', category: 'weight', baseMultiplier: 0.45359237 },
          { id: 'ounce', name: 'Ounce', symbol: 'oz', category: 'weight', baseMultiplier: 0.028349523125 },
          { id: 'stone', name: 'Stone', symbol: 'st', category: 'weight', baseMultiplier: 6.35029318 },
          { id: 'short_ton', name: 'Short Ton (US)', symbol: 'ton', category: 'weight', baseMultiplier: 907.18474 },
          { id: 'long_ton', name: 'Long Ton (UK)', symbol: 'long ton', category: 'weight', baseMultiplier: 1016.0469088 },
          { id: 'carat', name: 'Carat', symbol: 'ct', category: 'weight', baseMultiplier: 0.0002 }
        ]
      },

      // Temperature units (special conversion - non-linear)
      {
        id: 'temperature',
        name: 'Temperature',
        baseUnit: 'celsius',
        description: 'Temperature measurements',
        units: [
          { id: 'celsius', name: 'Celsius', symbol: '°C', category: 'temperature', baseMultiplier: 1 },
          { id: 'fahrenheit', name: 'Fahrenheit', symbol: '°F', category: 'temperature', baseMultiplier: 1 },
          { id: 'kelvin', name: 'Kelvin', symbol: 'K', category: 'temperature', baseMultiplier: 1 },
          { id: 'rankine', name: 'Rankine', symbol: '°R', category: 'temperature', baseMultiplier: 1 }
        ]
      },

      // Volume units (base: liter)
      {
        id: 'volume',
        name: 'Volume',
        baseUnit: 'liter',
        description: 'Volume and capacity measurements',
        units: [
          { id: 'liter', name: 'Liter', symbol: 'L', category: 'volume', baseMultiplier: 1 },
          { id: 'milliliter', name: 'Milliliter', symbol: 'mL', category: 'volume', baseMultiplier: 0.001 },
          { id: 'cubic_meter', name: 'Cubic Meter', symbol: 'm³', category: 'volume', baseMultiplier: 1000 },
          { id: 'cubic_centimeter', name: 'Cubic Centimeter', symbol: 'cm³', category: 'volume', baseMultiplier: 0.001 },
          { id: 'cubic_inch', name: 'Cubic Inch', symbol: 'in³', category: 'volume', baseMultiplier: 0.016387064 },
          { id: 'cubic_foot', name: 'Cubic Foot', symbol: 'ft³', category: 'volume', baseMultiplier: 28.316846592 },
          { id: 'gallon_us', name: 'Gallon (US)', symbol: 'gal', category: 'volume', baseMultiplier: 3.785411784 },
          { id: 'gallon_uk', name: 'Gallon (UK)', symbol: 'gal (UK)', category: 'volume', baseMultiplier: 4.54609 },
          { id: 'quart_us', name: 'Quart (US)', symbol: 'qt', category: 'volume', baseMultiplier: 0.946352946 },
          { id: 'pint_us', name: 'Pint (US)', symbol: 'pt', category: 'volume', baseMultiplier: 0.473176473 },
          { id: 'cup_us', name: 'Cup (US)', symbol: 'cup', category: 'volume', baseMultiplier: 0.2365882365 },
          { id: 'fluid_ounce_us', name: 'Fluid Ounce (US)', symbol: 'fl oz', category: 'volume', baseMultiplier: 0.0295735296875 },
          { id: 'tablespoon', name: 'Tablespoon', symbol: 'tbsp', category: 'volume', baseMultiplier: 0.01478676478125 },
          { id: 'teaspoon', name: 'Teaspoon', symbol: 'tsp', category: 'volume', baseMultiplier: 0.00492892159375 }
        ]
      },

      // Area units (base: square meter)
      {
        id: 'area',
        name: 'Area',
        baseUnit: 'square_meter',
        description: 'Area and surface measurements',
        units: [
          { id: 'square_meter', name: 'Square Meter', symbol: 'm²', category: 'area', baseMultiplier: 1 },
          { id: 'square_kilometer', name: 'Square Kilometer', symbol: 'km²', category: 'area', baseMultiplier: 1000000 },
          { id: 'square_centimeter', name: 'Square Centimeter', symbol: 'cm²', category: 'area', baseMultiplier: 0.0001 },
          { id: 'square_millimeter', name: 'Square Millimeter', symbol: 'mm²', category: 'area', baseMultiplier: 0.000001 },
          { id: 'square_inch', name: 'Square Inch', symbol: 'in²', category: 'area', baseMultiplier: 0.00064516 },
          { id: 'square_foot', name: 'Square Foot', symbol: 'ft²', category: 'area', baseMultiplier: 0.09290304 },
          { id: 'square_yard', name: 'Square Yard', symbol: 'yd²', category: 'area', baseMultiplier: 0.83612736 },
          { id: 'square_mile', name: 'Square Mile', symbol: 'mi²', category: 'area', baseMultiplier: 2589988.110336 },
          { id: 'acre', name: 'Acre', symbol: 'ac', category: 'area', baseMultiplier: 4046.8564224 },
          { id: 'hectare', name: 'Hectare', symbol: 'ha', category: 'area', baseMultiplier: 10000 }
        ]
      },

      // Speed units (base: meter per second)
      {
        id: 'speed',
        name: 'Speed',
        baseUnit: 'meter_per_second',
        description: 'Speed and velocity measurements',
        units: [
          { id: 'meter_per_second', name: 'Meter per Second', symbol: 'm/s', category: 'speed', baseMultiplier: 1 },
          { id: 'kilometer_per_hour', name: 'Kilometer per Hour', symbol: 'km/h', category: 'speed', baseMultiplier: 1/3.6 },
          { id: 'mile_per_hour', name: 'Mile per Hour', symbol: 'mph', category: 'speed', baseMultiplier: 0.44704 },
          { id: 'foot_per_second', name: 'Foot per Second', symbol: 'ft/s', category: 'speed', baseMultiplier: 0.3048 },
          { id: 'knot', name: 'Knot', symbol: 'kn', category: 'speed', baseMultiplier: 0.514444444 },
          { id: 'mach', name: 'Mach', symbol: 'Ma', category: 'speed', baseMultiplier: 343 }, // At sea level, 20°C
          { id: 'speed_of_light', name: 'Speed of Light', symbol: 'c', category: 'speed', baseMultiplier: 299792458 }
        ]
      },

      // Time units (base: second)
      {
        id: 'time',
        name: 'Time',
        baseUnit: 'second',
        description: 'Time duration measurements',
        units: [
          { id: 'second', name: 'Second', symbol: 's', category: 'time', baseMultiplier: 1 },
          { id: 'millisecond', name: 'Millisecond', symbol: 'ms', category: 'time', baseMultiplier: 0.001 },
          { id: 'microsecond', name: 'Microsecond', symbol: 'μs', category: 'time', baseMultiplier: 0.000001 },
          { id: 'nanosecond', name: 'Nanosecond', symbol: 'ns', category: 'time', baseMultiplier: 0.000000001 },
          { id: 'minute', name: 'Minute', symbol: 'min', category: 'time', baseMultiplier: 60 },
          { id: 'hour', name: 'Hour', symbol: 'h', category: 'time', baseMultiplier: 3600 },
          { id: 'day', name: 'Day', symbol: 'd', category: 'time', baseMultiplier: 86400 },
          { id: 'week', name: 'Week', symbol: 'wk', category: 'time', baseMultiplier: 604800 },
          { id: 'month', name: 'Month', symbol: 'mo', category: 'time', baseMultiplier: 2629746 }, // Average month
          { id: 'year', name: 'Year', symbol: 'yr', category: 'time', baseMultiplier: 31556952 }, // Average year
          { id: 'decade', name: 'Decade', symbol: 'dec', category: 'time', baseMultiplier: 315569520 },
          { id: 'century', name: 'Century', symbol: 'c', category: 'time', baseMultiplier: 3155695200 }
        ]
      },

      // Digital Storage units (base: byte)
      {
        id: 'digital_storage',
        name: 'Digital Storage',
        baseUnit: 'byte',
        description: 'Digital data storage measurements',
        units: [
          { id: 'byte', name: 'Byte', symbol: 'B', category: 'digital_storage', baseMultiplier: 1 },
          { id: 'bit', name: 'Bit', symbol: 'bit', category: 'digital_storage', baseMultiplier: 0.125 },
          { id: 'kilobyte', name: 'Kilobyte', symbol: 'KB', category: 'digital_storage', baseMultiplier: 1000 },
          { id: 'kibibyte', name: 'Kibibyte', symbol: 'KiB', category: 'digital_storage', baseMultiplier: 1024 },
          { id: 'megabyte', name: 'Megabyte', symbol: 'MB', category: 'digital_storage', baseMultiplier: 1000000 },
          { id: 'mebibyte', name: 'Mebibyte', symbol: 'MiB', category: 'digital_storage', baseMultiplier: 1048576 },
          { id: 'gigabyte', name: 'Gigabyte', symbol: 'GB', category: 'digital_storage', baseMultiplier: 1000000000 },
          { id: 'gibibyte', name: 'Gibibyte', symbol: 'GiB', category: 'digital_storage', baseMultiplier: 1073741824 },
          { id: 'terabyte', name: 'Terabyte', symbol: 'TB', category: 'digital_storage', baseMultiplier: 1000000000000 },
          { id: 'tebibyte', name: 'Tebibyte', symbol: 'TiB', category: 'digital_storage', baseMultiplier: 1099511627776 },
          { id: 'petabyte', name: 'Petabyte', symbol: 'PB', category: 'digital_storage', baseMultiplier: 1000000000000000 },
          { id: 'pebibyte', name: 'Pebibyte', symbol: 'PiB', category: 'digital_storage', baseMultiplier: 1125899906842624 }
        ]
      },

      // Energy units (base: joule)
      {
        id: 'energy',
        name: 'Energy',
        baseUnit: 'joule',
        description: 'Energy and work measurements',
        units: [
          { id: 'joule', name: 'Joule', symbol: 'J', category: 'energy', baseMultiplier: 1 },
          { id: 'kilojoule', name: 'Kilojoule', symbol: 'kJ', category: 'energy', baseMultiplier: 1000 },
          { id: 'megajoule', name: 'Megajoule', symbol: 'MJ', category: 'energy', baseMultiplier: 1000000 },
          { id: 'calorie', name: 'Calorie', symbol: 'cal', category: 'energy', baseMultiplier: 4.184 },
          { id: 'kilocalorie', name: 'Kilocalorie', symbol: 'kcal', category: 'energy', baseMultiplier: 4184 },
          { id: 'watt_hour', name: 'Watt Hour', symbol: 'Wh', category: 'energy', baseMultiplier: 3600 },
          { id: 'kilowatt_hour', name: 'Kilowatt Hour', symbol: 'kWh', category: 'energy', baseMultiplier: 3600000 },
          { id: 'btu', name: 'British Thermal Unit', symbol: 'BTU', category: 'energy', baseMultiplier: 1055.05585262 },
          { id: 'therm', name: 'Therm', symbol: 'thm', category: 'energy', baseMultiplier: 105505585.262 },
          { id: 'foot_pound', name: 'Foot-Pound', symbol: 'ft⋅lbf', category: 'energy', baseMultiplier: 1.3558179483314004 },
          { id: 'electron_volt', name: 'Electron Volt', symbol: 'eV', category: 'energy', baseMultiplier: 1.602176634e-19 }
        ]
      },

      // Pressure units (base: pascal)
      {
        id: 'pressure',
        name: 'Pressure',
        baseUnit: 'pascal',
        description: 'Pressure and stress measurements',
        units: [
          { id: 'pascal', name: 'Pascal', symbol: 'Pa', category: 'pressure', baseMultiplier: 1 },
          { id: 'kilopascal', name: 'Kilopascal', symbol: 'kPa', category: 'pressure', baseMultiplier: 1000 },
          { id: 'megapascal', name: 'Megapascal', symbol: 'MPa', category: 'pressure', baseMultiplier: 1000000 },
          { id: 'bar', name: 'Bar', symbol: 'bar', category: 'pressure', baseMultiplier: 100000 },
          { id: 'millibar', name: 'Millibar', symbol: 'mbar', category: 'pressure', baseMultiplier: 100 },
          { id: 'atmosphere', name: 'Atmosphere', symbol: 'atm', category: 'pressure', baseMultiplier: 101325 },
          { id: 'torr', name: 'Torr', symbol: 'Torr', category: 'pressure', baseMultiplier: 133.322387415 },
          { id: 'mmhg', name: 'Millimeter of Mercury', symbol: 'mmHg', category: 'pressure', baseMultiplier: 133.322387415 },
          { id: 'psi', name: 'Pounds per Square Inch', symbol: 'psi', category: 'pressure', baseMultiplier: 6894.75729316836 },
          { id: 'psf', name: 'Pounds per Square Foot', symbol: 'psf', category: 'pressure', baseMultiplier: 47.8802589803358 }
        ]
      },

      // Angle units (base: degree)
      {
        id: 'angle',
        name: 'Angle',
        baseUnit: 'degree',
        description: 'Angular measurements',
        units: [
          { id: 'degree', name: 'Degree', symbol: '°', category: 'angle', baseMultiplier: 1 },
          { id: 'radian', name: 'Radian', symbol: 'rad', category: 'angle', baseMultiplier: 57.2957795130823 },
          { id: 'gradian', name: 'Gradian', symbol: 'gon', category: 'angle', baseMultiplier: 0.9 },
          { id: 'turn', name: 'Turn', symbol: 'tr', category: 'angle', baseMultiplier: 360 },
          { id: 'arcminute', name: 'Arcminute', symbol: '′', category: 'angle', baseMultiplier: 0.0166666666666667 },
          { id: 'arcsecond', name: 'Arcsecond', symbol: '″', category: 'angle', baseMultiplier: 0.000277777777777778 },
          { id: 'milliradian', name: 'Milliradian', symbol: 'mrad', category: 'angle', baseMultiplier: 0.0572957795130823 }
        ]
      }
    ]
  }
}

// Export singleton instance
export const unitConverter = new UnitConversionEngine()