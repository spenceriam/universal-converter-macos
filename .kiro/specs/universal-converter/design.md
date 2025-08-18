# Design Document

## Overview

The Universal Converter is a responsive web application that provides real-time conversions for units, currencies, and time zones. Built with modern web technologies, it features a clean, accessible interface with offline capabilities through intelligent caching. The application prioritizes performance, accuracy, and user experience while maintaining a lightweight footprint.

## Architecture

### High-Level Architecture

The application follows a modular, client-side architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Unit Converter │ │Currency Converter│ │ Time Converter  ││
│  │    Component     │ │    Component     │ │   Component     ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Unit Conversion │ │Currency Service │ │ TimeZone Service││
│  │    Service      │ │                 │ │                 ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Local Storage │ │   API Client    │ │  Cache Manager  ││
│  │    Manager      │ │                 │ │                 ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│  ┌─────────────────┐ ┌─────────────────┐                    │
│  │  Frankfurter    │ │   World Time    │                    │
│  │  Currency API   │ │      API        │                    │
│  └─────────────────┘ └─────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework:** React 18 with TypeScript for type safety and maintainability
- **UI Components:** shadcn/ui for consistent, accessible component library
- **Enhanced Components:** MagicUI and 21st.dev elements for advanced interactions (using public documentation only)
- **Styling:** Tailwind CSS with warm color palette (amber, orange, yellow tones) - NO purple gradients
- **State Management:** React Context API with useReducer for predictable state updates
- **HTTP Client:** Fetch API with custom retry logic and error handling
- **Unit Conversion:** Custom conversion engine with comprehensive unit definitions
- **Local Storage:** Browser localStorage with IndexedDB fallback for larger datasets
- **Build Tool:** Vite for fast development and optimized production builds
- **Testing:** Jest and React Testing Library for comprehensive test coverage

## Components and Interfaces

### Design System & Color Palette

#### Color Scheme (Warm Tones)
- **Primary:** Amber/Orange spectrum (amber-500, orange-500, yellow-600)
- **Secondary:** Warm neutrals (stone, warm-gray)
- **Accent:** Coral and peach tones for highlights
- **Background:** Cream and warm white tones
- **Text:** Rich browns and dark warm grays
- **Success:** Warm green (emerald-600)
- **Warning:** Golden yellow (yellow-500)
- **Error:** Warm red (red-500)

#### shadcn/ui Components Used
- **Button:** Primary actions with warm color variants
- **Input:** Form inputs with warm focus states
- **Select:** Dropdown selections for units/currencies/timezones
- **Card:** Container components with warm shadows
- **Badge:** Status indicators and labels
- **Separator:** Visual dividers
- **Tooltip:** Helpful information overlays
- **Sheet:** Mobile-friendly slide-out panels

#### MagicUI & 21st.dev Enhancements
- **AnimatedNumber:** Smooth number transitions for conversion results
- **GradientText:** Warm gradient text effects for headings (amber to orange)
- **BlurFade:** Smooth component entrance animations
- **NumberTicker:** Dynamic number animations for live rates
- **Ripple:** Warm-toned button interaction effects
- **Meteors:** Subtle background animation elements
- **GridPattern:** Warm geometric background patterns

### Core Components

#### 1. App Component
- **Purpose:** Root component managing global state and routing between conversion types
- **UI Elements:** 
  - shadcn/ui Card for main container with warm shadows
  - MagicUI BlurFade for smooth page transitions
  - Warm gradient background with GridPattern
- **Props:** None (root component)
- **State:** Current conversion type, theme preference, connectivity status
- **Key Methods:**
  - `switchConversionType(type: ConversionType): void`
  - `toggleTheme(): void`
  - `handleOfflineStatus(isOnline: boolean): void`

#### 2. ConversionContainer Component
- **Purpose:** Generic container for all conversion types with shared UI patterns
- **UI Elements:**
  - shadcn/ui Card with warm border and shadow
  - MagicUI GradientText for titles (amber to orange)
  - shadcn/ui Button with Ripple effect for copy action
  - MagicUI NumberTicker for animated results
- **Props:** 
  ```typescript
  interface ConversionContainerProps {
    title: string;
    children: React.ReactNode;
    onCopy: (value: string) => void;
    isLoading?: boolean;
  }
  ```
