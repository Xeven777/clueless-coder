import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const getPlatform = () => {
  try {
    return window.electronAPI.getPlatform() || 'darwin'
  } catch {
    return 'darwin'
  }
}

export const COMMAND_KEY = getPlatform() === 'darwin' ? '⌘' : 'ctrl'
