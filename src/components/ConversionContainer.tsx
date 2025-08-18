import * as React from "react"
import { Copy, Check, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { cn } from "@/lib/utils"

interface ConversionContainerProps {
  title: string
  children: React.ReactNode
  onCopy?: (value: string) => void
  copyValue?: string
  isLoading?: boolean
  className?: string
  error?: string | null
}

export function ConversionContainer({
  title,
  children,
  onCopy,
  copyValue,
  isLoading = false,
  className,
  error
}: ConversionContainerProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(async () => {
    if (!copyValue || !onCopy) return

    try {
      await navigator.clipboard.writeText(copyValue)
      onCopy(copyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }, [copyValue, onCopy])

  return (
    <TooltipProvider>
      <BlurFade delay={0.1}>
        <Card className={cn(
          "w-full max-w-2xl mx-auto shadow-warm-lg border-warm-200/50 bg-gradient-to-br from-warm-50/50 to-amber-50/30",
          className
        )}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">
                <GradientText from="from-amber-600" to="to-orange-600">
                  {title}
                </GradientText>
              </CardTitle>
              
              {copyValue && onCopy && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="warm-outline"
                      size="sm"
                      onClick={handleCopy}
                      disabled={isLoading || !copyValue}
                      className="ml-2"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copied ? 'Copied!' : 'Copy result'}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                <span className="ml-2 text-muted-foreground">Loading...</span>
              </div>
            )}
            
            {!isLoading && !error && children}
          </CardContent>
        </Card>
      </BlurFade>
    </TooltipProvider>
  )
}