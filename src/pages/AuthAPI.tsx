import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuthFormAPI } from "@/components/auth/AuthFormAPI";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoNewStandard from '@/assets/logo-newstandard.png';

const AuthAPI = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-accent relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header with Logo */}
      <header className="relative z-10 p-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={logoNewStandard} alt="NewWar" className="h-12 w-auto object-contain" />
      </header>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-88px)] p-4">
        <div className="w-full max-w-md">
          <AuthFormAPI />
        </div>
      </div>
    </div>
  );
};

export default AuthAPI;
