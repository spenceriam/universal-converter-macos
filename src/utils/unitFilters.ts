import { Unit, UnitCategory } from '../types'

/**
 * Utility functions for unit category management and filtering
 */

/**
 * Filter units by search term
 */
export function filterUnits(units: Unit[], searchTerm: string): Unit[] {
  if (!searchTerm.trim()) {
    return units
  }

  const term = searchTerm.toLowerCase()
  return units.filter(unit => 
    unit.name.toLowerCase().includes(term) ||
    unit.symbol.toLowerCase().includes(term) ||
    unit.id.toLowerCase().includes(term) ||
    (unit.aliases && unit.aliases.some(alias => alias.toLowerCase().includes(term)))
  )
}

/**
 * Filter categories by search term
 */
export function filterCategories(categories: UnitCategory[], searchTerm: string): UnitCategory[] {
  if (!searchTerm.trim()) {
    return categories
  }

  const term = searchTerm.toLowerCase()
  return categories.filter(category =>
    category.name.toLowerCase().includes(term) ||
    category.id.toLowerCase().includes(term) ||
    (category.description && category.description.toLowerCase().includes(term))
  )
}

/**
 * Get units by category ID
 */
export function getUnitsByCategory(categories: UnitCategory[], categoryId: string): Unit[] {
  const category = categories.find(cat => cat.id === categoryId)
  return category ? category.units : []
}

/**
 * Find unit by ID across all categories
 */
export function findUnitById(categories: UnitCategory[], unitId: string): Unit | null {
  for (const category of categories) {
    const unit = category.units.find(u => u.id === unitId)
    if (unit) {
      return unit
    }
  }
  return null
}

/**
 * Get popular units for a category (commonly used units first)
 */
export function getPopularUnits(units: Unit[], categoryId: string): Unit[] {
  const popularUnitIds: Record<string, string[]> = {
    length: ['meter', 'kilometer', 'centimeter', 'millimeter', 'inch', 'foot', 'yard', 'mile'],
    weight: ['kilogram', 'gram', 'pound', 'ounce', 'tonne'],
    temperature: ['celsius', 'fahrenheit', 'kelvin'],
    volume: ['liter', 'milliliter', 'gallon_us', 'cup_us', 'cubic_meter'],
    area: ['square_meter', 'square_kilometer', 'square_foot', 'acre', 'hectare'],
    speed: ['meter_per_second', 'kilometer_per_hour', 'mile_per_hour', 'knot'],
    time: ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'],
    digital_storage: ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'],
    energy: ['joule', 'kilojoule', 'calorie', 'kilocalorie', 'kilowatt_hour'],
    pressure: ['pascal', 'bar', 'atmosphere', 'psi'],
    angle: ['degree', 'radian', 'gradian']
  }

  const popularIds = popularUnitIds[categoryId] || []
  const popularUnits: Unit[] = []
  const otherUnits: Unit[] = []

  // First add popular units in order
  popularIds.forEach(id => {
    const unit = units.find(u => u.id === id)
    if (unit) {
      popularUnits.push(unit)
    }
  })

  // Then add remaining units
  units.forEach(unit => {
    if (!popularIds.includes(unit.id)) {
      otherUnits.push(unit)
    }
  })

  return [...popularUnits, ...otherUnits]
}

/**
 * Group units by their base unit for better organization
 */
export function groupUnitsByBase(units: Unit[]): Record<string, Unit[]> {
  const groups: Record<string, Unit[]> = {}
  
  units.forEach(unit => {
    const baseKey = unit.category
    if (!groups[baseKey]) {
      groups[baseKey] = []
    }
    groups[baseKey].push(unit)
  })

  return groups
}

/**
 * Sort units by name alphabetically
 */
export function sortUnitsByName(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Sort units by symbol alphabetically
 */
export function sortUnitsBySymbol(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => a.symbol.localeCompare(b.symbol))
}

/**
 * Get conversion factor between two units (for display purposes)
 */
export function getConversionFactor(fromUnit: Unit, toUnit: Unit): number {
  if (fromUnit.category !== toUnit.category) {
    throw new Error('Cannot get conversion factor between different categories')
  }
  
  // For temperature, return 1 as it's non-linear
  if (fromUnit.category === 'temperature') {
    return 1
  }
  
  return fromUnit.baseMultiplier / toUnit.baseMultiplier
}

/**
 * Check if a unit conversion is possible
 */
export function canConvert(fromUnit: Unit, toUnit: Unit): boolean {
  return fromUnit.category === toUnit.category
}

/**
 * Get unit display text (name with symbol)
 */
export function getUnitDisplayText(unit: Unit): string {
  return `${unit.name} (${unit.symbol})`
}

/**
 * Get category display text with unit count
 */
export function getCategoryDisplayText(category: UnitCategory): string {
  const count = category.units.length
  return `${category.name} (${count} units)`
}