import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, AlertCircle, Loader2 } from "lucide-react";
import logoNewStandard from '@/assets/logo-newstandard.png';
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // Check if user has a valid recovery session
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Listen for auth state changes FIRST (recovery link triggers this)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, !!session);
      
      // PASSWORD_RECOVERY is the key event when user clicks reset link
      if (event === 'PASSWORD_RECOVERY') {
        console.log("PASSWORD_RECOVERY event detected - allowing password reset");
        setHasSession(true);
        setChecking(false);
        clearTimeout(timeoutId);
      } else if (event === 'SIGNED_IN' && session) {
        // User might already be signed in via the recovery flow
        console.log("SIGNED_IN event with session - allowing password reset");
        setHasSession(true);
        setChecking(false);
        clearTimeout(timeoutId);
      }
    });

    // Check for existing session after listener is set up
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log("Recovery session check:", { session: !!session, error });
        
        // If we have a session and URL contains recovery tokens, allow reset
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasRecoveryToken = hashParams.get('type') === 'recovery' || 
                                 hashParams.get('access_token') !== null;
        
        if (session || hasRecoveryToken) {
          console.log("Valid session or recovery token found");
          setHasSession(true);
          setChecking(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    // Give Supabase time to process the URL hash tokens
    timeoutId = setTimeout(() => {
      checkSession().then(() => {
        // If still no session after check, wait a bit more for auth state change
        setTimeout(() => {
          setChecking(false);
        }, 1000);
      });
    }, 500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Error updating password:", error);
        toast.error(error.message || "Erro ao redefinir senha");
        return;
      }

      toast.success("Senha alterada com sucesso!");
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || "Erro ao redefinir senha. O link pode ter expirado.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-accent relative overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="absolute top-6 left-6">
          <img src={logoNewStandard} alt="New Academy" className="h-12 w-auto object-contain" />
        </div>

        <Card className="w-full max-w-md relative z-10 shadow-elegant">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // No valid session - show error
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-accent relative overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="absolute top-6 left-6">
          <img src={logoNewStandard} alt="New Academy" className="h-12 w-auto object-contain" />
        </div>

        <Card className="w-full max-w-md relative z-10 shadow-elegant">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Link Inválido</CardTitle>
            <CardDescription className="text-center">
              O link de recuperação de senha é inválido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/forgot-password')}
            >
              Solicitar Novo Link
            </Button>
            <Button 
              variant="ghost" 
              className="w-full mt-2"
              onClick={() => navigate('/auth')}
            >
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-accent relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-6">
        <img src={logoNewStandard} alt="New Academy" className="h-12 w-auto object-contain" />
      </div>

      {/* Card */}
      <Card className="w-full max-w-md relative z-10 shadow-elegant">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
