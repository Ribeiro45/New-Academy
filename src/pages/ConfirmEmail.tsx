import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import logoNewStandard from '@/assets/logo-newstandard.png';
import { api } from "@/lib/api";

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de confirmação inválido.');
      return;
    }

    confirmEmail();
  }, [token]);

  const confirmEmail = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/confirm-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao confirmar email');
      }

      setStatus('success');
      setMessage('Email confirmado com sucesso!');
      toast.success('Email confirmado! Você já pode fazer login.');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Erro ao confirmar email. O link pode ter expirado.');
    }
  };

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
              status === 'loading' ? 'bg-primary/10' :
              status === 'success' ? 'bg-green-100 dark:bg-green-900/20' :
              'bg-destructive/10'
            }`}>
              {status === 'loading' && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
              {status === 'success' && <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />}
              {status === 'error' && <XCircle className="w-8 h-8 text-destructive" />}
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {status === 'loading' && 'Confirmando Email...'}
            {status === 'success' && 'Email Confirmado!'}
            {status === 'error' && 'Erro na Confirmação'}
          </CardTitle>
          <CardDescription className="text-center">
            {message || 'Aguarde enquanto confirmamos seu email...'}
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
          
          {status === 'error' && (
            <>
              <Button 
                className="w-full" 
                onClick={() => navigate('/auth')}
              >
                Ir para Login
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Se você ainda não confirmou seu email, tente fazer login para solicitar um novo link.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
