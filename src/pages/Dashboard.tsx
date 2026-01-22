import React from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLeads } from '@/hooks/useLeads';
import { useQuotations } from '@/hooks/useQuotations';
import { useDeals } from '@/hooks/useDeals';
import { useProducts } from '@/hooks/useProducts';
import { useInvoices } from '@/hooks/useInvoices';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
export default function Dashboard() {
  const {
    data: leads = [],
    isLoading: leadsLoading
  } = useLeads();
  const {
    data: quotations = [],
    isLoading: quotationsLoading
  } = useQuotations();
  const {
    data: deals = []
  } = useDeals();
  const {
    data: products = []
  } = useProducts();
  const {
    data: invoices = []
  } = useInvoices();
  const {
    data: settings
  } = useCompanySettings();
  const currency = settings?.currency || '₹';

  // Pipeline metrics
  const pipelineValue = deals.filter(d => d.stage !== 'lost').reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const wonDeals = deals.filter(d => d.stage === 'won');
  const lostDeals = deals.filter(d => d.stage === 'lost');
  const winRate = wonDeals.length + lostDeals.length > 0 ? Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100) : 0;

  // Product metrics
  const lowStockProducts = products.filter(p => p.is_active && p.stock_quantity <= p.low_stock_threshold);
  const outOfStockProducts = products.filter(p => p.is_active && p.stock_quantity === 0);

  // Invoice metrics
  const unpaidInvoices = invoices.filter(i => i.payment_status === 'unpaid' || i.payment_status === 'partial');
  const outstandingAmount = unpaidInvoices.reduce((sum, i) => sum + (i.grand_total - i.amount_paid), 0);
  const overdueInvoices = invoices.filter(i => (i.payment_status === 'unpaid' || i.payment_status === 'partial') && new Date(i.due_date) < new Date());
  const paidThisMonth = invoices.filter(i => i.payment_status === 'paid').reduce((sum, i) => sum + i.amount_paid, 0);
  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    qualifiedLeads: leads.filter(l => l.is_qualified).length,
    totalQuotations: quotations.length,
    draftQuotations: quotations.filter(q => q.status === 'draft').length,
    acceptedQuotations: quotations.filter(q => q.status === 'accepted').length
  };
  const recentLeads = leads.slice(0, 5);
  const recentQuotations = quotations.slice(0, 5);
  const recentDeals = deals.slice(0, 5);
  return <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-sans">Dashboard</h1>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">
                {currency}{pipelineValue.toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-serif">Pipeline Value</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{deals.length}</div>
              <p className="text-sm text-muted-foreground mt-1 font-sans">Active Deals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-success">{wonDeals.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Won Deals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{winRate}%</div>
              <p className="text-sm text-muted-foreground mt-1">Win Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Invoice & Product Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-destructive">
                {currency}{outstandingAmount.toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-sans">Outstanding</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-warning">{overdueInvoices.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Overdue Invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{products.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Products</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-warning">{lowStockProducts.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Low Stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Lead & Quotation Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="text-3xl font-bold">{stats.totalQuotations}</div>
              <p className="text-sm text-muted-foreground mt-1">Quotations</p>
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
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Deals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Deals</CardTitle>
              <Link to="/pipeline">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentDeals.length === 0 ? <p className="text-muted-foreground">No deals yet</p> : <div className="space-y-3">
                  {recentDeals.map(deal => <Link key={deal.id} to={`/deals/${deal.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium">{deal.lead?.company_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {currency}{(deal.deal_value || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">{deal.stage}</Badge>
                    </Link>)}
                </div>}
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Leads</CardTitle>
              <Link to="/leads">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {leadsLoading ? <p className="text-muted-foreground">Loading...</p> : recentLeads.length === 0 ? <p className="text-muted-foreground">No leads yet</p> : <div className="space-y-3">
                  {recentLeads.map(lead => <Link key={lead.id} to={`/leads/${lead.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium font-sans">{lead.company_name}</p>
                        <p className="text-sm text-muted-foreground">{lead.contact_name}</p>
                      </div>
                      <LeadStatusBadge status={lead.status} />
                    </Link>)}
                </div>}
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
              {quotationsLoading ? <p className="text-muted-foreground">Loading...</p> : recentQuotations.length === 0 ? <p className="text-muted-foreground">No quotations yet</p> : <div className="space-y-3">
                  {recentQuotations.map(quotation => <Link key={quotation.id} to={`/quotations/${quotation.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium font-sans">{quotation.quote_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {quotation.lead?.company_name || 'Unknown'}
                        </p>
                      </div>
                      <QuotationStatusBadge status={quotation.status} />
                    </Link>)}
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>;
}