import { useState } from 'react'
import { ToastContext } from './toast-context'

import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastProvider as ToastPrimitivesProvider,
  ToastViewport
} from '../components/ui/toast'

type ToastVariant = 'neutral' | 'success' | 'error'

interface ToastState {
  open: boolean
  title: string
  description: string
  variant: ToastVariant
}

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const [toastState, setToastState] = useState<ToastState>({
    open: false,
    title: '',
    description: '',
    variant: 'neutral'
  })

  const showToast = (title: string, description: string, variant: ToastVariant) => {
    setToastState({ open: true, title, description, variant })
  }

  return (
    <ToastPrimitivesProvider>
      <ToastContext.Provider value={{ showToast }}>
        {children}

        <Toast
          open={toastState.open}
          onOpenChange={(open) => setToastState((prev) => ({ ...prev, open }))}
          variant={toastState.variant}
          duration={1500}
        >
          <ToastTitle>{toastState.title}</ToastTitle>
          <ToastDescription>{toastState.description}</ToastDescription>
        </Toast>
      </ToastContext.Provider>
      <ToastViewport />
    </ToastPrimitivesProvider>
  )
}
