import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Building2, Mail, CreditCard, Bell, Users } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();

  const settingsCards = [
    {
      title: 'Company Settings',
      description: 'Manage company information, branding, and logo',
      icon: Building2,
      path: '/settings/company',
      color: 'text-blue-600'
    },
    {
      title: 'Email Settings',
      description: 'Configure email templates and signatures',
      icon: Mail,
      path: '/settings/email',
      color: 'text-green-600'
    },
    {
      title: 'Billing Settings',
      description: 'Manage banking details and invoice settings',
      icon: CreditCard,
      path: '/settings/billing',
      color: 'text-purple-600'
    },
    {
      title: 'Notification Settings',
      description: 'Configure stock alerts and notifications',
      icon: Bell,
      path: '/settings/notifications-config',
      color: 'text-orange-600'
    },
    {
      title: 'Team Management',
      description: 'Manage team members and permissions',
      icon: Users,
      path: '/settings/team',
      color: 'text-red-600',
      adminOnly: true
    }
  ];

  return <AppLayout>
    <div className="max-w-5xl space-y-3">
      <div>
        <h1 className="text-lg font-bold font-sans">Settings</h1>
        <p className="text-xs text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          const content = (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full" onClick={() => navigate(card.path)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="text-xs">{card.description}</CardDescription>
                  </div>
                  <Icon className={`h-6 w-6 ${card.color} flex-shrink-0`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" className="w-full text-xs h-8" onClick={() => navigate(card.path)}>
                  Open Settings
                </Button>
              </CardContent>
            </Card>
          );

          if (card.adminOnly) {
            return (
              <PermissionGuard key={card.path} requireAdmin>
                {content}
              </PermissionGuard>
            );
          }

          return <div key={card.path}>{content}</div>;
        })}
      </div>

      {/* Quick Links */}
      <Card className="mt-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          <Button variant="link" className="w-full justify-start text-xs h-7 px-0" onClick={() => navigate('/settings/notifications')}>
            → Notification Preferences
          </Button>
          <Button variant="link" className="w-full justify-start text-xs h-7 px-0" onClick={() => navigate('/settings/automation')}>
            → Automation Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  </AppLayout>;
}
