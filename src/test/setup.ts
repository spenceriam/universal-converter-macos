import '@testing-library/jest-dom'

// Mock matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock navigator.onLine for connectivity status
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})