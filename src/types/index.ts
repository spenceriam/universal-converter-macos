import React from 'react'

// Core conversion types
export type ConversionType = 'units' | 'currency' | 'timezone'

// Theme types with warm color palette support
export type ThemeMode = 'light' | 'dark' | 'system'
export type ColorScheme = 'warm' | 'neutral'

// Unit system types
export interface Unit {
  id: string
  name: string
  symbol: string
  category: string
  baseMultiplier: number // Conversion factor to base unit
  aliases?: string[] // Alternative names for search
}

export interface UnitCategory {
  id: string
  name: string
  baseUnit: string
  units: Unit[]
  description?: string
}

// Currency types
export interface Currency {
  code: string // ISO 4217 code (e.g., "USD")
  name: string
  symbol: string
  flag?: string // Unicode flag emoji or country code
}

export interface ExchangeRates {
  base: string
  rates: Record<string, number>
  timestamp: number
  source?: string // API source identifier
}

// Time zone types
export interface TimeZone {
  id: string // IANA identifier (e.g., "America/New_York")
  name: string // Display name
  offset: number // Current UTC offset in minutes
  isDST: boolean // Currently observing DST
  country?: string
  region?: string
}

// Application state types
export interface AppState {
  currentConverter: ConversionType
  theme: ThemeMode
  colorScheme: ColorScheme
  isOnline: boolean
  lastDataUpdate: number
  preferences: UserPreferences
  errors: AppError[]
}

export interface UserPreferences {
  defaultCurrency: string
  defaultTimeZone: string
  preferredUnits: Record<string, string> // category -> preferred unit
  decimalPlaces: number
  theme: ThemeMode
  colorScheme: ColorScheme
  autoUpdateRates: boolean
  showCopyFeedback: boolean
  enableAnimations: boolean
  fontSize: 'small' | 'medium' | 'large'
}

// Error handling types
export interface AppError {
  id: string
  type: ErrorType
  message: string
  timestamp: number
  context?: Record<string, any>
  severity: 'low' | 'medium' | 'high'
}

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONVERSION_ERROR = 'CONVERSION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}

// Currency API specific types
export interface CurrencyApiResponse extends ApiResponse<ExchangeRates> {
  rateLimit?: {
    remaining: number
    resetTime: number
  }
}

// Time zone API specific types
export interface TimeZoneApiResponse extends ApiResponse<TimeZoneData> {
  timezone: string
}

export interface TimeZoneData {
  datetime: string
  timezone: string
  utc_offset: string
  dst: boolean
  dst_offset: number
}

// Conversion result types
export interface ConversionResult {
  value: number
  formattedValue: string
  unit: Unit
  precision: number
  timestamp: number
}

export interface CurrencyConversionResult {
  amount: number
  formattedAmount: string
  fromCurrency: Currency
  toCurrency: Currency
  rate: number
  timestamp: number
  isStale: boolean
}

export interface TimeConversionResult {
  sourceTime: Date
  targetTime: Date
  sourceTimeZone: TimeZone
  targetTimeZone: TimeZone
  isDSTTransition: boolean
}

// Cache management types
export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
  version: string
}

export interface CacheConfig {
  maxAge: number // milliseconds
  maxSize: number // number of entries
  compressionEnabled: boolean
}

// Storage types
export interface StorageManager {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  size(): Promise<number>
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  'data-testid'?: string
}

export interface ConversionContainerProps extends BaseComponentProps {
  title: string
  children: React.ReactNode
  onCopy?: (value: string) => void
  isLoading?: boolean
  error?: AppError | null
}

export interface UnitConverterProps extends BaseComponentProps {
  initialCategory?: string
  onConversion?: (result: ConversionResult) => void
}

export interface CurrencyConverterProps extends BaseComponentProps {
  defaultBaseCurrency?: string
  onConversion?: (result: CurrencyConversionResult) => void
}

export interface TimeZoneConverterProps extends BaseComponentProps {
  defaultSourceTz?: string
  defaultTargetTz?: string
  onConversion?: (result: TimeConversionResult) => void
}

// Service interface types
export interface ConversionService {
  convert(value: number, fromUnit: string, toUnit: string): Promise<ConversionResult>
  getSupportedUnits(category: string): Unit[]
  getCategories(): UnitCategory[]
  validateInput(value: string): boolean
}

export interface CurrencyService {
  getExchangeRates(baseCurrency?: string): Promise<ExchangeRates>
  convertCurrency(amount: number, from: string, to: string): Promise<CurrencyConversionResult>
  getSupportedCurrencies(): Currency[]
  getLastUpdateTime(): Date | null
  isRateStale(timestamp: number): boolean
}

export interface TimeZoneService {
  convertTime(dateTime: Date, fromTz: string, toTz: string): Promise<TimeConversionResult>
  getCurrentTime(timeZone: string): Promise<Date>
  getSupportedTimeZones(): TimeZone[]
  isDSTActive(timeZone: string, date: Date): boolean
  validateTimeZone(tzId: string): boolean
}

// Default values and constants
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultCurrency: 'USD',
  defaultTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  preferredUnits: {
    length: 'meter',
    weight: 'kilogram',
    temperature: 'celsius',
    volume: 'liter',
    area: 'square_meter',
    speed: 'meter_per_second',
    time: 'second',
    digital_storage: 'byte',
    energy: 'joule',
    pressure: 'pascal',
    angle: 'degree'
  },
  decimalPlaces: 6,
  theme: 'system',
  colorScheme: 'warm',
  autoUpdateRates: true,
  showCopyFeedback: true,
  enableAnimations: true,
  fontSize: 'medium'
}

export const DEFAULT_APP_STATE: AppState = {
  currentConverter: 'units',
  theme: 'system',
  colorScheme: 'warm',
  isOnline: navigator.onLine,
  lastDataUpdate: 0,
  preferences: DEFAULT_USER_PREFERENCES,
  errors: []
}

// Validation schemas (for runtime type checking)
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW'
] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

export const UNIT_CATEGORIES = [
  'length', 'weight', 'temperature', 'volume', 'area', 'speed', 'time',
  'digital_storage', 'energy', 'pressure', 'angle'
] as const

export type UnitCategoryId = typeof UNIT_CATEGORIES[number]