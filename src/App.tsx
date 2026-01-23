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
import Deals from "./pages/Deals";
import Quotations from "./pages/Quotations";
import QuotationEditor from "./pages/QuotationEditor";
import Settings from "./pages/Settings";
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
import NotificationPreferences from "./pages/NotificationPreferences";
import WorkflowBuilder from "./pages/WorkflowBuilder";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
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
            <Route path="/settings/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
            <Route path="/settings/automation" element={<ProtectedRoute><AutomationSettings /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
            <Route path="/settings/workflow-builder" element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
            <Route path="/email-logs" element={<ProtectedRoute><EmailLogs /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
