import * as React from "react"
import { Calculator, DollarSign, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/ui/blur-fade"
import type { ConversionType } from "@/types"
import { useConversionType, useOnlineStatus } from "@/contexts/AppContext"
import { cn } from "@/lib/utils"

interface ConversionTypeOption {
  type: ConversionType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  requiresOnline?: boolean
}

const conversionTypes: ConversionTypeOption[] = [
  {
    type: 'units',
    label: 'Units',
    icon: Calculator,
    description: 'Convert between different units of measurement',
    requiresOnline: false
  },
  {
    type: 'currency',
    label: 'Currency',
    icon: DollarSign,
    description: 'Convert currencies with live exchange rates',
    requiresOnline: true
  },
  {
    type: 'timezone',
    label: 'Time Zones',
    icon: Clock,
    description: 'Convert times between different time zones',
    requiresOnline: false
  }
]

interface ConversionTypeNavProps {
  className?: string
}

export function ConversionTypeNav({ className }: ConversionTypeNavProps) {
  const [currentType, setConversionType] = useConversionType()
  const isOnline = useOnlineStatus()

  return (
    <div className={cn("w-full", className)}>
      <BlurFade delay={0.2}>
        <div 
          className="flex flex-col sm:flex-row gap-3 p-1 bg-warm-100/50 dark:bg-warm-800/30 rounded-xl border border-warm-200/50 dark:border-warm-700/50 backdrop-blur-sm"
          role="tablist"
          aria-label="Conversion type selection"
        >
          {conversionTypes.map((option, index) => {
            const Icon = option.icon
            const isActive = currentType === option.type
            const isDisabled = option.requiresOnline && !isOnline
            
            return (
              <BlurFade key={option.type} delay={0.3 + index * 0.1}>
                <div className="flex-1 relative">
                  <Button
                    variant={isActive ? "warm" : "ghost"}
                    size="lg"
                    onClick={() => setConversionType(option.type)}
                    disabled={isDisabled}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${option.type}-converter-panel`}
                    aria-describedby={`${option.type}-description`}
                    aria-label={`${option.label} converter${isDisabled ? ' (offline)' : ''}`}
                    className={cn(
                      "w-full h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200",
                      "hover:scale-105 hover:shadow-warm focus:scale-105 focus:shadow-warm",
                      isActive && "shadow-warm ring-2 ring-amber-500/20",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon 
                        className={cn(
                          "h-5 w-5",
                          isActive ? "text-white" : "text-amber-600 dark:text-amber-400"
                        )}
                        aria-hidden="true"
                      />
                      <span className={cn(
                        "font-semibold",
                        isActive ? "text-white" : "text-warm-900 dark:text-warm-100"
                      )}>
                        {option.label}
                      </span>
                      {isDisabled && (
                        <Badge variant="secondary" className="text-xs" aria-label="Requires internet connection">
                          Offline
                        </Badge>
                      )}
                    </div>
                    <p 
                      id={`${option.type}-description`}
                      className={cn(
                        "text-xs text-center leading-tight",
                        isActive ? "text-white/90" : "text-warm-600 dark:text-warm-400"
                      )}
                    >
                      {option.description}
                    </p>
                  </Button>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div 
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </BlurFade>
            )
          })}
        </div>
      </BlurFade>
      
      {/* Offline indicator */}
      {!isOnline && (
        <BlurFade delay={0.6}>
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                You're offline - some features may be limited
              </span>
            </div>
          </div>
        </BlurFade>
      )}
    </div>
  )
}