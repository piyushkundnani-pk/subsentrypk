import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import SubscriptionsList from "./pages/SubscriptionsList";
import AddEditSubscription from "./pages/AddEditSubscription";
import SubscriptionDetail from "./pages/SubscriptionDetail";
import Reminders from "./pages/Reminders";
import Settings from "./pages/Settings";
import CleanupRenewals from "./pages/CleanupRenewals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/setup"
                element={
                  <ProtectedRoute>
                    <Setup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscriptions"
                element={
                  <ProtectedRoute>
                    <SubscriptionsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add-subscription"
                element={
                  <ProtectedRoute>
                    <AddEditSubscription />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-subscription/:id"
                element={
                  <ProtectedRoute>
                    <AddEditSubscription />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription/:id"
                element={
                  <ProtectedRoute>
                    <SubscriptionDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reminders"
                element={
                  <ProtectedRoute>
                    <Reminders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cleanup-renewals"
                element={
                  <ProtectedRoute>
                    <CleanupRenewals />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
