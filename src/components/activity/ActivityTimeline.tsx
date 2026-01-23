import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  FileText, 
  Mail, 
  Edit, 
  Plus, 
  ArrowRight, 
  Lock, 
  DollarSign, 
  User,
  Package,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Activity {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  performed_by_name: string | null;
  created_at: string;
}

interface ActivityTimelineProps {
  entityType: 'lead' | 'deal' | 'quotation' | 'invoice' | 'product';
  entityId: string;
  maxItems?: number;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created':
      return <Plus className="h-4 w-4" />;
    case 'updated':
    case 'status_changed':
    case 'stage_changed':
      return <Edit className="h-4 w-4" />;
    case 'email_sent':
      return <Mail className="h-4 w-4" />;
    case 'payment_recorded':
      return <DollarSign className="h-4 w-4" />;
    case 'locked':
    case 'unlocked':
      return <Lock className="h-4 w-4" />;
    case 'qualified':
      return <CheckCircle className="h-4 w-4" />;
    case 'converted':
      return <ArrowRight className="h-4 w-4" />;
    case 'stock_updated':
      return <Package className="h-4 w-4" />;
    case 'won':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'lost':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'created':
      return 'bg-primary text-primary-foreground';
    case 'email_sent':
      return 'bg-info text-info-foreground';
    case 'payment_recorded':
      return 'bg-success text-success-foreground';
    case 'locked':
      return 'bg-warning text-warning-foreground';
    case 'won':
      return 'bg-success text-success-foreground';
    case 'lost':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function ActivityTimeline({ entityType, entityId, maxItems = 50 }: ActivityTimelineProps) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', entityType, entityId],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      return data || [];
    },
  });

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <h4 className="text-xs font-medium text-muted-foreground mb-3">
                  {format(new Date(date), 'MMMM d, yyyy')}
                </h4>
                <div className="space-y-3">
                  {dateActivities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
                          activity.action
                        )}`}
                      >
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {activity.performed_by_name && (
                            <>
                              <User className="h-3 w-3" />
                              <span>{activity.performed_by_name}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Recent Activity component for Dashboard
export function RecentActivityWidget({ maxItems = 10 }: { maxItems?: number }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No recent activity.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
                  activity.action
                )}`}
              >
                {getActionIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{activity.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span className="capitalize">{activity.entity_type}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