- **Features:** Copy-to-clipboard, loading states, error boundaries

#### 3. UnitConverter Component
- **Purpose:** Handles unit conversions with category selection and real-time updates
- **UI Elements:**
  - shadcn/ui Select for category and unit selection with warm focus states
  - shadcn/ui Input with amber focus ring
  - MagicUI AnimatedNumber for smooth result transitions
  - shadcn/ui Badge for unit labels with warm colors
- **Props:**
  ```typescript
  interface UnitConverterProps {
    initialCategory?: UnitCategory;
  }
  ```
- **State:** Selected category, source/target units, input value, conversion result
- **Key Methods:**
  - `handleCategoryChange(category: UnitCategory): void`
  - `handleUnitChange(type: 'source' | 'target', unit: Unit): void`
  - `handleValueChange(value: string): void`

#### 4. CurrencyConverter Component
- **Purpose:** Manages currency conversions with live exchange rates
- **UI Elements:**
  - shadcn/ui Select for currency selection with search functionality
  - MagicUI NumberTicker for live rate updates
  - shadcn/ui Badge for rate freshness indicator (green for fresh, amber for stale)
  - MagicUI AnimatedNumber for conversion results
  - shadcn/ui Tooltip for rate information
- **Props:**
  ```typescript
  interface CurrencyConverterProps {
    defaultBaseCurrency?: string;
  }
  ```
- **State:** Exchange rates, selected currencies, amount, last update timestamp
- **Key Methods:**
  - `fetchExchangeRates(): Promise<void>`
  - `handleCurrencyChange(type: 'from' | 'to', currency: string): void`
  - `handleAmountChange(amount: string): void`

#### 5. TimeZoneConverter Component
- **Purpose:** Converts times between time zones with DST awareness
- **UI Elements:**
  - shadcn/ui Select for timezone selection with search
  - shadcn/ui Input for date/time with warm styling
  - MagicUI NumberTicker for live clock displays
  - shadcn/ui Badge for DST indicators (warm yellow when active)
  - MagicUI BlurFade for smooth time updates
- **Props:**
  ```typescript
  interface TimeZoneConverterProps {
    defaultSourceTz?: string;
    defaultTargetTz?: string;
  }
  ```
- **State:** Selected time zones, input date/time, converted result
- **Key Methods:**
  - `handleTimeZoneChange(type: 'source' | 'target', tz: string): void`
  - `handleDateTimeChange(dateTime: string): void`
  - `getCurrentTimeInZones(): void`

### Service Interfaces

#### 1. ConversionService Interface
```typescript
interface ConversionService {
  convert(value: number, fromUnit: string, toUnit: string): number;
  getSupportedUnits(category: string): Unit[];
  getCategories(): UnitCategory[];
}
```

#### 2. CurrencyService Interface
```typescript
interface CurrencyService {
  getExchangeRates(baseCurrency?: string): Promise<ExchangeRates>;
  convertCurrency(amount: number, from: string, to: string): number;
  getSupportedCurrencies(): Currency[];
  getLastUpdateTime(): Date | null;
}
```

#### 3. TimeZoneService Interface
```typescript
interface TimeZoneService {
  convertTime(dateTime: Date, fromTz: string, toTz: string): Date;
  getCurrentTime(timeZone: string): Date;
  getSupportedTimeZones(): TimeZone[];
  isDSTActive(timeZone: string, date: Date): boolean;
}
```

## Data Models

### Unit System
```typescript
interface Unit {
  id: string;
  name: string;
  symbol: string;
  category: UnitCategory;
  baseMultiplier: number; // Conversion factor to base unit
}

interface UnitCategory {
  id: string;
  name: string;
  baseUnit: string;
  units: Unit[];
}
```

### Currency System
```typescript
interface Currency {
  code: string; // ISO 4217 code (e.g., "USD")
  name: string;
  symbol: string;
}

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}
```

### Time Zone System
```typescript
interface TimeZone {
  id: string; // IANA identifier (e.g., "America/New_York")
  name: string; // Display name
  offset: number; // Current UTC offset in minutes
  isDST: boolean; // Currently observing DST
}
```

