import * as React from "react"
import { Settings, Type, Eye, Zap, Volume2, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAccessibility, type FontSize, type ContrastMode, type MotionPreference } from "@/hooks/useAccessibility"
import { cn } from "@/lib/utils"

interface AccessibilitySettingsProps {
  className?: string
}

export function AccessibilitySettings({ className }: AccessibilitySettingsProps) {
  const {
    fontSize,
    contrastMode,
    motionPreference,
    announceChanges,
    keyboardNavigation,
    isKeyboardUser,
    reducedMotion,
    highContrast,
    setFontSize,
    setContrastMode,
    setMotionPreference,
    toggleAnnounceChanges,
    toggleKeyboardNavigation
  } = useAccessibility()

  const [isOpen, setIsOpen] = React.useState(false)

  const fontSizeOptions: { value: FontSize; label: string; description: string }[] = [
    { value: 'small', label: 'Small', description: 'Compact text for more content' },
    { value: 'medium', label: 'Medium', description: 'Standard text size' },
    { value: 'large', label: 'Large', description: 'Larger text for better readability' },
    { value: 'extra-large', label: 'Extra Large', description: 'Maximum text size' }
  ]

  const contrastOptions: { value: ContrastMode; label: string; description: string }[] = [
    { value: 'normal', label: 'Normal', description: 'Standard contrast levels' },
    { value: 'high', label: 'High', description: 'Enhanced contrast for better visibility' }
  ]

  const motionOptions: { value: MotionPreference; label: string; description: string }[] = [
    { value: 'no-preference', label: 'Normal', description: 'Full animations and transitions' },
    { value: 'reduce', label: 'Reduced', description: 'Minimal animations for comfort' }
  ]

  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "relative",
                  isKeyboardUser && "ring-2 ring-amber-500 ring-offset-2",
                  className
                )}
                aria-label="Open accessibility settings"
              >
                <Settings className="h-4 w-4" />
                {(fontSize !== 'medium' || contrastMode !== 'normal' || motionPreference !== 'no-preference') && (
                  <Badge 
                    variant="warm" 
                    className="absolute -top-1 -right-1 h-2 w-2 p-0 rounded-full"
                    aria-label="Accessibility settings active"
                  />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Accessibility Settings</p>
            </TooltipContent>
          </Tooltip>
        </SheetTrigger>

        <SheetContent 
          side="right" 
          className="w-full sm:w-96 overflow-y-auto"
          aria-describedby="accessibility-settings-description"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Accessibility Settings
            </SheetTitle>
            <SheetDescription id="accessibility-settings-description">
              Customize the interface to meet your accessibility needs. Changes are saved automatically.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Font Size Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Text Size
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger 
                    className="focus:ring-amber-500 focus:border-amber-500"
                    aria-label="Select text size"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="text-sm text-muted-foreground">
                  Preview: <span className={cn(
                    fontSize === 'small' && 'text-sm',
                    fontSize === 'medium' && 'text-base',
                    fontSize === 'large' && 'text-lg',
                    fontSize === 'extra-large' && 'text-xl'
                  )}>
                    Sample text at {fontSize} size
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Contrast Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Contrast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={contrastMode} onValueChange={setContrastMode}>
                  <SelectTrigger 
                    className="focus:ring-amber-500 focus:border-amber-500"
                    aria-label="Select contrast mode"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contrastOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {highContrast && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <Badge variant="warm" className="text-xs">Active</Badge>
                    High contrast mode is enabled
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Motion Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Animations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={motionPreference} onValueChange={setMotionPreference}>
                  <SelectTrigger 
                    className="focus:ring-amber-500 focus:border-amber-500"
                    aria-label="Select animation preference"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {motionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {reducedMotion && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <Badge variant="warm" className="text-xs">Active</Badge>
                    Reduced motion is enabled
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Screen Reader Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Screen Reader
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">Announce Changes</div>
                    <div className="text-sm text-muted-foreground">
                      Announce conversion results and status updates
                    </div>
                  </div>
                  <Button
                    variant={announceChanges ? "warm" : "outline"}
                    size="sm"
                    onClick={toggleAnnounceChanges}
                    aria-pressed={announceChanges}
                    aria-label={`${announceChanges ? 'Disable' : 'Enable'} screen reader announcements`}
                  >
                    {announceChanges ? 'On' : 'Off'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Navigation Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Keyboard className="h-4 w-4" />
                  Keyboard Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">Enhanced Focus</div>
                    <div className="text-sm text-muted-foreground">
                      Enhanced keyboard navigation and focus indicators
                    </div>
                  </div>
                  <Button
                    variant={keyboardNavigation ? "warm" : "outline"}
                    size="sm"
                    onClick={toggleKeyboardNavigation}
                    aria-pressed={keyboardNavigation}
                    aria-label={`${keyboardNavigation ? 'Disable' : 'Enable'} enhanced keyboard navigation`}
                  >
                    {keyboardNavigation ? 'On' : 'Off'}
                  </Button>
                </div>
                
                {isKeyboardUser && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">
                      Detected
                    </Badge>
                    Keyboard navigation is active
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts Help */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Tab</div>
                  <div className="text-muted-foreground">Navigate forward</div>
                  
                  <div className="font-medium">Shift + Tab</div>
                  <div className="text-muted-foreground">Navigate backward</div>
                  
                  <div className="font-medium">Enter/Space</div>
                  <div className="text-muted-foreground">Activate button</div>
                  
                  <div className="font-medium">Escape</div>
                  <div className="text-muted-foreground">Close dialog</div>
                  
                  <div className="font-medium">Arrow Keys</div>
                  <div className="text-muted-foreground">Navigate options</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}