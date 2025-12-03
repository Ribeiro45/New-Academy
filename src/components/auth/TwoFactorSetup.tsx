import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Smartphone, Key, CheckCircle2, XCircle } from "lucide-react";
import QRCode from "react-qr-code";

interface TwoFactorSetupProps {
  onComplete?: () => void;
}

export const TwoFactorSetup = ({ onComplete }: TwoFactorSetupProps) => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState(""); // Armazenar o factor ID
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;

      const totpFactor = data?.totp?.find(factor => factor.status === 'verified');
      setIs2FAEnabled(!!totpFactor);
    } catch (error: any) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const enrollMFA = async () => {
    try {
      setLoading(true);

      // First, check and remove any unverified factors
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      const unverifiedFactors = existingFactors?.totp?.filter(f => f.status !== 'verified');
      
      if (unverifiedFactors && unverifiedFactors.length > 0) {
        for (const factor of unverifiedFactors) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      // Now enroll a new factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Autenticador'
      });

      if (error) throw error;

      // Armazenar o factor ID para usar na verificação
      setFactorId(data.id);
      setQrCode(data.totp.uri);
      setSecret(data.totp.secret);
      toast.success('Escaneie o QR Code com seu aplicativo autenticador!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao configurar 2FA');
      console.error('Error enrolling MFA:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    try {
      if (verifyCode.length !== 6) {
        toast.error('O código deve ter 6 dígitos');
        return;
      }

      if (!factorId) {
        toast.error('Erro: ID do fator não encontrado. Por favor, comece novamente.');
        setQrCode('');
        setSecret('');
        return;
      }

      setLoading(true);

      // Create a challenge for the factor
      const challenge = await supabase.auth.mfa.challenge({
        factorId: factorId
      });

      if (challenge.error) throw challenge.error;

      // Verify the code with the challenge
      const verify = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });

      if (verify.error) throw verify.error;

      toast.success('2FA ativado com sucesso!');
      setIs2FAEnabled(true);
      setQrCode('');
      setSecret('');
      setFactorId('');
      setVerifyCode('');
      onComplete?.();
    } catch (error: any) {
      toast.error(error.message || 'Código inválido. Verifique se está usando o código correto do autenticador.');
      console.error('Error verifying MFA:', error);
    } finally {
      setLoading(false);
    }
  };

  const unenrollMFA = async () => {
    try {
      setLoading(true);

      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const totpFactor = data?.totp?.find(factor => factor.status === 'verified');
      if (!totpFactor) throw new Error('Nenhum fator MFA encontrado');

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id,
      });

      if (error) throw error;

      toast.success('2FA desativado com sucesso!');
      setIs2FAEnabled(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao desativar 2FA');
      console.error('Error unenrolling MFA:', error);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            Verificando status do 2FA...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Autenticação de Dois Fatores (2FA)</CardTitle>
        </div>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {is2FAEnabled ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">2FA Ativado</p>
                  <p className="text-sm text-muted-foreground">Sua conta está protegida</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium">2FA Desativado</p>
                  <p className="text-sm text-muted-foreground">Ative para mais segurança</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Setup Process */}
        {!is2FAEnabled && !qrCode && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Como Funciona
              </h4>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Baixe um app autenticador (Google Authenticator, Authy, etc.)</li>
                <li>Clique em "Ativar 2FA" e escaneie o QR Code</li>
                <li>Digite o código de 6 dígitos gerado pelo app</li>
                <li>Pronto! Sua conta está protegida</li>
              </ol>
            </div>

            <Button 
              onClick={enrollMFA} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Shield className="w-4 h-4 mr-2" />
              Ativar 2FA
            </Button>
          </div>
        )}

        {/* QR Code Display */}
        {qrCode && !is2FAEnabled && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <h4 className="font-medium text-center">Escaneie o QR Code</h4>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCode value={qrCode} size={200} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Ou digite este código manualmente:
              </Label>
              <div className="p-3 bg-muted rounded-lg font-mono text-sm text-center select-all">
                {secret}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-code">
                Digite o código de 6 dígitos do app
              </Label>
              <Input
                id="verify-code"
                type="text"
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={verifyMFA} 
                disabled={loading || verifyCode.length !== 6}
                className="flex-1"
              >
                Verificar e Ativar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setQrCode('');
                  setSecret('');
                  setFactorId('');
                  setVerifyCode('');
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Disable 2FA */}
        {is2FAEnabled && (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Desativar o 2FA tornará sua conta menos segura. Você não precisará mais de um código
                do autenticador para fazer login.
              </p>
            </div>

            <Button 
              variant="destructive" 
              onClick={unenrollMFA} 
              disabled={loading}
              className="w-full"
            >
              Desativar 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
