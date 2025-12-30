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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initializeRecovery = async () => {
      try {
        // Check URL for PKCE code (query string) or hash tokens
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const hashType = hashParams.get('type');
        
        console.log("Recovery init:", { 
          hasCode: !!code, 
          hasAccessToken: !!accessToken, 
          hashType,
          fullUrl: window.location.href 
        });

        // PKCE flow: exchange code for session
        if (code) {
          console.log("PKCE flow detected - exchanging code for session");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error("Error exchanging code:", error);
            if (isMounted) {
              setErrorMessage("O link de recuperação expirou ou já foi utilizado.");
              setHasSession(false);
              setChecking(false);
            }
            return;
          }
          
          if (data.session) {
            console.log("PKCE session established successfully");
            if (isMounted) {
              setHasSession(true);
              setChecking(false);
            }
            return;
          }
        }

        // Hash-based flow (implicit): check for access_token in hash
        if (accessToken && hashType === 'recovery') {
          console.log("Hash-based recovery detected");
          // Supabase will automatically pick up the hash tokens
          const { data: { session } } = await supabase.auth.getSession();
          if (session && isMounted) {
            console.log("Session established from hash tokens");
            setHasSession(true);
            setChecking(false);
            return;
          }
        }

        // Set up listener for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("Auth state change:", event, !!session);
          
          if (!isMounted) return;
          
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            console.log("Recovery session established via auth state change");
            setHasSession(true);
            setChecking(false);
          }
        });

        // Final check: see if there's already a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          console.log("Existing session found");
          setHasSession(true);
          setChecking(false);
          return;
        }

        // Wait a bit more for auth state to settle (Supabase processes hash async)
        setTimeout(() => {
          if (isMounted && checking) {
            console.log("Timeout reached - no session established");
            setChecking(false);
          }
        }, 2000);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error in recovery init:", error);
        if (isMounted) {
          setErrorMessage("Ocorreu um erro ao processar o link de recuperação.");
          setChecking(false);
        }
      }
    };

    initializeRecovery();

    return () => {
      isMounted = false;
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
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Verificando link de recuperação...</p>
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
              {errorMessage || "O link de recuperação de senha é inválido ou expirou."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Links de recuperação só podem ser usados uma vez e expiram em 1 hora.
            </p>
            <Button 
              className="w-full" 
              onClick={() => navigate('/forgot-password')}
            >
              Solicitar Novo Link
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
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
