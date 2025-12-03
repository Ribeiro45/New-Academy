import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { EditorRoute } from "@/components/admin/EditorRoute";
import { LeaderRoute } from "@/components/admin/LeaderRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthAPI from "./pages/AuthAPI";
import Demo from "./pages/Demo";
import Dashboard from "./pages/Dashboard";
import MyCourses from "./pages/MyCourses";
import Courses from "./pages/Courses";
import Course from "./pages/Course";
import Certificates from "./pages/Certificates";
import Profile from "./pages/Profile";
import FAQ from "./pages/FAQ";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import ConfirmEmail from "./pages/ConfirmEmail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminCoursesManagement from "./pages/admin/AdminCoursesManagement";
import AdminSiteSettings from "./pages/admin/AdminSiteSettings";
import AdminCourseAccess from "./pages/admin/AdminCourseAccess";
import AdminDemo from "./pages/admin/AdminDemo";
import AdminFAQ from "./pages/admin/AdminFAQ";
import AdminManagement from "./pages/admin/AdminManagement";
import LeaderGroup from "./pages/LeaderGroup";
import NotFound from "./pages/NotFound";

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth-api" element={<AuthAPI />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:id" element={<Course />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/courses" element={<EditorRoute><AdminCoursesManagement /></EditorRoute>} />
            <Route path="/admin/management" element={<AdminRoute><AdminManagement /></AdminRoute>} />
            <Route path="/admin/course-access" element={<AdminRoute><AdminCourseAccess /></AdminRoute>} />
            <Route path="/admin/faq" element={<AdminRoute><AdminFAQ /></AdminRoute>} />
            <Route path="/admin/demo" element={<AdminRoute><AdminDemo /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSiteSettings /></AdminRoute>} />
            <Route path="/leader/group" element={<LeaderRoute><LeaderGroup /></LeaderRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
