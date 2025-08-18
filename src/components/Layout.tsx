import * as React from "react"
import { GridPattern } from "@/components/ui/grid-pattern"
import { BlurFade } from "@/components/ui/blur-fade"
import { ThemeToggle } from "./ThemeToggle"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: React.ReactNode
  className?: string
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-warm-50 via-amber-50/30 to-orange-50/20 dark:from-warm-900 dark:via-warm-800/30 dark:to-amber-900/20 relative overflow-hidden",
      className
    )}>
      {/* Background Pattern */}
      <GridPattern
        width={60}
        height={60}
        className="absolute inset-0 opacity-20 dark:opacity-10"
        strokeDasharray="2,2"
      />
      
      {/* Warm gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 p-4 flex justify-between items-center">
        <BlurFade delay={0.1}>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">UC</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Universal Converter
            </h1>
          </div>
        </BlurFade>
        
        <BlurFade delay={0.2}>
          <ThemeToggle />
        </BlurFade>
      </header>
      
      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <BlurFade delay={0.3}>
          {children}
        </BlurFade>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 p-4 text-center text-sm text-muted-foreground">
        <BlurFade delay={0.4}>
          <p>Built with warm colors and modern web technologies</p>
        </BlurFade>
      </footer>
    </div>
  )
}