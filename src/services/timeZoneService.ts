import type {
  TimeZone,
  TimeZoneService,
  TimeConversionResult,
  TimeZoneData,
  AppError
} from '../types'
import { ErrorType } from '../types'

/**
 * Time zone service using browser Intl API and World Time API
 * Provides DST-aware time conversion and current time display
 */
export class TimeZoneServiceImpl implements TimeZoneService {
  private readonly API_BASE_URL = 'https://worldtimeapi.org/api'
  private readonly CACHE_KEY = 'timezone_data'
  private readonly CACHE_DURATION = 60 * 60 * 1000 // 1 hour for timezone data
  private readonly RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY = 1000 // 1 second

  private supportedTimeZones: TimeZone[] = []
  private cachedTimeZoneData: Map<string, { data: TimeZoneData; timestamp: number }> = new Map()
  private isOnline: boolean = navigator.onLine

  constructor() {
    this.initializeOnlineStatus()
    this.initializeSupportedTimeZones()
    this.loadCachedData()
  }

  /**
   * Convert time between time zones with DST awareness
   */
  async convertTime(dateTime: Date, fromTz: string, toTz: string): Promise<TimeConversionResult> {
    if (!this.validateTimeZone(fromTz) || !this.validateTimeZone(toTz)) {
      throw this.createError(
        ErrorType.VALIDATION_ERROR,
        'Invalid time zone identifier provided'
      )
    }

    if (!this.isValidDate(dateTime)) {
      throw this.createError(
        ErrorType.VALIDATION_ERROR,
        'Invalid date provided for conversion'
      )
    }

    try {
      // Use Intl.DateTimeFormat for accurate time zone conversion
      const sourceTimeZone = this.getTimeZoneInfo(fromTz)
      const targetTimeZone = this.getTimeZoneInfo(toTz)

      // Create a proper time conversion using the source timezone first
      const sourceTimeString = dateTime.toLocaleString('sv-SE', { timeZone: fromTz })
      const targetTime = new Date(sourceTimeString + 'Z')
      const finalTargetTime = new Date(targetTime.toLocaleString('sv-SE', { timeZone: toTz }) + 'Z')
      
      // Check for DST transitions
      const isDSTTransition = this.checkDSTTransition(dateTime, fromTz, toTz)

      return {
        sourceTime: dateTime,
        targetTime: finalTargetTime,
        sourceTimeZone,
        targetTimeZone,
        isDSTTransition
      }
    } catch (error) {
      throw this.createError(
        ErrorType.CONVERSION_ERROR,
        `Failed to convert time from ${fromTz} to ${toTz}`,
        { originalError: error }
      )
    }
  }

  /**
   * Get current time in specified time zone
   */
  async getCurrentTime(timeZone: string): Promise<Date> {
    if (!this.validateTimeZone(timeZone)) {
      throw this.createError(
        ErrorType.VALIDATION_ERROR,
        `Invalid time zone identifier: ${timeZone}`
      )
    }

    try {
      // Try to get precise time from World Time API if online
      if (this.isOnline) {
        try {
          const timeData = await this.fetchTimeZoneDataWithRetry(timeZone)
          return new Date(timeData.datetime)
        } catch (error) {
          console.warn(`Failed to fetch time from API for ${timeZone}, falling back to local time:`, error)
        }
      }

      // Fallback to browser's time with time zone conversion
      const now = new Date()
      return new Date(now.toLocaleString('en-US', { timeZone }))
    } catch (error) {
      throw this.createError(
        ErrorType.CONVERSION_ERROR,
        `Failed to get current time for time zone: ${timeZone}`,
        { originalError: error }
      )
    }
  }

  /**
   * Get list of supported time zones with major cities and regions
   */
  getSupportedTimeZones(): TimeZone[] {
    return this.supportedTimeZones
  }

  /**
   * Check if DST is active for a time zone at a specific date
   */
  isDSTActive(timeZone: string, date: Date): boolean {
    if (!this.validateTimeZone(timeZone) || !this.isValidDate(date)) {
      return false
    }

    try {
      // Use Intl.DateTimeFormat to get timezone name which often indicates DST
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'short'
      })
      
