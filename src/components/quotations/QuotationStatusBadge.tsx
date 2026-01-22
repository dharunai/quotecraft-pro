import React from 'react';
import { Quotation } from '@/types/database';
import { cn } from '@/lib/utils';
const statusConfig: Record<Quotation['status'], {
  label: string;
  className: string;
}> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground'
  },
  sent: {
    label: 'Sent',
    className: 'bg-info/10 text-info'
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-success/10 text-success'
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive'
  }
};
interface QuotationStatusBadgeProps {
  status: Quotation['status'];
  className?: string;
}
export function QuotationStatusBadge({
  status,
  className
}: QuotationStatusBadgeProps) {
  const config = statusConfig[status];
  return <span className={cn("status-badge font-sans", config.className, className)}>
      {config.label}
    </span>;
}