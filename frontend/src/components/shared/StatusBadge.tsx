import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'purple' | 'outline' }> = {
  new: { label: 'New', variant: 'default' },
  screened: { label: 'Screened', variant: 'warning' },
  shortlisted: { label: 'Shortlisted', variant: 'secondary' },
  interview: { label: 'Interview', variant: 'purple' },
  offered: { label: 'Offered', variant: 'default' },
  hired: { label: 'Hired', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  draft: { label: 'Draft', variant: 'secondary' },
  open: { label: 'Open', variant: 'success' },
  closed: { label: 'Closed', variant: 'destructive' },
  'on-hold': { label: 'On Hold', variant: 'warning' },
  scheduled: { label: 'Scheduled', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  no_show: { label: 'No Show', variant: 'warning' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
