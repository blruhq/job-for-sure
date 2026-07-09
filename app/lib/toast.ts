/**
 * Simple toast notification for decorative feature placeholders.
 * Creates a temporary floating notification at the bottom of the screen.
 * Can be replaced with a proper toast library later.
 */

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

export function notify({ message, type = 'info', duration = 3000 }: ToastOptions) {
  const el = document.createElement('div')
  el.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    padding: 10px 20px;
    border-radius: 6px;
    font-family: 'Inter Variable', system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    color: #fff;
    background: ${type === 'error' ? '#DC2626' : type === 'success' ? '#2B5F45' : type === 'warning' ? '#D4A316' : '#5B6ABF'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transition: opacity 200ms ease;
    pointer-events: none;
  `
  el.textContent = message
  document.body.appendChild(el)

  requestAnimationFrame(() => { el.style.opacity = '1' })

  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 200)
  }, duration)
}
