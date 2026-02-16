import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import BusinessCardScannerPage from "./pages/BusinessCardScanner";
import Deals from "./pages/Deals";
import Quotations from "./pages/Quotations";
import QuotationEditor from "./pages/QuotationEditor";
import Settings from "./pages/Settings";
import CompanySettings from "./pages/CompanySettings";
import EmailSettings from "./pages/EmailSettings";
import BillingSettings from "./pages/BillingSettings";
import NotificationSettings from "./pages/NotificationSettings";
import Pipeline from "./pages/Pipeline";
import Products from "./pages/Products";
import ProductCategories from "./pages/ProductCategories";
import Invoices from "./pages/Invoices";
import InvoiceEditor from "./pages/InvoiceEditor";
import DealDetail from "./pages/DealDetail";
import NotFound from "./pages/NotFound";
import EmailLogs from "./pages/EmailLogs";
import TeamManagement from "./pages/TeamManagement";
import AutomationSettings from "./pages/AutomationSettings";
import AutomationDiagnostics from "./pages/AutomationDiagnostics";
import NotificationPreferences from "./pages/NotificationPreferences";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import Workflows from "./pages/Workflows";
import WorkflowEditor from "./pages/WorkflowEditor";
import Meetings from "./pages/Meetings";
import Hierarchy from "./pages/settings/Hierarchy";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
            <Route path="/business-card-scanner" element={<ProtectedRoute><BusinessCardScannerPage /></ProtectedRoute>} />
            <Route path="/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
            <Route path="/quotations/:id" element={<ProtectedRoute><QuotationEditor /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
            <Route path="/deals/:id" element={<ProtectedRoute><DealDetail /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/products/categories" element={<ProtectedRoute><ProductCategories /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/company" element={<ProtectedRoute><CompanySettings /></ProtectedRoute>} />
            <Route path="/settings/hierarchy" element={<ProtectedRoute><Hierarchy /></ProtectedRoute>} />
            <Route path="/settings/email" element={<ProtectedRoute><EmailSettings /></ProtectedRoute>} />
            <Route path="/settings/billing" element={<ProtectedRoute><BillingSettings /></ProtectedRoute>} />
            <Route path="/settings/notifications-config" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
            <Route path="/settings/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
            <Route path="/settings/automation" element={<ProtectedRoute><AutomationSettings /></ProtectedRoute>} />
            <Route path="/settings/automation/diagnostics" element={<ProtectedRoute><AutomationDiagnostics /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
            <Route path="/settings/workflows" element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
            <Route path="/settings/workflows/:id" element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
            <Route path="/email-logs" element={<ProtectedRoute><EmailLogs /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