      const parts = formatter.formatToParts(date)
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || ''
      
      // Check for common DST indicators in timezone abbreviations
      const dstIndicators = [
        'EDT', 'CDT', 'MDT', 'PDT', // US DST
        'BST', 'CEST', 'EEST', // European DST
        'AEDT', 'ACDT', // Australian DST
        'NZDT' // New Zealand DST
      ]
      
      const standardIndicators = [
        'EST', 'CST', 'MST', 'PST', // US Standard
        'GMT', 'CET', 'EET', // European Standard
        'AEST', 'ACST', // Australian Standard
        'NZST' // New Zealand Standard
      ]
      
      // If we find a DST indicator, return true
      if (dstIndicators.some(indicator => timeZoneName.includes(indicator))) {
        return true
      }
      
      // If we find a standard time indicator, return false
      if (standardIndicators.some(indicator => timeZoneName.includes(indicator))) {
        return false
      }
      
      // Fallback: compare with January (winter) offset
      const january = new Date(date.getFullYear(), 0, 15) // Mid-January
      const july = new Date(date.getFullYear(), 6, 15) // Mid-July
      
      const janFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'short'
      })
      const julFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'short'
      })
      
      const janParts = janFormatter.formatToParts(january)
      const julParts = julFormatter.formatToParts(july)
      
      const janTzName = janParts.find(part => part.type === 'timeZoneName')?.value || ''
      const julTzName = julParts.find(part => part.type === 'timeZoneName')?.value || ''
      
      // If timezone names are different between January and July, check which one matches current
      if (janTzName !== julTzName) {
        // Current timezone name matches July (summer) name, likely DST
        return timeZoneName === julTzName
      }
      
      return false
    } catch {
      return false
    }
  }

  /**
   * Validate time zone identifier
   */
  validateTimeZone(tzId: string): boolean {
    try {
      // Test if the time zone is valid by attempting to use it
      new Intl.DateTimeFormat('en-US', { timeZone: tzId })
      return true
    } catch {
      return false
    }
  }

  /**
   * Search and filter time zones by name or region
   */
  searchTimeZones(query: string): TimeZone[] {
    if (!query || query.length < 2) {
      return this.supportedTimeZones.slice(0, 20) // Return first 20 for empty query
    }

    const normalizedQuery = query.toLowerCase()
    
    return this.supportedTimeZones.filter(tz => 
      tz.name.toLowerCase().includes(normalizedQuery) ||
      tz.id.toLowerCase().includes(normalizedQuery) ||
      tz.country?.toLowerCase().includes(normalizedQuery) ||
      tz.region?.toLowerCase().includes(normalizedQuery)
    ).slice(0, 50) // Limit results to 50
  }

  /**
   * Fetch time zone data from World Time API with retry logic
   */
  private async fetchTimeZoneDataWithRetry(timeZone: string): Promise<TimeZoneData> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        return await this.fetchTimeZoneData(timeZone)
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.RETRY_ATTEMPTS) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * Fetch time zone data from World Time API
   */
  private async fetchTimeZoneData(timeZone: string): Promise<TimeZoneData> {
    // Check cache first
    const cached = this.cachedTimeZoneData.get(timeZone)
    if (cached && this.isCacheFresh(cached.timestamp)) {
      return cached.data
    }

    const url = `${this.API_BASE_URL}/timezone/${encodeURIComponent(timeZone)}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Universal-Converter/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Validate API response structure
    if (!data.datetime || !data.timezone) {
      throw new Error('Invalid API response format')
    }

    const timeZoneData: TimeZoneData = {
      datetime: data.datetime,
      timezone: data.timezone,
      utc_offset: data.utc_offset,
      dst: data.dst || false,
      dst_offset: data.dst_offset || 0
    }

    // Cache the data
    this.cachedTimeZoneData.set(timeZone, {
      data: timeZoneData,
      timestamp: Date.now()
    })

    this.saveCachedData()
    return timeZoneData
  }

  /**
   * Initialize comprehensive list of supported time zones
   */
  private initializeSupportedTimeZones(): void {
    // Major world time zones with cities and regions
    const majorTimeZones = [
      // Americas
      { id: 'America/New_York', name: 'New York (Eastern Time)', country: 'United States', region: 'Americas' },
      { id: 'America/Chicago', name: 'Chicago (Central Time)', country: 'United States', region: 'Americas' },
      { id: 'America/Denver', name: 'Denver (Mountain Time)', country: 'United States', region: 'Americas' },
      { id: 'America/Los_Angeles', name: 'Los Angeles (Pacific Time)', country: 'United States', region: 'Americas' },
      { id: 'America/Anchorage', name: 'Anchorage (Alaska Time)', country: 'United States', region: 'Americas' },
      { id: 'Pacific/Honolulu', name: 'Honolulu (Hawaii Time)', country: 'United States', region: 'Pacific' },
      { id: 'America/Toronto', name: 'Toronto', country: 'Canada', region: 'Americas' },
      { id: 'America/Vancouver', name: 'Vancouver', country: 'Canada', region: 'Americas' },
      { id: 'America/Mexico_City', name: 'Mexico City', country: 'Mexico', region: 'Americas' },
      { id: 'America/Sao_Paulo', name: 'São Paulo', country: 'Brazil', region: 'Americas' },
      { id: 'America/Buenos_Aires', name: 'Buenos Aires', country: 'Argentina', region: 'Americas' },
      { id: 'America/Lima', name: 'Lima', country: 'Peru', region: 'Americas' },
      { id: 'America/Bogota', name: 'Bogotá', country: 'Colombia', region: 'Americas' },
      
      // Europe
      { id: 'Europe/London', name: 'London (GMT/BST)', country: 'United Kingdom', region: 'Europe' },
      { id: 'Europe/Paris', name: 'Paris (CET/CEST)', country: 'France', region: 'Europe' },
      { id: 'Europe/Berlin', name: 'Berlin (CET/CEST)', country: 'Germany', region: 'Europe' },
      { id: 'Europe/Rome', name: 'Rome (CET/CEST)', country: 'Italy', region: 'Europe' },
      { id: 'Europe/Madrid', name: 'Madrid (CET/CEST)', country: 'Spain', region: 'Europe' },
      { id: 'Europe/Amsterdam', name: 'Amsterdam (CET/CEST)', country: 'Netherlands', region: 'Europe' },
      { id: 'Europe/Zurich', name: 'Zurich (CET/CEST)', country: 'Switzerland', region: 'Europe' },
      { id: 'Europe/Vienna', name: 'Vienna (CET/CEST)', country: 'Austria', region: 'Europe' },
      { id: 'Europe/Stockholm', name: 'Stockholm (CET/CEST)', country: 'Sweden', region: 'Europe' },
      { id: 'Europe/Oslo', name: 'Oslo (CET/CEST)', country: 'Norway', region: 'Europe' },
      { id: 'Europe/Copenhagen', name: 'Copenhagen (CET/CEST)', country: 'Denmark', region: 'Europe' },
      { id: 'Europe/Helsinki', name: 'Helsinki (EET/EEST)', country: 'Finland', region: 'Europe' },
      { id: 'Europe/Moscow', name: 'Moscow (MSK)', country: 'Russia', region: 'Europe' },
      { id: 'Europe/Istanbul', name: 'Istanbul (TRT)', country: 'Turkey', region: 'Europe' },
      
      // Asia
      { id: 'Asia/Tokyo', name: 'Tokyo (JST)', country: 'Japan', region: 'Asia' },
      { id: 'Asia/Shanghai', name: 'Shanghai (CST)', country: 'China', region: 'Asia' },
      { id: 'Asia/Hong_Kong', name: 'Hong Kong (HKT)', country: 'Hong Kong', region: 'Asia' },
      { id: 'Asia/Singapore', name: 'Singapore (SGT)', country: 'Singapore', region: 'Asia' },
      { id: 'Asia/Seoul', name: 'Seoul (KST)', country: 'South Korea', region: 'Asia' },
      { id: 'Asia/Taipei', name: 'Taipei (CST)', country: 'Taiwan', region: 'Asia' },
      { id: 'Asia/Bangkok', name: 'Bangkok (ICT)', country: 'Thailand', region: 'Asia' },
      { id: 'Asia/Jakarta', name: 'Jakarta (WIB)', country: 'Indonesia', region: 'Asia' },
      { id: 'Asia/Manila', name: 'Manila (PST)', country: 'Philippines', region: 'Asia' },
      { id: 'Asia/Kuala_Lumpur', name: 'Kuala Lumpur (MYT)', country: 'Malaysia', region: 'Asia' },
      { id: 'Asia/Mumbai', name: 'Mumbai (IST)', country: 'India', region: 'Asia' },
      { id: 'Asia/Kolkata', name: 'Kolkata (IST)', country: 'India', region: 'Asia' },
      { id: 'Asia/Dubai', name: 'Dubai (GST)', country: 'UAE', region: 'Asia' },
      { id: 'Asia/Riyadh', name: 'Riyadh (AST)', country: 'Saudi Arabia', region: 'Asia' },
      { id: 'Asia/Tehran', name: 'Tehran (IRST)', country: 'Iran', region: 'Asia' },
      
      // Africa
      { id: 'Africa/Cairo', name: 'Cairo (EET)', country: 'Egypt', region: 'Africa' },
      { id: 'Africa/Lagos', name: 'Lagos (WAT)', country: 'Nigeria', region: 'Africa' },
      { id: 'Africa/Johannesburg', name: 'Johannesburg (SAST)', country: 'South Africa', region: 'Africa' },
      { id: 'Africa/Nairobi', name: 'Nairobi (EAT)', country: 'Kenya', region: 'Africa' },
      { id: 'Africa/Casablanca', name: 'Casablanca (WET)', country: 'Morocco', region: 'Africa' },
      
      // Oceania
      { id: 'Australia/Sydney', name: 'Sydney (AEST/AEDT)', country: 'Australia', region: 'Oceania' },
      { id: 'Australia/Melbourne', name: 'Melbourne (AEST/AEDT)', country: 'Australia', region: 'Oceania' },
      { id: 'Australia/Perth', name: 'Perth (AWST)', country: 'Australia', region: 'Oceania' },
      { id: 'Pacific/Auckland', name: 'Auckland (NZST/NZDT)', country: 'New Zealand', region: 'Pacific' },
      { id: 'Pacific/Fiji', name: 'Suva (FJT)', country: 'Fiji', region: 'Pacific' }
    ]

    this.supportedTimeZones = majorTimeZones.map(tz => ({
      ...tz,
      offset: this.getCurrentOffset(tz.id),
      isDST: this.isDSTActive(tz.id, new Date())
    }))
  }

  /**
   * Get current UTC offset for a time zone in minutes
   */
  private getCurrentOffset(timeZone: string): number {
    try {
      const now = new Date()
      return this.getTimezoneOffset(timeZone, now)
    } catch {
      return 0
    }
  }

  /**
   * Get UTC offset for a specific date and timezone in minutes
   */
  private getTimezoneOffset(timeZone: string, date: Date): number {
    try {
      // Use a more reliable method to get timezone offset
      const year = date.getFullYear()
      const month = date.getMonth()
      const day = date.getDate()
      const hour = date.getHours()
      const minute = date.getMinutes()
      const second = date.getSeconds()
      
      // Create date in the target timezone
      const tzDate = new Date()
      tzDate.setFullYear(year, month, day)
      tzDate.setHours(hour, minute, second, 0)
      
      // Get the offset using Intl.DateTimeFormat
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone,
        timeZoneName: 'longOffset'
      })
      
      const parts = formatter.formatToParts(date)
      const offsetPart = parts.find(part => part.type === 'timeZoneName')?.value
      
      if (offsetPart) {
        // Parse offset like "GMT+05:30" or "GMT-08:00"
        const match = offsetPart.match(/GMT([+-])(\d{2}):(\d{2})/)
        if (match) {
          const sign = match[1] === '+' ? 1 : -1
          const hours = parseInt(match[2], 10)
          const minutes = parseInt(match[3], 10)
          return sign * (hours * 60 + minutes)
        }
      }
      
      // Fallback method
      const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000)
      const localTime = new Date(utcTime + (this.getSystemTimezoneOffset(timeZone, date) * 60000))
      return Math.round((localTime.getTime() - date.getTime()) / 60000)
    } catch {
      return 0
    }
  }

  /**
   * Get system timezone offset using Date methods
   */
  private getSystemTimezoneOffset(timeZone: string, date: Date): number {
    try {
      // Create a date in the target timezone
      const utcDate = new Date(date.toISOString().slice(0, -1))
      const localDate = new Date(utcDate.toLocaleString('en-CA', { timeZone }))
      return (localDate.getTime() - utcDate.getTime()) / 60000
    } catch {
      return 0
    }
  }

  /**
   * Get time zone information by ID
   */
  private getTimeZoneInfo(tzId: string): TimeZone {
    const found = this.supportedTimeZones.find(tz => tz.id === tzId)
    if (found) {
      return found
    }

    // Create basic info for unsupported but valid time zones
    return {
      id: tzId,
      name: tzId.replace(/_/g, ' ').replace('/', ' - '),
      offset: this.getCurrentOffset(tzId),
      isDST: this.isDSTActive(tzId, new Date())
    }
  }

  /**
   * Check for DST transitions during conversion
   */
  private checkDSTTransition(dateTime: Date, fromTz: string, toTz: string): boolean {
    try {
      // Check if either time zone has DST changes around the conversion time
      const dayBefore = new Date(dateTime.getTime() - 24 * 60 * 60 * 1000)
      const dayAfter = new Date(dateTime.getTime() + 24 * 60 * 60 * 1000)

      const fromDSTBefore = this.isDSTActive(fromTz, dayBefore)
      const fromDSTCurrent = this.isDSTActive(fromTz, dateTime)
      const fromDSTAfter = this.isDSTActive(fromTz, dayAfter)

      const toDSTBefore = this.isDSTActive(toTz, dayBefore)
      const toDSTCurrent = this.isDSTActive(toTz, dateTime)
      const toDSTAfter = this.isDSTActive(toTz, dayAfter)

      return (fromDSTBefore !== fromDSTCurrent || fromDSTCurrent !== fromDSTAfter) ||
             (toDSTBefore !== toDSTCurrent || toDSTCurrent !== toDSTAfter)
    } catch {
      return false
    }
  }

  /**
   * Validate date object
   */
  private isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime())
  }

  /**
   * Check if cached data is still fresh
   */
  private isCacheFresh(timestamp: number): boolean {
    const age = Date.now() - timestamp
    return age < this.CACHE_DURATION
  }

  /**
   * Load cached data from localStorage
   */
  private loadCachedData(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (!cached) return

      const cacheData = JSON.parse(cached)
      if (cacheData && typeof cacheData === 'object') {
        Object.entries(cacheData).forEach(([key, value]: [string, any]) => {
          if (value.data && value.timestamp) {
            this.cachedTimeZoneData.set(key, value)
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load cached time zone data:', error)
      localStorage.removeItem(this.CACHE_KEY)
    }
  }

  /**
   * Save cached data to localStorage
   */
  private saveCachedData(): void {
    try {
      const cacheObject: Record<string, any> = {}
      this.cachedTimeZoneData.forEach((value, key) => {
        cacheObject[key] = value
      })
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheObject))
    } catch (error) {
      console.warn('Failed to save cached time zone data:', error)
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
      id: `timezone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
export const timeZoneService = new TimeZoneServiceImpl()