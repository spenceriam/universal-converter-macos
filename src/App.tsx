import { Layout, ErrorBoundary, UnitConverter, CurrencyConverter, TimeZoneConverter } from "@/components"
import { ConversionTypeNav } from "@/components/ConversionTypeNav"
import { GradientText, BlurFade, GridPattern } from "@/components/ui"
import { Badge } from "@/components/ui/badge"
import { AppProvider, useConversionType, useOnlineStatus, useAppErrors } from "@/contexts/AppContext"
import { ThemeProvider } from "@/components/ThemeProvider"

// Component to render the active converter
function ActiveConverter() {
  const [currentType] = useConversionType()
  
  const renderConverter = () => {
    switch (currentType) {
      case 'units':
        return <UnitConverter />
      case 'currency':
        return <CurrencyConverter />
      case 'timezone':
        return <TimeZoneConverter />
      default:
        return <UnitConverter />
    }
  }

  return (
    <BlurFade key={currentType} delay={0.2} className="w-full">
      {renderConverter()}
    </BlurFade>
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
      <Layout>
        {/* Background enhancements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <GridPattern
            width={80}
            height={80}
            className="absolute inset-0 opacity-10 dark:opacity-5"
            strokeDasharray="4,4"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/3 via-transparent to-orange-500/3" />
        </div>

        {/* Header section */}
        <div className="relative z-10 text-center mb-8">
          <BlurFade delay={0.1}>
            <GradientText className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600">
              Universal Converter
            </GradientText>
          </BlurFade>
          
          <BlurFade delay={0.2}>
            <p className="text-warm-600 dark:text-warm-400 text-lg mb-6">
              Convert units, currencies, and time zones with precision and ease
            </p>
          </BlurFade>
        </div>

        {/* Status indicators */}
        <StatusIndicators />

        {/* Navigation */}
        <div className="mb-8">
          <ConversionTypeNav />
        </div>

        {/* Active converter */}
        <div className="max-w-4xl mx-auto">
          <ActiveConverter />
        </div>

        {/* Footer info */}
        <BlurFade delay={0.5}>
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-warm-100/50 dark:bg-warm-800/30 rounded-full border border-warm-200/50 dark:border-warm-700/50">
              <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse" />
              <span className="text-xs text-warm-600 dark:text-warm-400">
                Real-time conversions with warm, accessible design
              </span>
            </div>
          </div>
        </BlurFade>
      </Layout>
    </ErrorBoundary>
  )
}

// Root App component with providers
function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="universal-converter-theme">
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  )
}

export default App
