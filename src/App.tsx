import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoomTabsProvider } from "@/contexts/RoomTabsContext";
import { AuthForm } from "@/components/auth/AuthForm";
import NewHomePage from "./pages/NewHomePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import FriendsPage from "./pages/FriendsPage";
import ChatroomsPage from "./pages/ChatroomsPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import PrivateMessagesPage from "./pages/PrivateMessagesPage";
import StorePage from "./pages/StorePage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import LeaderboardsPage from "./pages/LeaderboardsPage";
import ContestsPage from "./pages/ContestsPage";
import DailySpinPage from "./pages/DailySpinPage";
import PeoplePage from "./pages/PeoplePage";
import NewsPage from "./pages/NewsPage";
import TermsPage from "./pages/TermsPage";
import HelpPage from "./pages/BimoWorld";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
          <span className="text-3xl">💬</span>
        </div>
        <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/" element={<ProtectedRoute><NewHomePage /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/chatrooms" element={<ProtectedRoute><ChatroomsPage /></ProtectedRoute>} />
      <Route path="/chat/:roomId" element={<ProtectedRoute><ChatRoomPage /></ProtectedRoute>} />
      <Route path="/messages/:conversationId" element={<ProtectedRoute><PrivateMessagesPage /></ProtectedRoute>} />
      <Route path="/store" element={<ProtectedRoute><StorePage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/user/:userId" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
      <Route path="/leaderboards" element={<ProtectedRoute><LeaderboardsPage /></ProtectedRoute>} />
      <Route path="/contests" element={<ProtectedRoute><ContestsPage /></ProtectedRoute>} />
      <Route path="/daily-spin" element={<ProtectedRoute><DailySpinPage /></ProtectedRoute>} />
      {/* people section */}
      <Route path="/people" element={<ProtectedRoute><PeoplePage /></ProtectedRoute>} />
      <Route path="/news" element={<ProtectedRoute><NewsPage /></ProtectedRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RoomTabsProvider>
            <AppRoutes />
          </RoomTabsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
