'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from '@base-ui/react/menu'
import { Settings, LogOut } from 'lucide-react'
import { authClient } from '~/lib/auth-client'

export function UserMenu() {
  const router = useRouter()
  const [initials, setInitials] = useState('?')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await authClient.getSession()
        if (data?.user) {
          const u = data.user
          setUserName(u.name)
          setUserEmail(u.email)
          if (u.name) {
            const parts = u.name.split(' ')
            const initial =
              parts.length >= 2
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : parts[0][0].toUpperCase()
            setInitials(initial)
          } else if (u.email) {
            setInitials(u.email[0].toUpperCase())
          }
        }
      } catch { /* ignore */ }
    }
    loadUser()
  }, [])

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } catch { /* ignore */ }
    window.location.href = '/login'
  }

  return (
    <Menu.Root>
      <Menu.Trigger className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground transition-all duration-150 hover:opacity-80 active:scale-95 data-[popup-open]:ring-2 data-[popup-open]:ring-ring">
        {initials}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" className="z-50">
          <Menu.Popup className="min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg">
            <div className="px-2.5 py-2">
              {userName && <div className="text-xs font-semibold text-foreground">{userName}</div>}
              {userEmail && (
                <div className="truncate text-[10px] text-muted-foreground">{userEmail}</div>
              )}
            </div>
            <div className="mx-2 h-px bg-border" />
            <Menu.Item
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-foreground"
              onClick={() => router.push('/settings')}
            >
              <Settings size={14} />
              Settings
            </Menu.Item>
            <Menu.Item
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut size={14} />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
