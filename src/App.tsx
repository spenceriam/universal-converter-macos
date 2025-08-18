import * as React from "react"
import { Layout, ErrorBoundary } from "@/components"
import { ConversionTypeNav } from "@/components/ConversionTypeNav"
import { GradientText, BlurFade, GridPattern } from "@/components/ui"
import { Badge } from "@/components/ui/badge"
import { AppProvider, useConversionType, useOnlineStatus, useAppErrors } from "@/contexts/AppContext"
import { ThemeProvider } from "@/components/ThemeProvider"
import { SkipLinks } from "@/components/SkipLinks"
import { FocusManager } from "@/components/FocusManager"
import { useScreenReader } from "@/hooks/useAccessibility"
import { usePerformanceMonitor } from "@/components/PerformanceMonitor"
import { useServiceWorker } from "@/utils/serviceWorker"

// Lazy load conversion components for better performance
const UnitConverter = React.lazy(() => import("@/components/UnitConverter"))
const CurrencyConverter = React.lazy(() => import("@/components/CurrencyConverter"))
const TimeZoneConverter = React.lazy(() => import("@/components/TimeZoneConverter"))

// Component to render the active converter
function ActiveConverter() {
  const [currentType] = useConversionType()
  const { announce } = useScreenReader()
  
  // Announce converter type changes
  React.useEffect(() => {
    const converterNames = {
      units: 'Unit Converter',
      currency: 'Currency Converter', 
      timezone: 'Time Zone Converter'
    }
    announce(`Switched to ${converterNames[currentType]}`)
  }, [currentType, announce])
  
  const renderConverter = () => {
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="ml-3 text-warm-600 dark:text-warm-400">Loading converter...</span>
        </div>
      }>
        {currentType === 'units' && <UnitConverter />}
        {currentType === 'currency' && <CurrencyConverter />}
        {currentType === 'timezone' && <TimeZoneConverter />}
      </React.Suspense>
    )
  }

  return (
    <FocusManager autoFocus={false} className="w-full">
      <BlurFade key={currentType} delay={0.2} className="w-full">
        <main id="main-content" role="main" aria-label={`${currentType} converter`}>
          {renderConverter()}
        </main>
      </BlurFade>
    </FocusManager>
  )
}

// Status indicators component
function StatusIndicators() {
  const isOnline = useOnlineStatus()
  const { errors } = useAppErrors()

  if (!isOnline || errors.length > 0) {
    return (
      <BlurFade delay={0.1}>
        <div className="mb-4 space-y-2">
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                Offline mode - some features may be limited
              </span>
            </div>
          )}
          
          {errors.length > 0 && (
            <div className="flex items-center justify-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <Badge variant="destructive" className="text-xs">
                {errors.length} error{errors.length > 1 ? 's' : ''}
              </Badge>
              <span className="text-sm text-red-800 dark:text-red-200">
                {errors[0]?.message || 'An error occurred'}
              </span>
            </div>
          )}
        </div>
      </BlurFade>
    )
  }

  return null
}

// Main app content component
function AppContent() {
  return (
    <ErrorBoundary>
      <SkipLinks />
      <Layout>
        {/* Background enhancements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <GridPattern
            width={80}
            height={80}
            className="absolute inset-0 opacity-10 dark:opacity-5"
            strokeDasharray="4,4"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/3 via-transparent to-orange-500/3" />
        </div>

        {/* Header section */}
        <header className="relative z-10 text-center mb-8" role="banner">
          <BlurFade delay={0.1}>
            <h1 className="sr-only">Universal Converter - Convert units, currencies, and time zones</h1>
            <GradientText 
              className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600"
              aria-hidden="true"
            >
              Universal Converter
            </GradientText>
          </BlurFade>
          
          <BlurFade delay={0.2}>
            <p className="text-warm-600 dark:text-warm-400 text-lg mb-6">
              Convert units, currencies, and time zones with precision and ease
            </p>
          </BlurFade>
        </header>

        {/* Status indicators */}
        <div role="status" aria-live="polite">
          <StatusIndicators />
        </div>

        {/* Navigation */}
        <nav 
          id="conversion-nav" 
          className="mb-8" 
          role="navigation" 
          aria-label="Conversion type selection"
        >
          <ConversionTypeNav />
        </nav>

        {/* Active converter */}
        <div className="max-w-4xl mx-auto" id="conversion-form">
          <ActiveConverter />
        </div>

        {/* Footer info */}
        <footer className="mt-12 text-center" role="contentinfo">
          <BlurFade delay={0.5}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-warm-100/50 dark:bg-warm-800/30 rounded-full border border-warm-200/50 dark:border-warm-700/50">
              <div 
                className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse" 
                aria-hidden="true"
              />
              <span className="text-xs text-warm-600 dark:text-warm-400">
                Real-time conversions with warm, accessible design
              </span>
            </div>
          </BlurFade>
        </footer>
      </Layout>
    </ErrorBoundary>
  )
}

// Root App component with providers
function App() {
  const { isVisible, toggle, PerformanceMonitor } = usePerformanceMonitor()
  
  // Initialize service worker for offline functionality
  const { updateAvailable, updateServiceWorker } = useServiceWorker({
    onUpdate: () => {
      console.log('New app version available')
    },
    onSuccess: () => {
      console.log('App is ready for offline use')
    }
  })

  // Show update notification if available
  React.useEffect(() => {
    if (updateAvailable) {
      const shouldUpdate = window.confirm(
        'A new version of the app is available. Would you like to update now?'
      )
      if (shouldUpdate) {
        updateServiceWorker()
      }
    }
  }, [updateAvailable, updateServiceWorker])

  return (
    <ThemeProvider defaultTheme="system" storageKey="universal-converter-theme">
      <AppProvider>
        <AppContent />
        <PerformanceMonitor isVisible={isVisible} onToggle={toggle} />
      </AppProvider>
    </ThemeProvider>
  )
}

export default App
