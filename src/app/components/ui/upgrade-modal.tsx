import { useRouter } from '~/i18n/routing'
import { Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

export type UpgradeModalData = {
  feature?: string
  limit?: number
  featureLabel?: string
  period?: string
}

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  data?: UpgradeModalData
}

export function UpgradeModal({ open, onClose, data }: UpgradeModalProps) {
  const router = useRouter()

  const featureLabel = data?.featureLabel ?? 'features'
  const limit = data?.limit
  const period = data?.period ?? 'today'

  const limitText = limit
    ? `You've used all ${limit} free ${featureLabel} ${period}.`
    : `You've reached the free plan limit for ${featureLabel}.`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {limit ? 'Limit Reached' : 'Upgrade to Continue'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles size={22} className="text-primary" />
          </div>

          {/* Limit description */}
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {limitText}
          </p>

          {/* Pro pitch */}
          <div className="mt-4 rounded-md border border-border bg-muted/30 px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground">Upgrade to Pro</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Unlimited chat, resumes, cover letters, ATS matching, and interview prep.
            </p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">
              $4<span className="text-xs font-normal text-muted-foreground">/mo</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">or $29/year</span>
            </p>
          </div>

          {/* CTA buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <Button variant="default" onClick={() => { onClose(); router.push('/pricing') }} className="w-full px-4 py-2.5 text-sm font-semibold">
              View Plans
            </Button>
            <Button variant="outline" onClick={() => { onClose(); router.push('/settings/billing') }} className="w-full px-4 py-2.5 text-sm font-medium">
              Go to Billing Settings
            </Button>
            <Button variant="link" onClick={onClose} className="mt-1 w-full text-xs font-medium">
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
