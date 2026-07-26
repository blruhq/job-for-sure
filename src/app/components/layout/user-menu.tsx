import { useState, useEffect } from 'react'
import { useRouter } from '~/i18n/routing'
import { Settings, LogOut } from 'lucide-react'
import { authClient } from '~/lib/auth-client'
import { notify } from '~/lib/toast'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '~/components/ui/dropdown-menu'

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
      } catch {
        console.error('Failed to load user session')
        notify({ message: 'Failed to load user session', type: 'error' })
      }
    }
    loadUser()
  }, [])

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } catch {
      console.error('Failed to sign out')
      notify({ message: 'Failed to sign out', type: 'error' })
    }
    window.location.href = '/login'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground transition-all duration-150 hover:opacity-80 active:scale-95">
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <div className="px-2.5 py-2">
          {userName && <div className="text-xs font-semibold text-foreground">{userName}</div>}
          {userEmail && (
            <div className="truncate text-[10px] text-muted-foreground">{userEmail}</div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')} className="flex items-center gap-2">
          <Settings size={14} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
          <LogOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
