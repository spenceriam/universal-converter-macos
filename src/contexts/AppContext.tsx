import * as React from "react"
import { DEFAULT_APP_STATE } from "@/types"
import type { AppState, ConversionType, ThemeMode, UserPreferences, AppError } from "@/types"

// Action types for state management
type AppAction =
  | { type: 'SET_CONVERSION_TYPE'; payload: ConversionType }
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'UPDATE_DATA_TIMESTAMP'; payload: number }

// App context interface
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  // Convenience methods
  setConversionType: (type: ConversionType) => void
  setTheme: (theme: ThemeMode) => void
  setOnlineStatus: (isOnline: boolean) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  addError: (error: AppError) => void
  removeError: (errorId: string) => void
  clearErrors: () => void
}

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CONVERSION_TYPE':
      return {
        ...state,
        currentConverter: action.payload
      }
    
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
        preferences: {
          ...state.preferences,
          theme: action.payload
        }
      }
    
    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload
      }
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      }
    
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload]
      }
    
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload)
      }
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: []
      }
    
    case 'UPDATE_DATA_TIMESTAMP':
      return {
        ...state,
        lastDataUpdate: action.payload
      }
    
    default:
      return state
  }
}

// Create context
const AppContext = React.createContext<AppContextType | undefined>(undefined)

// Provider component
interface AppProviderProps {
  children: React.ReactNode
  initialState?: Partial<AppState>
}

export function AppProvider({ children, initialState }: AppProviderProps) {
  // Load initial state from localStorage if available
  const getInitialState = (): AppState => {
    try {
      const savedState = localStorage.getItem('universal-converter-state')
      if (savedState) {
        const parsed = JSON.parse(savedState)
        return {
          ...DEFAULT_APP_STATE,
          ...parsed,
          ...initialState,
          // Always use current online status
          isOnline: navigator.onLine,
          // Clear errors on app start
          errors: []
        }
      }
    } catch (error) {
      console.warn('Failed to load saved state:', error)
    }
    
    return {
      ...DEFAULT_APP_STATE,
      ...initialState
    }
  }

  const [state, dispatch] = React.useReducer(appReducer, getInitialState())

  // Save state to localStorage whenever it changes (excluding errors and online status)
  React.useEffect(() => {
    try {
      const stateToSave = {
        currentConverter: state.currentConverter,
        theme: state.theme,
        colorScheme: state.colorScheme,
        preferences: state.preferences,
        lastDataUpdate: state.lastDataUpdate
      }
      localStorage.setItem('universal-converter-state', JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('Failed to save state:', error)
    }
  }, [state.currentConverter, state.theme, state.colorScheme, state.preferences, state.lastDataUpdate])

  // Monitor online/offline status
  React.useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true })
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false })

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Convenience methods
  const setConversionType = React.useCallback((type: ConversionType) => {
    dispatch({ type: 'SET_CONVERSION_TYPE', payload: type })
  }, [])

  const setTheme = React.useCallback((theme: ThemeMode) => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }, [])

  const setOnlineStatus = React.useCallback((isOnline: boolean) => {
    dispatch({ type: 'SET_ONLINE_STATUS', payload: isOnline })
  }, [])

  const updatePreferences = React.useCallback((preferences: Partial<UserPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences })
  }, [])

  const addError = React.useCallback((error: AppError) => {
    dispatch({ type: 'ADD_ERROR', payload: error })
  }, [])

  const removeError = React.useCallback((errorId: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: errorId })
  }, [])

  const clearErrors = React.useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' })
  }, [])

  const contextValue: AppContextType = {
    state,
    dispatch,
    setConversionType,
    setTheme,
    setOnlineStatus,
    updatePreferences,
    addError,
    removeError,
    clearErrors
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

// Hook to use the app context
export function useApp() {
  const context = React.useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Hook to use specific parts of the state
export function useAppState() {
  const { state } = useApp()
  return state
}

export function useConversionType() {
  const { state, setConversionType } = useApp()
  return [state.currentConverter, setConversionType] as const
}

export function useOnlineStatus() {
  const { state } = useApp()
  return state.isOnline
}

export function useAppErrors() {
  const { state, addError, removeError, clearErrors } = useApp()
  return {
    errors: state.errors,
    addError,
    removeError,
    clearErrors
  }
}