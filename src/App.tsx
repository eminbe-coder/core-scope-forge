import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { TenantProvider } from "@/hooks/use-tenant";
import { PermissionsProvider } from "@/hooks/use-permissions";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Companies from "./pages/Companies";
import AddCompany from "./pages/AddCompany";
import EditCompany from "./pages/EditCompany";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Sites from "./pages/Sites";
import AddSite from "./pages/AddSite";
import SiteDetail from "./pages/SiteDetail";
import EditSite from "./pages/EditSite";
import Contacts from "./pages/Contacts";
import AddContact from "./pages/AddContact";
import Leads from "./pages/Leads";
import AddLead from "./pages/AddLead";
import LeadDetail from "./pages/LeadDetail";
import Deals from "./pages/Deals";
import AddDeal from "./pages/AddDeal";
import EditDeal from "./pages/EditDeal";
import Projects from "./pages/Projects";
import Activities from "./pages/Activities";
import Todos from "./pages/Todos";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import GlobalAdmin from "./pages/GlobalAdmin";
import UsersRoles from "./pages/UsersRoles";
import Pricing from "./pages/Pricing";
import Devices from "./pages/Devices";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TenantProvider>
          <PermissionsProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Index />} />
                <Route path="/companies" element={
                  <ProtectedRoute>
                    <Companies />
                  </ProtectedRoute>
                } />
                <Route path="/companies/add" element={
                  <ProtectedRoute>
                    <AddCompany />
                  </ProtectedRoute>
                } />
                <Route path="/companies/edit/:id" element={
                  <ProtectedRoute>
                    <EditCompany />
                  </ProtectedRoute>
                } />
                <Route path="/customers" element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                } />
                <Route path="/customers/:id" element={
                  <ProtectedRoute>
                    <CustomerDetail />
                  </ProtectedRoute>
                } />
                <Route path="/sites" element={
                  <ProtectedRoute>
                    <Sites />
                  </ProtectedRoute>
                } />
                <Route path="/add-site" element={
                  <ProtectedRoute>
                    <AddSite />
                  </ProtectedRoute>
                } />
                <Route path="/sites/:id" element={
                  <ProtectedRoute>
                    <SiteDetail />
                  </ProtectedRoute>
                } />
                <Route path="/sites/edit/:id" element={
                  <ProtectedRoute>
                    <EditSite />
                  </ProtectedRoute>
                } />
                <Route path="/contacts" element={
                  <ProtectedRoute>
                    <Contacts />
                  </ProtectedRoute>
                } />
                <Route path="/contacts/add" element={
                  <ProtectedRoute>
                    <AddContact />
                  </ProtectedRoute>
                 } />
                 <Route path="/leads" element={
                   <ProtectedRoute>
                     <Leads />
                   </ProtectedRoute>
                 } />
                 <Route path="/leads/add" element={
                   <ProtectedRoute>
                     <AddLead />
                   </ProtectedRoute>
                 } />
                 <Route path="/leads/:type/:id" element={
                   <ProtectedRoute>
                     <LeadDetail />
                   </ProtectedRoute>
                 } />
                 <Route path="/deals" element={
                   <ProtectedRoute>
                     <Deals />
                   </ProtectedRoute>
                } />
                <Route path="/deals/add" element={
                  <ProtectedRoute>
                    <AddDeal />
                  </ProtectedRoute>
                } />
                <Route path="/deals/edit/:id" element={
                  <ProtectedRoute>
                    <EditDeal />
                  </ProtectedRoute>
                } />
                <Route path="/projects" element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                } />
                <Route path="/activities" element={
                  <ProtectedRoute>
                    <Activities />
                  </ProtectedRoute>
                } />
                <Route path="/todos" element={
                  <ProtectedRoute>
                    <Todos />
                  </ProtectedRoute>
                } />
                <Route path="/devices" element={
                  <ProtectedRoute>
                    <Devices />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/global-admin" element={
                  <ProtectedRoute>
                    <GlobalAdmin />
                  </ProtectedRoute>
                } />
                <Route path="/users-roles" element={
                  <ProtectedRoute>
                    <UsersRoles />
                  </ProtectedRoute>
                } />
                <Route path="/pricing" element={
                  <ProtectedRoute>
                    <Pricing />
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </PermissionsProvider>
        </TenantProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
