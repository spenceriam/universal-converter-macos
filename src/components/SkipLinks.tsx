import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SkipLink {
  href: string
  label: string
}

interface SkipLinksProps {
  links?: SkipLink[]
  className?: string
}

const defaultLinks: SkipLink[] = [
  { href: "#main-content", label: "Skip to main content" },
  { href: "#conversion-nav", label: "Skip to conversion navigation" },
  { href: "#conversion-form", label: "Skip to conversion form" },
  { href: "#conversion-result", label: "Skip to conversion result" }
]

export function SkipLinks({ links = defaultLinks, className }: SkipLinksProps) {
  return (
    <div 
      className={cn(
        "fixed top-0 left-0 z-[9999] -translate-y-full focus-within:translate-y-0 transition-transform duration-200",
        className
      )}
      role="navigation"
      aria-label="Skip navigation links"
    >
      <div className="flex flex-col gap-1 p-2 bg-amber-600 shadow-lg">
        {links.map((link) => (
          <Button
            key={link.href}
            asChild
            variant="secondary"
            size="sm"
            className="text-left justify-start bg-white text-amber-900 hover:bg-amber-50 focus:bg-amber-50 focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
          >
            <a 
              href={link.href}
              className="no-underline"
              onClick={(e) => {
                e.preventDefault()
                const target = document.querySelector(link.href)
                if (target) {
                  // Focus the target element
                  if (target instanceof HTMLElement) {
                    target.focus()
                    // If the target isn't naturally focusable, make it focusable temporarily
                    if (!target.matches('button, [href], input, select, textarea, [tabindex]')) {
                      target.setAttribute('tabindex', '-1')
                      target.addEventListener('blur', () => {
                        target.removeAttribute('tabindex')
                      }, { once: true })
                    }
                  }
                  // Scroll to the target
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            >
              {link.label}
            </a>
          </Button>
        ))}
      </div>
    </div>
  )
}