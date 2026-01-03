import React from 'react';
import { Lead } from '@/types/database';
import { cn } from '@/lib/utils';

const statusConfig: Record<Lead['status'], { label: string; className: string }> = {
  new: { label: 'New', className: 'status-new' },
  contacted: { label: 'Contacted', className: 'status-contacted' },
  qualified: { label: 'Qualified', className: 'status-qualified' },
  proposal: { label: 'Proposal', className: 'status-proposal' },
  won: { label: 'Won', className: 'status-won' },
  lost: { label: 'Lost', className: 'status-lost' },
};

interface LeadStatusBadgeProps {
  status: Lead['status'];
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn('status-badge', config.className, className)}>
      {config.label}
    </span>
  );
}
