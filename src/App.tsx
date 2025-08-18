import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { GridPattern } from "@/components/ui/grid-pattern"

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 relative">
      <GridPattern className="opacity-20" />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <BlurFade>
          <div className="text-center mb-8">
            <GradientText className="text-4xl font-bold mb-2">
              Universal Converter
            </GradientText>
            <p className="text-warm-600">
              Convert units, currencies, and time zones with ease
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Welcome</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4">
                Your universal conversion tool is ready to use!
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </div>
  )
}

export default App
