/**
 * Service Worker registration and management utilities
 */
import * as React from "react"

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

// Check if service workers are supported
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator
}

// Register service worker
export async function registerServiceWorker(config?: ServiceWorkerConfig): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.log('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    console.log('Service Worker registered successfully:', registration)

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available
            console.log('New content available, please refresh')
            config?.onUpdate?.(registration)
          } else {
            // Content is cached for offline use
            console.log('Content cached for offline use')
            config?.onSuccess?.(registration)
          }
        }
      })
    })

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    config?.onError?.(error as Error)
    return null
  }
}

// Unregister service worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      const result = await registration.unregister()
      console.log('Service Worker unregistered:', result)
      return result
    }
    return false
  } catch (error) {
    console.error('Service Worker unregistration failed:', error)
    return false
  }
}

// Check for service worker updates
export async function checkForUpdates(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.update()
      return true
    }
    return false
  } catch (error) {
    console.error('Service Worker update check failed:', error)
    return false
  }
}

// Skip waiting and activate new service worker
export function skipWaiting(): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
  }
}

// Listen for service worker messages
export function addServiceWorkerMessageListener(
  callback: (event: MessageEvent) => void
): () => void {
  if (!isServiceWorkerSupported()) {
    return () => {}
  }

  navigator.serviceWorker.addEventListener('message', callback)
  
  return () => {
    navigator.serviceWorker.removeEventListener('message', callback)
  }
}

// Get service worker registration status
export async function getServiceWorkerStatus(): Promise<{
  supported: boolean
  registered: boolean
  active: boolean
  waiting: boolean
}> {
  const supported = isServiceWorkerSupported()
  
  if (!supported) {
    return { supported: false, registered: false, active: false, waiting: false }
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    
    return {
      supported: true,
      registered: !!registration,
      active: !!registration?.active,
      waiting: !!registration?.waiting
    }
  } catch (error) {
    return { supported: true, registered: false, active: false, waiting: false }
  }
}

// React hook for service worker management
export function useServiceWorker(config?: ServiceWorkerConfig) {
  const [status, setStatus] = React.useState({
    supported: false,
    registered: false,
    active: false,
    waiting: false,
    updateAvailable: false
  })

  React.useEffect(() => {
    let mounted = true

    const initServiceWorker = async () => {
      const initialStatus = await getServiceWorkerStatus()
      
      if (mounted) {
        setStatus(prev => ({ ...prev, ...initialStatus }))
      }

      if (initialStatus.supported && !initialStatus.registered) {
        const registration = await registerServiceWorker({
          ...config,
          onUpdate: (registration) => {
            if (mounted) {
              setStatus(prev => ({ ...prev, updateAvailable: true }))
            }
            config?.onUpdate?.(registration)
          },
          onSuccess: (registration) => {
            if (mounted) {
              setStatus(prev => ({ ...prev, registered: true, active: true }))
            }
            config?.onSuccess?.(registration)
          }
        })

        if (registration && mounted) {
          setStatus(prev => ({ 
            ...prev, 
            registered: true, 
            active: !!registration.active 
          }))
        }
      }
    }

    initServiceWorker()

    return () => {
      mounted = false
    }
  }, [])

  const updateServiceWorker = React.useCallback(() => {
    skipWaiting()
    window.location.reload()
  }, [])

  const checkUpdates = React.useCallback(async () => {
    const hasUpdates = await checkForUpdates()
    return hasUpdates
  }, [])

  return {
    ...status,
    updateServiceWorker,
    checkUpdates
  }
}

