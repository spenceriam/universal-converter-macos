import {
  Currency,
  ExchangeRates,
  CurrencyConversionResult,
  CurrencyService,
  ApiResponse,
  ErrorType,
  AppError,
  SUPPORTED_CURRENCIES
} from '../types'

/**
 * Currency service with Frankfurter API integration
 * Provides exchange rate fetching, caching, and offline fallback
 */
export class CurrencyServiceImpl implements CurrencyService {
  private readonly API_BASE_URL = 'https://api.frankfurter.app'
  private readonly CACHE_KEY = 'currency_exchange_rates'
  private readonly CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds
  private readonly MAX_STALE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  private readonly RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY = 1000 // 1 second

  private cachedRates: ExchangeRates | null = null
  private lastFetchTime: number = 0
  private isOnline: boolean = navigator.onLine

  constructor() {
    this.initializeOnlineStatus()
    this.loadCachedRates()
  }

  /**
   * Get exchange rates with caching and retry logic
   */
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
    // Validate base currency
    if (!this.isSupportedCurrency(baseCurrency)) {
      throw this.createError(
        ErrorType.VALIDATION_ERROR,
        `Unsupported base currency: ${baseCurrency}`
      )
    }

    // Check if cached rates are still fresh
    if (this.cachedRates && this.isCacheFresh(this.cachedRates.timestamp)) {
      // Update base currency if different
      if (this.cachedRates.base !== baseCurrency) {
        return this.convertRatesBase(this.cachedRates, baseCurrency)
      }
      return this.cachedRates
    }

    // Try to fetch fresh rates if online
    if (this.isOnline) {
      try {
        const freshRates = await this.fetchExchangeRatesWithRetry(baseCurrency)
        await this.cacheRates(freshRates)
        this.cachedRates = freshRates
        this.lastFetchTime = Date.now()
        return freshRates
      } catch (error) {
        console.warn('Failed to fetch fresh exchange rates:', error)
        
        // Fall back to cached rates if available and not too stale
        if (this.cachedRates && !this.isRateStale(this.cachedRates.timestamp)) {
          return this.convertRatesBase(this.cachedRates, baseCurrency)
        }
        
        // Re-throw the original error with proper type
        if (error instanceof Error) {
          if (error.message.includes('rate limit')) {
            throw this.createError(
              ErrorType.RATE_LIMIT_ERROR,
              'API rate limit exceeded. Please try again later.',
              { originalError: error }
            )
          }
          
          if (error.message.includes('Invalid API response')) {
            throw this.createError(
              ErrorType.API_ERROR,
              'Invalid API response format',
              { originalError: error }
            )
          }
        }
        
        throw this.createError(
          ErrorType.API_ERROR,
          'Unable to fetch exchange rates and no valid cached data available',
          { originalError: error }
        )
      }
    }

    // Offline mode - use cached rates if available
    if (this.cachedRates) {
      return this.convertRatesBase(this.cachedRates, baseCurrency)
    }

