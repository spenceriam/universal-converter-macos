import * as React from "react"
import { Wifi, WifiOff, Clock, RefreshCw, AlertTriangle } from "lucide-react"
import { ConversionContainer } from "./ConversionContainer"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { currencyService } from "@/services/currencyService"
import type { Currency, CurrencyConversionResult, AppError } from "@/types"
import { ErrorType } from "@/types"
import { cn } from "@/lib/utils"

interface CurrencyConverterProps {
  defaultBaseCurrency?: string
  onConversion?: (result: CurrencyConversionResult) => void
  className?: string
}

export function CurrencyConverter({
  defaultBaseCurrency = 'USD',
  onConversion,
  className
}: CurrencyConverterProps) {
  // State management
  const [amount, setAmount] = React.useState<string>('1')
  const [fromCurrency, setFromCurrency] = React.useState<string>(defaultBaseCurrency)
  const [toCurrency, setToCurrency] = React.useState<string>('EUR')
  const [result, setResult] = React.useState<CurrencyConversionResult | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<AppError | null>(null)
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine)
  const [lastUpdateTime, setLastUpdateTime] = React.useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false)

  // Get supported currencies
  const supportedCurrencies = React.useMemo(() => {
    return currencyService.getSupportedCurrencies()
  }, [])

  // Auto-update interval ref
  const updateIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Online status monitoring
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Perform currency conversion
  const performConversion = React.useCallback(async (
    inputAmount: string,
    from: string,
    to: string,
    showLoading = true
  ) => {
    const numericAmount = parseFloat(inputAmount)
    
    // Validate input
    if (!inputAmount || isNaN(numericAmount) || numericAmount < 0) {
      setResult(null)
      setError(null)
      return
    }

    if (showLoading) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const conversionResult = await currencyService.convertCurrency(numericAmount, from, to)
      setResult(conversionResult)
      setLastUpdateTime(new Date(conversionResult.timestamp))
      
      // Call callback if provided
      if (onConversion) {
        onConversion(conversionResult)
      }
    } catch (err) {
      const appError = err as AppError
      setError(appError)
      setResult(null)
      console.error('Currency conversion failed:', appError)
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [onConversion])

  // Handle amount input change
  const handleAmountChange = React.useCallback((value: string) => {
    setAmount(value)
    
    // Debounce conversion to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      performConversion(value, fromCurrency, toCurrency)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [fromCurrency, toCurrency, performConversion])

  // Handle currency selection changes
  const handleFromCurrencyChange = React.useCallback((currency: string) => {
    setFromCurrency(currency)
    if (amount) {
      performConversion(amount, currency, toCurrency)
    }
  }, [amount, toCurrency, performConversion])

  const handleToCurrencyChange = React.useCallback((currency: string) => {
    setToCurrency(currency)
    if (amount) {
      performConversion(amount, fromCurrency, currency)
    }
  }, [amount, fromCurrency, performConversion])

  // Manual refresh rates
  const handleRefreshRates = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Force fresh rates by clearing cache temporarily
      const freshRates = await currencyService.getExchangeRates(fromCurrency)
      setLastUpdateTime(new Date(freshRates.timestamp))
      
      // Re-perform conversion with fresh rates
      if (amount) {
        await performConversion(amount, fromCurrency, toCurrency, false)
      }
    } catch (err) {
      const appError = err as AppError
      setError(appError)
    } finally {
      setIsRefreshing(false)
    }
  }, [amount, fromCurrency, toCurrency, performConversion])

  // Swap currencies
  const handleSwapCurrencies = React.useCallback(() => {
    const newFrom = toCurrency
    const newTo = fromCurrency
    
    setFromCurrency(newFrom)
    setToCurrency(newTo)
    
    if (amount) {
      performConversion(amount, newFrom, newTo)
    }
  }, [amount, fromCurrency, toCurrency, performConversion])

  // Initial conversion on mount
  React.useEffect(() => {
    if (amount) {
      performConversion(amount, fromCurrency, toCurrency)
    }
  }, []) // Only run on mount

  // Auto-update rates every 5 minutes when online
  React.useEffect(() => {
    if (isOnline) {
      updateIntervalRef.current = setInterval(() => {
        handleRefreshRates()
      }, 5 * 60 * 1000) // 5 minutes
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [isOnline, handleRefreshRates])

  // Get rate freshness status
  const getRateFreshness = React.useCallback(() => {
    if (!lastUpdateTime) return { status: 'unknown', text: 'No data' }
    
    const now = Date.now()
    const updateTime = lastUpdateTime.getTime()
    const ageMinutes = Math.floor((now - updateTime) / (1000 * 60))
    
    if (ageMinutes < 60) {
      return { 
        status: 'fresh', 
        text: `${ageMinutes}m ago`,
        variant: 'success' as const
      }
    } else if (ageMinutes < 24 * 60) {
      const ageHours = Math.floor(ageMinutes / 60)
      return { 
        status: 'stale', 
        text: `${ageHours}h ago`,
        variant: 'warning' as const
      }
    } else {
      const ageDays = Math.floor(ageMinutes / (24 * 60))
      return { 
        status: 'very_stale', 
        text: `${ageDays}d ago`,
        variant: 'destructive' as const
      }
    }
  }, [lastUpdateTime])

  const rateFreshness = getRateFreshness()

  // Format copy value
  const copyValue = React.useMemo(() => {
    if (!result) return ''
    return `${amount} ${fromCurrency} = ${result.formattedAmount}`
  }, [result, amount, fromCurrency])

  return (
    <TooltipProvider>
      <ConversionContainer
        title="Currency Converter"
        copyValue={copyValue}
        onCopy={() => {}}
        isLoading={isLoading}
        error={error?.message || null}
        className={className}
      >
        <div className="space-y-6">
          {/* Connection Status & Rate Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-emerald-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-muted-foreground">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {lastUpdateTime && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <Badge variant={rateFreshness.variant} className="text-xs">
                        {rateFreshness.text}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Last updated: {lastUpdateTime.toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshRates}
                    disabled={!isOnline || isRefreshing}
                    className="h-8 w-8 p-0"
                    aria-label="Refresh exchange rates"
                  >
                    <RefreshCw className={cn(
                      "h-3 w-3",
                      isRefreshing && "animate-spin"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh exchange rates</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Offline Warning */}
          {!isOnline && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                Using cached exchange rates. Connect to internet for latest rates.
              </span>
            </div>
          )}

          {/* Stale Data Warning */}
          {result?.isStale && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Exchange rates may be outdated. Refresh for latest rates.
              </span>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <label htmlFor="amount-input" className="text-sm font-medium text-foreground">
              Amount
            </label>
            <Input
              id="amount-input"
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="0.01"
              className="text-lg font-medium focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Currency Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                From
              </label>
              <Select value={fromCurrency} onValueChange={handleFromCurrencyChange}>
                <SelectTrigger className="focus:ring-amber-500 focus:border-amber-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedCurrencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        {currency.flag && <span>{currency.flag}</span>}
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-muted-foreground">
                          {currency.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                To
              </label>
              <div className="flex gap-2">
                <Select value={toCurrency} onValueChange={handleToCurrencyChange}>
                  <SelectTrigger className="focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedCurrencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          {currency.flag && <span>{currency.flag}</span>}
                          <span className="font-medium">{currency.code}</span>
                          <span className="text-muted-foreground">
                            {currency.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSwapCurrencies}
                      className="px-3"
                      aria-label="Swap currencies"
                    >
                      ⇄
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Swap currencies</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Conversion Result */}
          {result && !error && (
            <div className="space-y-4 p-4 rounded-lg bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200/50">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-900">
                  <AnimatedNumber 
                    value={result.amount} 
                    precision={6}
                    className="font-mono"
                  />
                </div>
                <div className="text-lg text-muted-foreground mt-1">
                  {result.formattedAmount}
                </div>
              </div>

              {/* Exchange Rate Info */}
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>Rate:</span>
                  <span className="font-medium">
                    1 {fromCurrency} = {result.rate.toFixed(6)} {toCurrency}
                  </span>
                </div>
                
                {result.isStale && (
                  <Badge variant="warning" className="text-xs">
                    Stale
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </ConversionContainer>
    </TooltipProvider>
  )
}