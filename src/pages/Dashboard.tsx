import React from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLeads } from '@/hooks/useLeads';
import { useQuotations } from '@/hooks/useQuotations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: quotations = [], isLoading: quotationsLoading } = useQuotations();

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    wonLeads: leads.filter(l => l.status === 'won').length,
    totalQuotations: quotations.length,
    draftQuotations: quotations.filter(q => q.status === 'draft').length,
    acceptedQuotations: quotations.filter(q => q.status === 'accepted').length,
  };

  const recentLeads = leads.slice(0, 5);
  const recentQuotations = quotations.slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{stats.totalLeads}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-info">{stats.newLeads}</div>
              <p className="text-sm text-muted-foreground mt-1">New Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-success">{stats.wonLeads}</div>
              <p className="text-sm text-muted-foreground mt-1">Won Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{stats.totalQuotations}</div>
              <p className="text-sm text-muted-foreground mt-1">Quotations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-muted-foreground">{stats.draftQuotations}</div>
              <p className="text-sm text-muted-foreground mt-1">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-success">{stats.acceptedQuotations}</div>
              <p className="text-sm text-muted-foreground mt-1">Accepted</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Leads</CardTitle>
              <Link to="/leads">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : recentLeads.length === 0 ? (
                <p className="text-muted-foreground">No leads yet</p>
              ) : (
                <div className="space-y-3">
                  {recentLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      to={`/leads/${lead.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{lead.company_name}</p>
                        <p className="text-sm text-muted-foreground">{lead.contact_name}</p>
                      </div>
                      <LeadStatusBadge status={lead.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Quotations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Quotations</CardTitle>
              <Link to="/quotations">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {quotationsLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : recentQuotations.length === 0 ? (
                <p className="text-muted-foreground">No quotations yet</p>
              ) : (
                <div className="space-y-3">
                  {recentQuotations.map((quotation) => (
                    <Link
                      key={quotation.id}
                      to={`/quotations/${quotation.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{quotation.quote_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {quotation.lead?.company_name || 'Unknown'} - {format(new Date(quotation.quote_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <QuotationStatusBadge status={quotation.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
