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
import AcceptInvitation from "./pages/AcceptInvitation";
import SetPassword from "./pages/SetPassword";
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
import EditContact from "./pages/EditContact";
import AddCustomer from "./pages/AddCustomer";
import EditCustomer from "./pages/EditCustomer";
import Leads from "./pages/Leads";
import AddLead from "./pages/AddLead";
import LeadDetail from "./pages/LeadDetail";
import Deals from "./pages/Deals";
import AddDeal from "./pages/AddDeal";
import EditDeal from "./pages/EditDeal";
import Contracts from "./pages/Contracts";
import AddContract from "./pages/AddContract";
import ContractDetail from "./pages/ContractDetail";
import EditContract from "./pages/EditContract";
import NotificationCenter from "./pages/NotificationCenter";
import { ContractTestDashboard } from "./components/testing/ContractTestDashboard";
import Projects from "./pages/Projects";
import Activities from "./pages/Activities";
import Todos from "./pages/Todos";
import MyTodos from "./pages/MyTodos";
import Settings from "./pages/Settings";
import CRMSettings from "./pages/CRMSettings";
import TodoEngineSettings from "./pages/TodoEngineSettings";
import Admin from "./pages/Admin";
import GlobalAdmin from "./pages/GlobalAdmin";
import UsersRoles from "./pages/UsersRoles";
import Reports from "./pages/Reports";
import ReportBuilder from "./pages/ReportBuilder";
import ReportRunner from "./pages/ReportRunner";
import ScheduledReports from "./pages/ScheduledReports";
import TargetsCommissionReports from "./pages/TargetsCommissionReports";
import InstallmentDetail from "./pages/InstallmentDetail";
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
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/set-password" element={<SetPassword />} />
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
                  <Route path="/contacts/edit/:id" element={
                    <ProtectedRoute>
                      <EditContact />
                    </ProtectedRoute>
                  } />
                  <Route path="/customers/add" element={
                    <ProtectedRoute>
                      <AddCustomer />
                    </ProtectedRoute>
                  } />
                  <Route path="/customers/edit/:id" element={
                    <ProtectedRoute>
                      <EditCustomer />
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
                 <Route path="/contracts" element={
                   <ProtectedRoute>
                     <Contracts />
                   </ProtectedRoute>
                 } />
                 <Route path="/contracts/add" element={
                   <ProtectedRoute>
                     <AddContract />
                   </ProtectedRoute>
                 } />
                <Route path="/contracts/:id" element={
                    <ProtectedRoute>
                      <ContractDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/contracts/edit/:id" element={
                    <ProtectedRoute>
                      <EditContract />
                    </ProtectedRoute>
                  } />
                  <Route path="/notification-center" element={
                    <ProtectedRoute>
                      <NotificationCenter />
                    </ProtectedRoute>
                  } />
                  <Route path="/contract-tests" element={
                    <ProtectedRoute>
                      <ContractTestDashboard />
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
                 <Route path="/my-todos" element={
                   <ProtectedRoute>
                     <MyTodos />
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
                <Route path="/crm-settings" element={
                  <ProtectedRoute>
                    <CRMSettings />
                  </ProtectedRoute>
                } />
                <Route path="/todo-engine-settings" element={
                  <ProtectedRoute>
                    <TodoEngineSettings />
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
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/reports/new" element={
                  <ProtectedRoute>
                    <ReportBuilder />
                  </ProtectedRoute>
                } />
                <Route path="/reports/:id/edit" element={
                  <ProtectedRoute>
                    <ReportBuilder />
                  </ProtectedRoute>
                } />
                <Route path="/reports/:id/run" element={
                  <ProtectedRoute>
                    <ReportRunner />
                  </ProtectedRoute>
                } />
                <Route path="/scheduled-reports" element={
                  <ProtectedRoute>
                    <ScheduledReports />
                  </ProtectedRoute>
                } />
                 <Route path="/targets-commission-reports" element={
                   <ProtectedRoute>
                     <TargetsCommissionReports />
                   </ProtectedRoute>
                 } />
                 <Route path="/installments/:paymentId" element={
                   <ProtectedRoute>
                     <InstallmentDetail />
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