### Application State
```typescript
interface AppState {
  currentConverter: 'units' | 'currency' | 'timezone';
  theme: 'light' | 'dark' | 'system';
  isOnline: boolean;
  lastDataUpdate: number;
  preferences: UserPreferences;
}

interface UserPreferences {
  defaultCurrency: string;
  defaultTimeZone: string;
  preferredUnits: Record<string, string>; // category -> preferred unit
  decimalPlaces: number;
}
```

## Error Handling

### Error Types and Strategies

#### 1. Network Errors
- **Strategy:** Graceful degradation with cached data
- **Implementation:** 
  - Retry failed requests with exponential backoff
  - Display clear offline indicators
  - Use stale data with timestamps when fresh data unavailable

#### 2. API Rate Limiting
- **Strategy:** Intelligent caching and request throttling
- **Implementation:**
  - Cache exchange rates for minimum 1 hour
  - Implement request queuing for burst scenarios
  - Display rate limit warnings to users

#### 3. Invalid Input Errors
- **Strategy:** Real-time validation with helpful feedback
- **Implementation:**
  - Input sanitization and validation
  - Clear error messages with correction suggestions
  - Prevent invalid state propagation

#### 4. Data Corruption
- **Strategy:** Data integrity checks and recovery
- **Implementation:**
  - Validate cached data on load
  - Fallback to default values for corrupted preferences
  - Automatic cache clearing and refresh mechanisms

### Error Boundary Implementation
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ConversionErrorBoundary extends Component<Props, ErrorBoundaryState> {
  // Catches JavaScript errors anywhere in child component tree
  // Provides fallback UI and error reporting
  // Allows partial app functionality to continue
}
```

## Testing Strategy

### Unit Testing
- **Coverage Target:** 90%+ for business logic, 80%+ overall
- **Focus Areas:**
  - Conversion algorithms and mathematical accuracy
  - API response parsing and error handling
  - State management and data flow
  - Input validation and sanitization

### Integration Testing
- **API Integration:** Mock external services for consistent testing
- **Component Integration:** Test component interactions and data flow
- **Storage Integration:** Test localStorage and IndexedDB operations
- **Cross-browser Compatibility:** Automated testing on major browsers

### End-to-End Testing
- **User Workflows:** Complete conversion scenarios for each type
- **Offline Scenarios:** Test functionality without network connectivity
- **Performance Testing:** Measure conversion speed and resource usage
- **Accessibility Testing:** Automated and manual accessibility validation

### Test Data Management
```typescript
// Mock data for consistent testing
const mockExchangeRates: ExchangeRates = {
  base: "USD",
  rates: { EUR: 0.85, GBP: 0.73, JPY: 110.0 },
  timestamp: Date.now()
};

const mockUnits: UnitCategory[] = [
  {
    id: "length",
    name: "Length",
    baseUnit: "meter",
    units: [
      { id: "m", name: "Meter", symbol: "m", category: "length", baseMultiplier: 1 },
      { id: "ft", name: "Foot", symbol: "ft", category: "length", baseMultiplier: 0.3048 }
    ]
  }
];
```

### Performance Benchmarks
- **Conversion Speed:** < 100ms for any conversion operation
- **Initial Load:** < 2 seconds on 3G connection
- **Memory Usage:** < 50MB peak memory consumption
- **Bundle Size:** < 500KB gzipped for initial load

## API Integration Details

### Frankfurter Currency API
- **Base URL:** `https://api.frankfurter.app`
- **Rate Limiting:** No explicit limits (reasonable use expected)
- **Caching Strategy:** 1-hour minimum cache, 24-hour maximum staleness
- **Error Handling:** Fallback to cached rates, user notification of stale data

### World Time API
- **Base URL:** `https://worldtimeapi.org/api`
- **Usage:** Time zone validation and current time lookup
- **Caching Strategy:** Time zone definitions cached indefinitely, current times not cached
- **Fallback:** Browser's Intl.DateTimeFormat for basic time zone support

### Offline Data Strategy
- **Unit Definitions:** Bundled with application (no external dependency)
- **Exchange Rates:** Cached in localStorage with timestamp validation
- **Time Zone Rules:** Utilize browser's built-in Intl API as primary source
- **Cache Invalidation:** Automatic refresh on app load if data > 24 hours old