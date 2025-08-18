import * as React from "react"
import { Search, ArrowRightLeft, Calculator } from "lucide-react"
import { ConversionContainer } from "./ConversionContainer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { cn } from "@/lib/utils"
import { unitConverter } from "@/services/unitConversion"
import { 
  filterUnits, 
  getUnitsByCategory, 
  getPopularUnits, 
  getUnitDisplayText 
} from "@/utils/unitFilters"
import { useScreenReader } from "@/hooks/useAccessibility"
import type { 
  Unit, 
  UnitCategory, 
  ConversionResult, 
  UnitConverterProps 
} from "@/types"

interface UnitConverterState {
  categories: UnitCategory[]
  selectedCategory: string
  sourceUnit: Unit | null
  targetUnit: Unit | null
  inputValue: string
  result: ConversionResult | null
  isLoading: boolean
  error: string | null
  sourceUnitSearch: string
  targetUnitSearch: string
}

function UnitConverter({ 
  initialCategory = 'length',
  onConversion,
  className,
  ...props 
}: UnitConverterProps) {
  const { announce } = useScreenReader()
  const [state, setState] = React.useState<UnitConverterState>({
    categories: [],
    selectedCategory: initialCategory,
    sourceUnit: null,
    targetUnit: null,
    inputValue: '1',
    result: null,
    isLoading: false,
    error: null,
    sourceUnitSearch: '',
    targetUnitSearch: ''
  })

  // Initialize categories and default units
  React.useEffect(() => {
    const categories = unitConverter.getCategories()
    setState(prev => ({ ...prev, categories }))
    
    // Set default units for initial category
    const categoryUnits = getUnitsByCategory(categories, initialCategory)
    if (categoryUnits.length >= 2) {
      const popularUnits = getPopularUnits(categoryUnits, initialCategory)
      setState(prev => ({
        ...prev,
        sourceUnit: popularUnits[0] || null,
        targetUnit: popularUnits[1] || null
      }))
    }
  }, [initialCategory])

  // Perform conversion when inputs change
  React.useEffect(() => {
    const performConversion = async () => {
      if (!state.sourceUnit || !state.targetUnit || !state.inputValue.trim()) {
        setState(prev => ({ ...prev, result: null, error: null }))
        return
      }

      const numericValue = parseFloat(state.inputValue)
      if (isNaN(numericValue)) {
        setState(prev => ({ 
          ...prev, 
          result: null, 
          error: 'Please enter a valid number' 
        }))
        return
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await unitConverter.convert(
          numericValue, 
          state.sourceUnit!.id, 
          state.targetUnit!.id
        )
        
        setState(prev => ({ 
          ...prev, 
          result, 
          isLoading: false, 
          error: null 
        }))
        
        // Announce conversion result
        if (state.sourceUnit && state.targetUnit) {
          announce(`Converted ${numericValue} ${state.sourceUnit.name} to ${result.formattedValue} ${state.targetUnit.name}`)
        }
        
        onConversion?.(result)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Conversion failed'
        setState(prev => ({ 
          ...prev, 
          result: null, 
          isLoading: false, 
          error: errorMessage 
        }))
      }
    }

    const debounceTimer = setTimeout(performConversion, 300)
    return () => clearTimeout(debounceTimer)
  }, [state.sourceUnit, state.targetUnit, state.inputValue, onConversion])

  const handleCategoryChange = React.useCallback((categoryId: string) => {
    const categoryUnits = getUnitsByCategory(state.categories, categoryId)
    const popularUnits = getPopularUnits(categoryUnits, categoryId)
    
    setState(prev => ({
      ...prev,
      selectedCategory: categoryId,
      sourceUnit: popularUnits[0] || null,
      targetUnit: popularUnits[1] || null,
      sourceUnitSearch: '',
      targetUnitSearch: '',
      result: null,
      error: null
    }))
  }, [state.categories])

  const handleUnitChange = React.useCallback((type: 'source' | 'target', unitId: string) => {
    const categoryUnits = getUnitsByCategory(state.categories, state.selectedCategory)
    const unit = categoryUnits.find(u => u.id === unitId)
    
    if (unit) {
      setState(prev => ({
        ...prev,
        [type === 'source' ? 'sourceUnit' : 'targetUnit']: unit,
        result: null,
        error: null
      }))
    }
  }, [state.categories, state.selectedCategory])

  const handleSwapUnits = React.useCallback(() => {
    if (state.sourceUnit && state.targetUnit) {
      setState(prev => ({
        ...prev,
        sourceUnit: prev.targetUnit,
        targetUnit: prev.sourceUnit,
        result: null,
        error: null
      }))
    }
  }, [state.sourceUnit, state.targetUnit])

  const handleInputChange = React.useCallback((value: string) => {
    // Allow numbers, decimal points, and basic mathematical notation
    const sanitizedValue = value.replace(/[^0-9.-]/g, '')
    setState(prev => ({ ...prev, inputValue: sanitizedValue }))
  }, [])

  const handleCopy = React.useCallback((value: string) => {
    // Copy functionality is handled by ConversionContainer
  }, [])

  const getFilteredUnits = React.useCallback((searchTerm: string) => {
    const categoryUnits = getUnitsByCategory(state.categories, state.selectedCategory)
    const popularUnits = getPopularUnits(categoryUnits, state.selectedCategory)
    return searchTerm ? filterUnits(popularUnits, searchTerm) : popularUnits
  }, [state.categories, state.selectedCategory])

  const formatResultValue = React.useCallback(() => {
    if (!state.result) return ''
    return `${state.result.formattedValue} ${state.result.unit.symbol}`
  }, [state.result])

  return (
    <ConversionContainer
      title="Unit Converter"
      onCopy={handleCopy}
      copyValue={formatResultValue()}
      isLoading={state.isLoading}
      error={state.error}
      className={cn("unit-converter", className)}
      {...props}
    >
      <div className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <label 
            htmlFor="category-select" 
            className="text-sm font-medium text-foreground"
          >
            Category
          </label>
          <Select 
            value={state.selectedCategory} 
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger 
              id="category-select"
              className="w-full focus:ring-amber-500 focus:border-amber-500"
              aria-label="Select unit category"
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {state.categories.map((category) => (
                <SelectItem 
                  key={category.id} 
                  value={category.id}
                  aria-describedby={`category-${category.id}-info`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{category.name}</span>
                    <Badge 
                      variant="warm" 
                      className="text-xs"
                      aria-label={`${category.units.length} units available`}
                    >
                      {category.units.length}
                    </Badge>
                  </div>
                  <span 
                    id={`category-${category.id}-info`} 
                    className="sr-only"
                  >
                    {category.units.length} units available in {category.name} category
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conversion Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          {/* Source Unit */}
          <div className="space-y-2">
            <label 
              htmlFor="source-unit-select" 
              className="text-sm font-medium text-foreground"
            >
              From
            </label>
            <div className="space-y-2">
              <Select 
                value={state.sourceUnit?.id || ''} 
                onValueChange={(value) => handleUnitChange('source', value)}
              >
                <SelectTrigger 
                  id="source-unit-select"
                  className="w-full focus:ring-amber-500 focus:border-amber-500"
                  aria-label="Select source unit"
                >
                  <SelectValue placeholder="Select source unit">
                    {state.sourceUnit && (
                      <div className="flex items-center space-x-2">
                        <span>{state.sourceUnit.name}</span>
                        <Badge 
                          variant="outline" 
                          className="text-xs border-amber-200"
                          aria-label={`Symbol: ${state.sourceUnit.symbol}`}
                        >
                          {state.sourceUnit.symbol}
                        </Badge>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search 
                        className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" 
                        aria-hidden="true"
                      />
                      <Input
                        placeholder="Search units..."
                        value={state.sourceUnitSearch}
                        onChange={(e) => setState(prev => ({ 
                          ...prev, 
                          sourceUnitSearch: e.target.value 
                        }))}
                        className="pl-8 h-9 focus:ring-amber-500"
                        aria-label="Search source units"
                      />
                    </div>
                  </div>
                  {getFilteredUnits(state.sourceUnitSearch).map((unit) => (
                    <SelectItem 
                      key={unit.id} 
                      value={unit.id}
                      aria-describedby={`source-unit-${unit.id}-info`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{unit.name}</span>
                        <Badge 
                          variant="outline" 
                          className="ml-2 text-xs border-amber-200"
                          aria-label={`Symbol: ${unit.symbol}`}
                        >
                          {unit.symbol}
                        </Badge>
                      </div>
                      <span 
                        id={`source-unit-${unit.id}-info`} 
                        className="sr-only"
                      >
                        {unit.name}, symbol {unit.symbol}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                id="conversion-input"
                type="text"
                value={state.inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Enter value"
                className="focus:ring-amber-500 focus:border-amber-500"
                aria-label={`Enter value to convert${state.sourceUnit ? ` in ${state.sourceUnit.name}` : ''}`}
                aria-describedby="input-help"
              />
              <div id="input-help" className="sr-only">
                Enter a numeric value to convert between units
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center md:justify-start mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwapUnits}
              disabled={!state.sourceUnit || !state.targetUnit}
              className="hover:bg-amber-50 hover:border-amber-300 focus:ring-amber-500"
              aria-label={`Swap units${state.sourceUnit && state.targetUnit ? `: ${state.sourceUnit.name} and ${state.targetUnit.name}` : ''}`}
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Target Unit */}
          <div className="space-y-2">
            <label 
              htmlFor="target-unit-select" 
              className="text-sm font-medium text-foreground"
            >
              To
            </label>
            <div className="space-y-2">
              <Select 
                value={state.targetUnit?.id || ''} 
                onValueChange={(value) => handleUnitChange('target', value)}
              >
                <SelectTrigger 
                  id="target-unit-select"
                  className="w-full focus:ring-amber-500 focus:border-amber-500"
                  aria-label="Select target unit"
                >
                  <SelectValue placeholder="Select target unit">
                    {state.targetUnit && (
                      <div className="flex items-center space-x-2">
                        <span>{state.targetUnit.name}</span>
                        <Badge 
                          variant="outline" 
                          className="text-xs border-amber-200"
                          aria-label={`Symbol: ${state.targetUnit.symbol}`}
                        >
                          {state.targetUnit.symbol}
                        </Badge>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search 
                        className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" 
                        aria-hidden="true"
                      />
                      <Input
                        placeholder="Search units..."
                        value={state.targetUnitSearch}
                        onChange={(e) => setState(prev => ({ 
                          ...prev, 
                          targetUnitSearch: e.target.value 
                        }))}
                        className="pl-8 h-9 focus:ring-amber-500"
                        aria-label="Search target units"
                      />
                    </div>
                  </div>
                  {getFilteredUnits(state.targetUnitSearch).map((unit) => (
                    <SelectItem 
                      key={unit.id} 
                      value={unit.id}
                      aria-describedby={`target-unit-${unit.id}-info`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{unit.name}</span>
                        <Badge 
                          variant="outline" 
                          className="ml-2 text-xs border-amber-200"
                          aria-label={`Symbol: ${unit.symbol}`}
                        >
                          {unit.symbol}
                        </Badge>
                      </div>
                      <span 
                        id={`target-unit-${unit.id}-info`} 
                        className="sr-only"
                      >
                        {unit.name}, symbol {unit.symbol}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Result Display */}
              <div className="relative">
                <Input
                  id="conversion-result"
                  value={state.result ? state.result.formattedValue : ''}
                  readOnly
                  placeholder="Result will appear here"
                  className="bg-amber-50/50 border-amber-200 focus:ring-amber-500 pr-16"
                  aria-label={`Conversion result${state.result ? `: ${state.result.formattedValue} ${state.targetUnit?.symbol || ''}` : ''}`}
                  aria-live="polite"
                />
                {state.targetUnit && (
                  <Badge 
                    variant="warm" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                    aria-hidden="true"
                  >
                    {state.targetUnit.symbol}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Result Summary */}
        {state.result && state.sourceUnit && state.targetUnit && (
          <div 
            className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
            role="region"
            aria-labelledby="result-summary"
            aria-live="polite"
          >
            <div className="flex items-center space-x-2 text-sm text-amber-800">
              <Calculator className="h-4 w-4" aria-hidden="true" />
              <span id="result-summary">
                {state.inputValue} {state.sourceUnit.symbol} equals
              </span>
              <AnimatedNumber 
                value={state.result.value} 
                precision={state.result.precision}
                className="font-semibold"
                aria-label={`${state.result.formattedValue} ${state.targetUnit.symbol}`}
              />
              <span>{state.targetUnit.symbol}</span>
            </div>
            {state.result.precision > 6 && (
              <div className="mt-1 text-xs text-amber-600" role="note">
                Result rounded to {state.result.precision} decimal places
              </div>
            )}
          </div>
        )}

        {/* Unit Information */}
        {state.sourceUnit && state.targetUnit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="space-y-1">
              <div className="font-medium text-foreground">Source Unit</div>
              <div>{getUnitDisplayText(state.sourceUnit)}</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-foreground">Target Unit</div>
              <div>{getUnitDisplayText(state.targetUnit)}</div>
            </div>
          </div>
        )}
      </div>
    </ConversionContainer>
  )
}
export 
default UnitConverter