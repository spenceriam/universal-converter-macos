import * as React from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  value: string
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "warm" | "warm-outline" | "ghost"
  onCopy?: (value: string) => void
  disabled?: boolean
}

export function CopyButton({
  value,
  className,
  size = "sm",
  variant = "warm-outline",
  onCopy,
  disabled = false
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard()

  const handleCopy = React.useCallback(async () => {
    if (disabled || !value) return
    
    const success = await copy(value)
    if (success && onCopy) {
      onCopy(value)
    }
  }, [value, copy, onCopy, disabled])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleCopy}
            disabled={disabled || !value}
            className={cn(
              "transition-all duration-200",
              copied && "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200",
              className
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Copied!' : 'Copy to clipboard'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}