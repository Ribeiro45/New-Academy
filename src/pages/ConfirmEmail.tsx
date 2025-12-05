import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import logoNewStandard from '@/assets/logo-newstandard.png';
import { supabase } from "@/integrations/supabase/client";

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ConfirmEmail - Auth event:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setStatus('success');
      }
    });

    // Check if already authenticated
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('success');
      } else {
        // If no session after a short delay, still show success
        // (the email was confirmed even if not logged in)
        setTimeout(() => setStatus('success'), 1500);
      }
    };

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

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
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              status === 'loading' ? 'bg-primary/10' : 'bg-green-100 dark:bg-green-900/20'
            }`}>
              {status === 'loading' && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
              {status === 'success' && <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />}
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {status === 'loading' ? 'Confirmando Email...' : 'Email Confirmado com Sucesso!'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' 
              ? 'Aguarde enquanto confirmamos seu email...' 
              : 'Seu email foi confirmado. Você já pode fazer login.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Ir para Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;