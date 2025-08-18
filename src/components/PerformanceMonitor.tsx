import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PerformanceMonitor } from "@/utils/performance"

interface PerformanceMetrics {
  [key: string]: {
    average: number
    count: number
    latest: number
  }
}

interface PerformanceMonitorProps {
  isVisible?: boolean
  onToggle?: () => void
}

export function PerformanceMonitorComponent({ 
  isVisible = false, 
  onToggle 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({})
  const [isEnabled, setIsEnabled] = React.useState(false)

  // Update metrics every 2 seconds when visible
  React.useEffect(() => {
    if (!isVisible || !isEnabled) return

    const interval = setInterval(() => {
      setMetrics(PerformanceMonitor.getMetrics())
    }, 2000)

    return () => clearInterval(interval)
  }, [isVisible, isEnabled])

  // Memory usage monitoring
  const [memoryInfo, setMemoryInfo] = React.useState<{
    used: number
    total: number
  } | null>(null)

  React.useEffect(() => {
    if (!isVisible || !isEnabled) return

    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryInfo({
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024)
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 3000)
    return () => clearInterval(interval)
  }, [isVisible, isEnabled])

  const handleClearMetrics = () => {
    PerformanceMonitor.clearMetrics()
    setMetrics({})
  }

  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
    if (ms < 1000) return `${ms.toFixed(1)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getPerformanceColor = (ms: number) => {
    if (ms < 50) return "bg-green-500"
    if (ms < 100) return "bg-yellow-500"
    if (ms < 500) return "bg-orange-500"
    return "bg-red-500"
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm border-amber-200 hover:bg-amber-50"
        >
          📊 Performance
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="p-4 bg-white/95 backdrop-blur-sm border-amber-200 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-800">Performance Monitor</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsEnabled(!isEnabled)}
              variant={isEnabled ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              {isEnabled ? "Enabled" : "Disabled"}
            </Button>
            <Button onClick={onToggle} variant="ghost" size="sm" className="text-xs">
              ✕
            </Button>
          </div>
        </div>

        {isEnabled && (
          <>
            {/* Memory Usage */}
            {memoryInfo && (
              <div className="mb-3 p-2 bg-gray-50 rounded">
                <div className="text-xs font-medium text-gray-600 mb-1">Memory Usage</div>
                <div className="text-xs text-gray-800">
                  {memoryInfo.used}MB / {memoryInfo.total}MB
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(memoryInfo.used / memoryInfo.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(metrics).length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No performance data yet
                </div>
              ) : (
                Object.entries(metrics).map(([name, data]) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 truncate flex-1">
                      {name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-white text-xs px-1.5 py-0.5 ${getPerformanceColor(data.average)}`}
                      >
                        {formatTime(data.average)}
                      </Badge>
                      <span className="text-gray-500 text-xs">
                        ({data.count})
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
              <Button
                onClick={handleClearMetrics}
                variant="outline"
                size="sm"
                className="text-xs flex-1"
              >
                Clear
              </Button>
              <Button
                onClick={() => setMetrics(PerformanceMonitor.getMetrics())}
                variant="outline"
                size="sm"
                className="text-xs flex-1"
              >
                Refresh
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// Hook for easy integration
export function usePerformanceMonitor() {
  const [isVisible, setIsVisible] = React.useState(false)

  // Enable in development or when explicitly requested
  React.useEffect(() => {
    const isDev = import.meta.env.DEV
    const enablePerf = localStorage.getItem('enable-performance-monitor') === 'true'
    
    if (isDev || enablePerf) {
      // Add keyboard shortcut to toggle
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
          setIsVisible(prev => !prev)
        }
      }

      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  return {
    isVisible,
    toggle: () => setIsVisible(prev => !prev),
    PerformanceMonitor: PerformanceMonitorComponent
  }
}