import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number | string
  className?: string
  precision?: number
  format?: 'number' | 'time' | 'currency'
  currency?: string
  animate?: boolean
}

export function NumberTicker({ 
  value, 
  className, 
  precision = 0,
  format = 'number',
  currency = 'USD',
  animate = true
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value
  
  const spring = useSpring(numericValue, { 
    mass: 0.8, 
    stiffness: 75, 
    damping: 15 
  })
  
  const display = useTransform(spring, (current) => {
    if (format === 'time') {
      // For time format, don't animate - just update directly
      return value
    }
    
    if (format === 'currency') {
      const rounded = Math.round(current * Math.pow(10, precision)) / Math.pow(10, precision)
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      }).format(rounded)
    }
    
    const rounded = Math.round(current * Math.pow(10, precision)) / Math.pow(10, precision)
    return rounded.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    })
  })

  useEffect(() => {
    if (animate && format !== 'time') {
      spring.set(numericValue)
    } else {
      setDisplayValue(value)
    }
  }, [spring, numericValue, value, animate, format])

  if (!animate || format === 'time') {
    return (
      <span className={cn("tabular-nums", className)}>
        {format === 'time' ? value : displayValue}
      </span>
    )
  }

  return (
    <motion.span 
      className={cn("tabular-nums", className)}
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {display as any}
    </motion.span>
  )
}