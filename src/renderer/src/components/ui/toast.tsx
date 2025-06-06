import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cn } from '../../lib/utils'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const ToastProvider = ToastPrimitives.Provider

export type ToastMessage = {
  title: string
  description: string
  variant: ToastVariant
}

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

type ToastVariant = 'neutral' | 'success' | 'error'

interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
  variant?: ToastVariant
  swipeDirection?: 'right' | 'left' | 'up' | 'down'
}

const toastVariants: Record<ToastVariant, { icon: React.ReactNode; bgColor: string }> = {
  neutral: {
    icon: <Info className="h-3 w-3 text-amber-700" />,
    bgColor: 'bg-white border-gray-200 text-gray-900'
  },
  success: {
    icon: <CheckCircle2 className="h-3 w-3 text-emerald-700" />,
    bgColor: 'bg-green-50 border-green-200 text-green-900'
  },
  error: {
    icon: <AlertCircle className="h-3 w-3 text-red-700" />,
    bgColor: 'bg-red-50 border-red-200 text-red-900'
  }
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
    variant?: 'success' | 'error' | 'neutral'
  }
>(({ className, variant = 'neutral', ...props }, ref) => {
  const variantStyles = {
    neutral: 'bg-white border-gray-200 text-gray-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    error: 'bg-red-50 border-red-200 text-red-900'
  }

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {toastVariants[variant].icon}
      <div className="flex-1">{props.children}</div>
      <ToastPrimitives.Close className="absolute right-1 top-1 rounded-md p-0.5 text-zinc-500 opacity-0 transition-opacity hover:text-zinc-700 group-hover:opacity-100">
        <X className="h-2 w-2" />
      </ToastPrimitives.Close>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn('text-[0.65rem] font-medium text-zinc-600 hover:text-zinc-900', className)}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export type { ToastProps, ToastVariant }
export { ToastProvider, ToastViewport, Toast, ToastAction, ToastTitle, ToastDescription }
