import { toast } from 'sonner'

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

export function notify({ message, type = 'info', duration = 3000 }: ToastOptions) {
  switch (type) {
    case 'success':
      toast.success(message, { duration })
      break
    case 'error':
      toast.error(message, { duration })
      break
    case 'warning':
      toast.warning(message, { duration })
      break
    default:
      toast.info(message, { duration })
  }
}
