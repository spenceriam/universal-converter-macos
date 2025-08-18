import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "./ThemeProvider"
import { useApp } from "@/contexts/AppContext"
import type { ThemeMode } from "@/types"
import { cn } from "@/lib/utils"

const themeOptions: Array<{
  value: ThemeMode
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Light theme with warm colors'
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Dark theme with warm accents'
  },
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Follow system preference'
  }
]

export function ThemeToggle() {
  const { theme, setTheme: setProviderTheme } = useTheme()
  const { setTheme: setAppTheme } = useApp()

  const currentThemeOption = themeOptions.find(option => option.value === theme) || themeOptions[2]
  const CurrentIcon = currentThemeOption.icon

  const handleThemeChange = (newTheme: ThemeMode) => {
    setProviderTheme(newTheme)
    setAppTheme(newTheme)
  }

  // Cycle through themes on click
  const handleQuickToggle = () => {
    const currentIndex = themeOptions.findIndex(option => option.value === theme)
    const nextIndex = (currentIndex + 1) % themeOptions.length
    const nextTheme = themeOptions[nextIndex].value
    handleThemeChange(nextTheme)
  }

  return (
    <TooltipProvider>
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleQuickToggle}
              className={cn(
                "relative h-9 w-9 rounded-lg transition-all duration-200",
                "hover:bg-warm-100 dark:hover:bg-warm-800",
                "border border-warm-200/50 dark:border-warm-700/50",
                "shadow-sm hover:shadow-warm"
              )}
            >
              <CurrentIcon className={cn(
                "h-4 w-4 transition-all duration-200",
                theme === 'light' && "text-amber-600",
                theme === 'dark' && "text-amber-400", 
                theme === 'system' && "text-amber-500"
              )} />
              <span className="sr-only">Toggle theme - Current: {currentThemeOption.label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-warm-900 text-warm-100 border-warm-700">
            <div className="flex items-center gap-2">
              <CurrentIcon className="h-3 w-3" />
              <span className="text-xs">{currentThemeOption.description}</span>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Theme indicator badge */}
        <Badge
          variant="secondary"
          className={cn(
            "absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] font-medium",
            "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
            "border-0 shadow-sm"
          )}
        >
          {theme === 'light' ? 'L' : theme === 'dark' ? 'D' : 'S'}
        </Badge>
      </div>
    </TooltipProvider>
  )
}