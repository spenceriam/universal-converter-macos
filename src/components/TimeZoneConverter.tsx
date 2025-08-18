import * as React from "react"
import { Clock, Search, AlertCircle } from "lucide-react"
import { ConversionContainer } from "./ConversionContainer"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Badge,
  NumberTicker,
  BlurFade
} from "@/components/ui"
import { timeZoneService } from "@/services/timeZoneService"
import type { TimeZone, TimeConversionResult, AppError } from "@/types"

interface TimeZoneConverterProps {
  defaultSourceTz?: string
  defaultTargetTz?: string
  onConversion?: (result: TimeConversionResult) => void
  className?: string
}

function TimeZoneConverter({
  defaultSourceTz = "America/New_York",
  defaultTargetTz = "Europe/London", 
  onConversion,
  className
}: TimeZoneConverterProps) {
  // State management
  const [sourceTimeZone, setSourceTimeZone] = React.useState<string>(defaultSourceTz)
  const [targetTimeZone, setTargetTimeZone] = React.useState<string>(defaultTargetTz)
  const [inputDateTime, setInputDateTime] = React.useState<string>("")
  const [currentTimes, setCurrentTimes] = React.useState<{
    source: Date | null
    target: Date | null
  }>({ source: null, target: null })
  const [conversionResult, setConversionResult] = React.useState<TimeConversionResult | null>(null)
  const [timeZones, setTimeZones] = React.useState<TimeZone[]>([])
  const [filteredTimeZones, setFilteredTimeZones] = React.useState<TimeZone[]>([])
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<AppError | null>(null)
  const [copyValue, setCopyValue] = React.useState<string>("")

  // Initialize time zones and current times
  React.useEffect(() => {
    const supportedTimeZones = timeZoneService.getSupportedTimeZones()
    setTimeZones(supportedTimeZones)
    setFilteredTimeZones(supportedTimeZones.slice(0, 20)) // Show first 20 initially
    
    updateCurrentTimes()
    const interval = setInterval(updateCurrentTimes, 1000) // Update every second
    
    return () => clearInterval(interval)
  }, [sourceTimeZone, targetTimeZone])

  // Update current times for both time zones
  const updateCurrentTimes = React.useCallback(async () => {
    try {
      const [sourceTime, targetTime] = await Promise.all([
        timeZoneService.getCurrentTime(sourceTimeZone),
        timeZoneService.getCurrentTime(targetTimeZone)
      ])
      
      setCurrentTimes({ source: sourceTime, target: targetTime })
      
      // Update copy value with current times
      const sourceFormatted = sourceTime.toLocaleString('en-US', {
        timeZone: sourceTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      const targetFormatted = targetTime.toLocaleString('en-US', {
        timeZone: targetTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      setCopyValue(`${sourceFormatted} (${getTimeZoneName(sourceTimeZone)}) = ${targetFormatted} (${getTimeZoneName(targetTimeZone)})`)
    } catch (err) {
      console.error('Failed to update current times:', err)
    }
  }, [sourceTimeZone, targetTimeZone])

  // Handle time zone search
  const handleTimeZoneSearch = React.useCallback((query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredTimeZones(timeZones.slice(0, 20))
      return
    }
    
    const filtered = timeZoneService.searchTimeZones(query)
    setFilteredTimeZones(filtered)
  }, [timeZones])

  // Handle specific date/time conversion
  const handleDateTimeConversion = React.useCallback(async () => {
    if (!inputDateTime) {
      setConversionResult(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const inputDate = new Date(inputDateTime)
      if (isNaN(inputDate.getTime())) {
        throw new Error('Invalid date/time format')
      }

      const result = await timeZoneService.convertTime(inputDate, sourceTimeZone, targetTimeZone)
      setConversionResult(result)
      
      if (onConversion) {
        onConversion(result)
      }

      // Update copy value with conversion result
      const sourceFormatted = result.sourceTime.toLocaleString('en-US', {
        timeZone: sourceTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      const targetFormatted = result.targetTime.toLocaleString('en-US', {
        timeZone: targetTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      
      setCopyValue(`${sourceFormatted} (${getTimeZoneName(sourceTimeZone)}) = ${targetFormatted} (${getTimeZoneName(targetTimeZone)})`)
    } catch (err) {
      const error = err as Error
      setError({
        id: `timezone_conversion_${Date.now()}`,
        type: 'CONVERSION_ERROR' as any,
        message: error.message,
        timestamp: Date.now(),
        severity: 'medium'
      })
      setConversionResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [inputDateTime, sourceTimeZone, targetTimeZone, onConversion])

  // Handle date/time input change
  React.useEffect(() => {
    if (inputDateTime) {
      handleDateTimeConversion()
    }
  }, [inputDateTime, sourceTimeZone, targetTimeZone, handleDateTimeConversion])

  // Get time zone display name
  const getTimeZoneName = (tzId: string): string => {
    const tz = timeZones.find(t => t.id === tzId)
    return tz?.name || tzId.replace(/_/g, ' ')
  }

  // Get DST status for a time zone
  const getDSTStatus = (tzId: string, date: Date = new Date()): boolean => {
    return timeZoneService.isDSTActive(tzId, date)
  }

  // Format time for display
  const formatTime = (date: Date | null, timeZone: string): string => {
    if (!date) return "--:--:--"
    
    return date.toLocaleString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  // Format date for display
  const formatDate = (date: Date | null, timeZone: string): string => {
    if (!date) return "----/--/--"
    
    return date.toLocaleDateString('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const handleCopy = React.useCallback((value: string) => {
    // Copy functionality is handled by ConversionContainer
  }, [])

  return (
    <ConversionContainer
      title="Time Zone Converter"
      onCopy={handleCopy}
      copyValue={copyValue}
      isLoading={isLoading}
      error={error?.message}
      className={className}
    >
      <div className="space-y-6">
        {/* Time Zone Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source Time Zone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              From Time Zone
            </label>
            <Select value={sourceTimeZone} onValueChange={setSourceTimeZone}>
              <SelectTrigger className="focus:ring-amber-500 focus:border-amber-500">
                <SelectValue placeholder="Select source time zone" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search time zones..."
                      value={searchQuery}
                      onChange={(e) => handleTimeZoneSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {filteredTimeZones.map((tz) => (
                  <SelectItem key={tz.id} value={tz.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{tz.name}</span>
                      {getDSTStatus(tz.id) && (
                        <Badge variant="warning" className="ml-2 text-xs">
                          DST
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Time Zone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              To Time Zone
            </label>
            <Select value={targetTimeZone} onValueChange={setTargetTimeZone}>
              <SelectTrigger className="focus:ring-amber-500 focus:border-amber-500">
                <SelectValue placeholder="Select target time zone" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search time zones..."
                      value={searchQuery}
                      onChange={(e) => handleTimeZoneSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {filteredTimeZones.map((tz) => (
                  <SelectItem key={tz.id} value={tz.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{tz.name}</span>
                      {getDSTStatus(tz.id) && (
                        <Badge variant="warning" className="ml-2 text-xs">
                          DST
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Live Clocks Display */}
        <BlurFade delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source Time Zone Clock */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-800">
                    {getTimeZoneName(sourceTimeZone)}
                  </h3>
                </div>
                {getDSTStatus(sourceTimeZone) && (
                  <Badge variant="warning" className="bg-yellow-100 text-yellow-800">
                    DST Active
                  </Badge>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-gray-900 mb-2">
                  <NumberTicker 
                    value={formatTime(currentTimes.source, sourceTimeZone)}
                    format="time"
                    animate={false}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(currentTimes.source, sourceTimeZone)}
                </div>
              </div>
            </div>

            {/* Target Time Zone Clock */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-800">
                    {getTimeZoneName(targetTimeZone)}
                  </h3>
                </div>
                {getDSTStatus(targetTimeZone) && (
                  <Badge variant="warning" className="bg-yellow-100 text-yellow-800">
                    DST Active
                  </Badge>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-gray-900 mb-2">
                  <NumberTicker 
                    value={formatTime(currentTimes.target, targetTimeZone)}
                    format="time"
                    animate={false}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(currentTimes.target, targetTimeZone)}
                </div>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Specific Date/Time Conversion */}
        <BlurFade delay={0.3}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Convert Specific Date & Time
            </h3>
            
            <div className="space-y-2">
              <label htmlFor="datetime-input" className="text-sm font-medium text-gray-700">
                Date and Time (in {getTimeZoneName(sourceTimeZone)})
              </label>
              <Input
                id="datetime-input"
                type="datetime-local"
                value={inputDateTime}
                onChange={(e) => setInputDateTime(e.target.value)}
                className="focus:ring-amber-500 focus:border-amber-500"
                placeholder="Select date and time"
              />
            </div>

            {/* Conversion Result */}
            {conversionResult && (
              <BlurFade delay={0.1}>
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Source Time</div>
                      <div className="font-mono text-lg font-semibold text-gray-900">
                        {conversionResult.sourceTime.toLocaleString('en-US', {
                          timeZone: sourceTimeZone,
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTimeZoneName(sourceTimeZone)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Converted Time</div>
                      <div className="font-mono text-lg font-semibold text-gray-900">
                        {conversionResult.targetTime.toLocaleString('en-US', {
                          timeZone: targetTimeZone,
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTimeZoneName(targetTimeZone)}
                      </div>
                    </div>
                  </div>
                  
                  {conversionResult.isDSTTransition && (
                    <div className="mt-3 flex items-center space-x-2 text-amber-700 bg-amber-100 rounded-md p-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        DST transition may affect this conversion
                      </span>
                    </div>
                  )}
                </div>
              </BlurFade>
            )}
          </div>
        </BlurFade>
      </div>
    </ConversionContainer>
  )
}

export default TimeZoneConverter