    throw this.createError(
      ErrorType.NETWORK_ERROR,
      'No internet connection and no cached exchange rates available'
    )
  }

  /**
   * Convert currency amount with rate validation
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversionResult> {
    if (!this.validateAmount(amount)) {
      throw this.createError(
        ErrorType.VALIDATION_ERROR,
        'Invalid amount for currency conversion'
      )
    }

    if (!this.isSupportedCurrency(fromCurrency) || !this.isSupportedCurrency(toCurrency)) {
      throw this.createError(
        ErrorType.VALIDATION_ERROR,
        'Unsupported currency code provided'
      )
    }

    // Same currency conversion
    if (fromCurrency === toCurrency) {
      return {
        amount,
        formattedAmount: this.formatCurrency(amount, toCurrency),
        fromCurrency: this.getCurrencyInfo(fromCurrency),
        toCurrency: this.getCurrencyInfo(toCurrency),
        rate: 1,
        timestamp: Date.now(),
        isStale: false
      }
    }

    const rates = await this.getExchangeRates(fromCurrency)
    const rate = rates.rates[toCurrency]

    if (!rate) {
      throw this.createError(
        ErrorType.CONVERSION_ERROR,
        `Exchange rate not available for ${fromCurrency} to ${toCurrency}`
      )
    }

    const convertedAmount = amount * rate
    const isStale = this.isRateStale(rates.timestamp)

    return {
      amount: convertedAmount,
      formattedAmount: this.formatCurrency(convertedAmount, toCurrency),
      fromCurrency: this.getCurrencyInfo(fromCurrency),
      toCurrency: this.getCurrencyInfo(toCurrency),
      rate,
      timestamp: rates.timestamp,
      isStale
    }
  }

  /**
   * Get list of supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return SUPPORTED_CURRENCIES.map(code => this.getCurrencyInfo(code))
  }

  /**
   * Get last update time of exchange rates
   */
  getLastUpdateTime(): Date | null {
    return this.cachedRates ? new Date(this.cachedRates.timestamp) : null
  }

  /**
   * Check if exchange rate data is stale
   */
  isRateStale(timestamp: number): boolean {
    const age = Date.now() - timestamp
    return age > this.MAX_STALE_DURATION
  }

  /**
   * Fetch exchange rates from Frankfurter API with retry logic
   */
  private async fetchExchangeRatesWithRetry(baseCurrency: string): Promise<ExchangeRates> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        return await this.fetchExchangeRates(baseCurrency)
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.RETRY_ATTEMPTS) {
          // Exponential backoff
          const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * Fetch exchange rates from Frankfurter API
   */
  private async fetchExchangeRates(baseCurrency: string): Promise<ExchangeRates> {
    const url = `${this.API_BASE_URL}/latest?from=${baseCurrency}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Universal-Converter/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response || !response.ok) {
      if (response && response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.')
      }
      
      throw new Error(`API request failed with status ${response?.status || 'unknown'}: ${response?.statusText || 'unknown error'}`)
    }

    const data = await response.json()
    
    // Validate API response structure
    if (!data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid API response format')
    }

    return {
      base: baseCurrency,
      rates: data.rates,
      timestamp: Date.now(),
      source: 'frankfurter'
    }
  }

  /**
   * Convert exchange rates to different base currency
   */
  private convertRatesBase(rates: ExchangeRates, newBase: string): ExchangeRates {
    if (rates.base === newBase) {
      return rates
    }

    // If converting to a currency that's in the rates
    if (rates.rates[newBase]) {
      const baseRate = rates.rates[newBase]
      const convertedRates: Record<string, number> = {}

      // Add the original base currency to rates
      convertedRates[rates.base] = 1 / baseRate

      // Convert all other rates
      Object.entries(rates.rates).forEach(([currency, rate]) => {
        if (currency !== newBase) {
          convertedRates[currency] = rate / baseRate
        }
      })

      return {
        base: newBase,
        rates: convertedRates,
        timestamp: rates.timestamp,
        source: rates.source
      }
    }

    throw this.createError(
      ErrorType.CONVERSION_ERROR,
      `Cannot convert rates to base currency ${newBase} - rate not available`
    )
  }

  /**
   * Cache exchange rates in localStorage
   */
  private async cacheRates(rates: ExchangeRates): Promise<void> {
    try {
      const cacheData = {
        data: rates,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION,
        version: '1.0'
      }
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache exchange rates:', error)
      // Don't throw - caching failure shouldn't break the app
    }
  }

  /**
   * Load cached exchange rates from localStorage
   */
  private loadCachedRates(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (!cached) return

      const cacheData = JSON.parse(cached)
      
      // Validate cache structure
      if (cacheData.data && cacheData.timestamp && cacheData.version === '1.0') {
        this.cachedRates = cacheData.data
        this.lastFetchTime = cacheData.timestamp
      }
    } catch (error) {
      console.warn('Failed to load cached exchange rates:', error)
      // Clear corrupted cache
      localStorage.removeItem(this.CACHE_KEY)
    }
  }

  /**
   * Check if cached data is still fresh
   */
  private isCacheFresh(timestamp: number): boolean {
    const age = Date.now() - timestamp
    return age < this.CACHE_DURATION
  }

  /**
   * Validate currency amount
   */
  private validateAmount(amount: number): boolean {
    return typeof amount === 'number' && 
           !isNaN(amount) && 
           isFinite(amount) && 
           amount >= 0
  }

  /**
   * Check if currency is supported
   */
  private isSupportedCurrency(code: string): boolean {
    return SUPPORTED_CURRENCIES.includes(code as any)
  }

  /**
   * Get currency information
   */
  private getCurrencyInfo(code: string): Currency {
    const currencyMap: Record<string, Currency> = {
      USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
      EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
      GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
      JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
      AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
      CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
      CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
      CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
      SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
      NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
      MXN: { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
      SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
      HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
      NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
      TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
      RUB: { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
      INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
      BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
      ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
      KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' }
    }

    return currencyMap[code] || { code, name: code, symbol: code }
  }

  /**
   * Format currency amount with appropriate precision
   */
  private formatCurrency(amount: number, currencyCode: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      }).format(amount)
    } catch {
      // Fallback formatting if Intl.NumberFormat fails
      const symbol = this.getCurrencyInfo(currencyCode).symbol
      return `${symbol}${amount.toFixed(2)}`
    }
  }

  /**
   * Initialize online status monitoring
   */
  private initializeOnlineStatus(): void {
    this.isOnline = navigator.onLine

    window.addEventListener('online', () => {
      this.isOnline = true
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  /**
   * Create standardized error object
   */
  private createError(type: ErrorType, message: string, context?: Record<string, any>): AppError {
    return {
      id: `currency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      context,
      severity: type === ErrorType.VALIDATION_ERROR ? 'low' : 'medium'
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const currencyService = new CurrencyServiceImpl()