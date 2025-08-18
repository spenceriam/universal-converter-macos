import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect } from "react"

interface AnimatedNumberProps {
  value: number
  className?: string
  precision?: number
}

export function AnimatedNumber({ value, className, precision = 2 }: AnimatedNumberProps) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 })
  const display = useTransform(spring, (current) =>
    Math.round(current * Math.pow(10, precision)) / Math.pow(10, precision)
  )

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  )
}