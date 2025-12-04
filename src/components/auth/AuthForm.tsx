import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Shield, Building, CreditCard } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import logoNWhite from "@/assets/logo-n-white.png";
import { EMAIL_REDIRECTS } from "@/config/emailRedirects";
const authSchema = z.object({
  email: z.string().min(1, "Email é obrigatório").email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(100, "Senha muito longa").regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula").regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula").regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo").regex(/^[A-Za-zÀ-ÿ\s\-]+$/, "Nome deve conter apenas letras, espaços e hífens").optional()
});
const cpfSchema = z.string().regex(/^\d{11}$/, "CPF inválido - deve conter 11 dígitos");
const cnpjSchema = z.string().regex(/^\d{14}$/, "CNPJ inválido - deve conter 14 dígitos");
export const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [userType, setUserType] = useState<"colaborador" | "cliente">("colaborador");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [show2FAChallenge, setShow2FAChallenge] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [allowClientRegistration, setAllowClientRegistration] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchRegistrationSettings = async () => {
      const {
        data
      } = await supabase.from('site_settings').select('setting_value').eq('setting_key', 'registration_settings').maybeSingle();
      if (data?.setting_value) {
        const settings = data.setting_value as {
          allow_client_registration: boolean;
        };
        setAllowClientRegistration(settings.allow_client_registration);
      }
    };
    fetchRegistrationSettings();
  }, []);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Marcar que um login está em progresso para evitar redirecionamentos prematuros
      sessionStorage.setItem('login_in_progress', 'true');

      // Limpar qualquer estado de 2FA anterior ao iniciar novo login
      sessionStorage.removeItem('awaiting_2fa_verification');
      sessionStorage.removeItem('mfa_factor_id');
      sessionStorage.removeItem('mfa_challenge_id');
      setShow2FAChallenge(false);
      setMfaCode('');

      // Validar CPF/CNPJ baseado no tipo de usuário
      if (userType === 'colaborador') {
        if (!cpf) {
          toast.error("CPF é obrigatório para Colaborador New");
          return;
        }
        try {
          cpfSchema.parse(cpf.replace(/\D/g, ''));
        } catch {
          toast.error("CPF inválido - deve conter 11 dígitos");
          return;
        }
      }
      if (userType === 'cliente') {
        if (!cnpj) {
          toast.error("CNPJ é obrigatório para Cliente");
          return;
        }
        try {
          cnpjSchema.parse(cnpj.replace(/\D/g, ''));
        } catch {
          toast.error("CNPJ inválido - deve conter 14 dígitos");
          return;
        }
      }
      const validatedData = authSchema.parse({
        email: email.trim(),
        password
      });
      setLoading(true);
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password
      });
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Por favor, confirme seu email antes de fazer login.');
          return;
        }
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
          return;
        }
        throw error;
      }
      if (!data.user) {
        toast.error('Erro ao fazer login');
        return;
      }

      // Verificar CPF/CNPJ corresponde ao usuário
      if (userType === 'colaborador') {
        const {
          data: profile
        } = await supabase.from('profiles').select('cpf, user_type').eq('id', data.user.id).single();
        if (!profile || profile.user_type !== 'colaborador') {
          await supabase.auth.signOut();
          toast.error('Este usuário é cadastrado como Cliente. Por favor, selecione a opção correta para fazer login.');
          return;
        }
        if (profile.cpf !== cpf.replace(/\D/g, '')) {
          await supabase.auth.signOut();
          toast.error('CPF não corresponde ao cadastrado para este usuário');
          return;
        }
      }
      if (userType === 'cliente') {
        const {
          data: profile
        } = await supabase.from('profiles').select('user_type').eq('id', data.user.id).single();
        if (!profile || profile.user_type !== 'cliente') {
          await supabase.auth.signOut();
          toast.error('Este usuário é cadastrado como Colaborador New. Por favor, selecione a opção correta para fazer login.');
          return;
        }
        const {
          data: companyProfile
        } = await supabase.from('company_profiles').select('cnpj').eq('user_id', data.user.id).single();
        if (!companyProfile || companyProfile.cnpj !== cnpj.replace(/\D/g, '')) {
          await supabase.auth.signOut();
          toast.error('CNPJ não corresponde ao cadastrado para este usuário');
          return;
        }
      }

      // CRITICAL: Check if 2FA is enabled BEFORE allowing access
      const {
        data: factorsData
      } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');
      console.log('MFA Status:', {
        hasFactors: !!factorsData?.totp?.length,
        factorStatus: factorsData?.totp?.[0]?.status,
        totpFactor
      });
      if (totpFactor) {
        console.log('2FA detected - user must verify on EVERY login');

        // CRITICAL: Seta a flag ANTES de criar o challenge para evitar race condition
        sessionStorage.setItem('awaiting_2fa_verification', 'true');

        // Create a fresh MFA challenge for EVERY login attempt
        const {
          data: challengeData,
          error: challengeError
        } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        });
        if (challengeError) {
          console.error('Challenge error:', challengeError);
          sessionStorage.removeItem('awaiting_2fa_verification');
          await supabase.auth.signOut();
          throw challengeError;
        }
        console.log('Challenge created successfully - 2FA required for this login:', challengeData);

        // Store challenge info
        setFactorId(totpFactor.id);
        setChallengeId(challengeData.id);
        sessionStorage.setItem('mfa_factor_id', totpFactor.id);
        sessionStorage.setItem('mfa_challenge_id', challengeData.id);

        // Show 2FA form - session remains active but unverified
        setShow2FAChallenge(true);
        console.log('2FA verification form displayed - awaiting code');
        toast.info('Digite o código do seu autenticador para completar o login');
        setLoading(false);
        return;
      }

      // No MFA - proceed with login
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao fazer login");
      }
    } finally {
      sessionStorage.removeItem('login_in_progress');
      setLoading(false);
    }
  };
  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mfaCode.length !== 6) {
        toast.error('O código deve ter 6 dígitos');
        return;
      }
      setLoading(true);

      // Get stored challenge info
      const storedFactorId = sessionStorage.getItem('mfa_factor_id') || factorId;
      const storedChallengeId = sessionStorage.getItem('mfa_challenge_id') || challengeId;
      console.log('Verifying MFA code with factorId:', storedFactorId, 'challengeId:', storedChallengeId);

      // Verify the MFA code (session should still be active)
      const {
        data: verifyData,
        error: verifyError
      } = await supabase.auth.mfa.verify({
        factorId: storedFactorId,
        challengeId: storedChallengeId,
        code: mfaCode
      });
      if (verifyError) {
        console.error('MFA verification error:', verifyError);
        toast.error('Código inválido. Verifique seu autenticador e tente novamente.');
        return;
      }

      // Verificações já foram feitas no login inicial, apenas prosseguir

      // Clear 2FA flow markers
      sessionStorage.removeItem('awaiting_2fa_verification');
      sessionStorage.removeItem('mfa_factor_id');
      sessionStorage.removeItem('mfa_challenge_id');
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao verificar código");
    } finally {
      setLoading(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate confirm password
      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }

      // Validate based on user type
      if (userType === 'colaborador') {
        if (!cpf) {
          toast.error("CPF é obrigatório");
          return;
        }
        cpfSchema.parse(cpf.replace(/\D/g, ''));

        // Check if CPF already exists
        const {
          data: existingCpf
        } = await supabase.from('profiles').select('cpf').eq('cpf', cpf.replace(/\D/g, '')).maybeSingle();
        if (existingCpf) {
          toast.error("Este CPF já está cadastrado");
          return;
        }
      }
      if (userType === 'cliente') {
        if (!companyName || !cnpj) {
          toast.error("Preencha todos os campos da empresa");
          return;
        }
        cnpjSchema.parse(cnpj.replace(/\D/g, ''));

        // Check if CNPJ + company name combination exists
        const {
          data: existingCompany
        } = await supabase.from('company_profiles').select('cnpj, company_name').eq('cnpj', cnpj.replace(/\D/g, '')).eq('company_name', companyName.trim()).maybeSingle();
        if (existingCompany) {
          toast.error("Esta combinação de CNPJ e Nome da Empresa já está cadastrada");
          return;
        }
      }
      const validatedData = authSchema.parse({
        email: email.trim(),
        password,
        fullName: fullName.trim()
      });
      setLoading(true);
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            full_name: validatedData.fullName,
            user_type: userType
          },
          emailRedirectTo: EMAIL_REDIRECTS.emailConfirmation
        }
      });
      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('Este email já está cadastrado.');
          return;
        }
        throw error;
      }

      // Save CPF for colaborador
      if (userType === 'colaborador' && data.user) {
        const {
          error: profileError
        } = await supabase.from('profiles').update({
          cpf: cpf.replace(/\D/g, '')
        }).eq('id', data.user.id);
        if (profileError) {
          console.error('Erro ao salvar CPF:', profileError);
        }
      }

      // If client type, save company data
      if (userType === 'cliente' && data.user) {
        const {
          error: companyError
        } = await supabase.from('company_profiles').insert({
          user_id: data.user.id,
          company_name: companyName.trim(),
          cnpj: cnpj.replace(/\D/g, '')
        });
        if (companyError) {
          console.error('Erro ao salvar dados da empresa:', companyError);
        }
      }
      if (data.user) {
        toast.success("Conta criada! Verifique seu email para confirmar o cadastro.", {
          duration: 6000
        });
        setActiveTab("login");
        setPassword("");
        setConfirmPassword("");
        setFullName("");
        setCpf("");
        setCompanyName("");
        setCnpj("");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao criar conta");
      }
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!email) {
        toast.error("Por favor, informe seu email");
        return;
      }
      setLoading(true);
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: EMAIL_REDIRECTS.passwordReset
      });
      if (error) throw error;
      toast.success("Link de recuperação enviado!");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar link");
    } finally {
      setLoading(false);
    }
  };
  return <div className="w-full max-w-md mx-auto space-y-6 animate-scale-in">
      <div className="text-center space-y-2 animate-fade-in">
        <div className="inline-flex items-center justify-center mb-4">
          <img src={logoNWhite} alt="NewWar" className="w-24 h-24 object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-white">New Academy</h1>
        <p className="text-white/80">Entre ou crie sua conta para começar</p>
      </div>

      <Card className="border-2 backdrop-blur-sm bg-card/50 shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl text-center">
            {showForgotPassword ? "Recuperar Senha" : "Acessar Plataforma"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email
                </Label>
                <Input id="forgot-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                  Voltar ao Login
                </Button>
              </div>
            </form> : show2FAChallenge ? <form onSubmit={handleMFAVerify} className="space-y-4 animate-fade-in">
              <div className="text-center space-y-2 mb-6">
                <Shield className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Autenticação de Dois Fatores</h3>
                <p className="text-sm text-muted-foreground">
                  Digite o código de 6 dígitos do seu aplicativo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-code">Código de Verificação</Label>
                <Input id="mfa-code" type="text" placeholder="000000" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} className="text-center text-2xl tracking-widest" autoFocus />
              </div>

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading || mfaCode.length !== 6} size="lg">
                  {loading ? "Verificando..." : "Verificar Código"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => {
              setShow2FAChallenge(false);
              setMfaCode('');
              setFactorId('');
              setChallengeId('');
              sessionStorage.removeItem('awaiting_2fa_verification');
              sessionStorage.removeItem('mfa_factor_id');
              sessionStorage.removeItem('mfa_challenge_id');
              // Sign out to clear the partial session
              supabase.auth.signOut();
            }}>
                  Voltar ao Login
                </Button>
              </div>
            </form> : <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 animate-fade-in">
                <div className="space-y-3 mb-4">
                  <Label className="text-base font-medium">Tipo de Usuário</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant={userType === "colaborador" ? "default" : "outline"} className={cn("flex flex-col items-center gap-2 h-auto py-4 transition-all", userType === "colaborador" && "ring-2 ring-primary")} onClick={() => setUserType("colaborador")}>
                      <User className="w-6 h-6" />
                      <span className="text-sm font-medium">Colaborador New</span>
                    </Button>
                    <Button type="button" variant={userType === "cliente" ? "default" : "outline"} className={cn("flex flex-col items-center gap-2 h-auto py-4 transition-all", userType === "cliente" && "ring-2 ring-primary")} onClick={() => setUserType("cliente")}>
                      <Building className="w-6 h-6" />
                      <span className="text-sm font-medium">Cliente</span>
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email
                    </Label>
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>

                  {userType === 'colaborador' && <div className="space-y-2">
                      <Label htmlFor="login-cpf" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        CPF
                      </Label>
                      <Input id="login-cpf" type="text" placeholder="000.000.000-00" value={cpf} onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCpf(value);
                }} maxLength={11} required />
                    </div>}

                  {userType === 'cliente' && <div className="space-y-2">
                      <Label htmlFor="login-cnpj" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        CNPJ
                      </Label>
                      <Input id="login-cnpj" type="text" placeholder="00.000.000/0000-00" value={cnpj} onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCnpj(value);
                }} maxLength={14} required />
                    </div>}

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Senha
                    </Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading} size="lg">
                    {loading ? "Entrando..." : "Entrar"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <Button type="button" variant="link" className="w-full text-sm" onClick={() => navigate('/forgot-password')}>
                    Esqueci minha senha
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 animate-fade-in">
                <div className="space-y-3 mb-4">
                  <Label className="text-base font-medium">Tipo de Cadastro</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant={userType === "colaborador" ? "default" : "outline"} className={cn("flex flex-col items-center gap-2 h-auto py-4 transition-all", userType === "colaborador" && "ring-2 ring-primary")} onClick={() => setUserType("colaborador")}>
                      <User className="w-6 h-6" />
                      <span className="text-sm font-medium">Colaborador New</span>
                    </Button>
                    <Button type="button" variant={userType === "cliente" ? "default" : "outline"} className={cn("flex flex-col items-center gap-2 h-auto py-4 transition-all", userType === "cliente" && "ring-2 ring-primary", !allowClientRegistration && "opacity-50 cursor-not-allowed")} onClick={() => allowClientRegistration && setUserType("cliente")} disabled={!allowClientRegistration} title={!allowClientRegistration ? "Cadastro de clientes temporariamente desabilitado" : ""}>
                      <Building className="w-6 h-6" />
                      <span className="text-sm font-medium">Cliente</span>
                      {!allowClientRegistration && <span className="text-xs text-muted-foreground">(Em breve)</span>}
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      {userType === 'cliente' ? 'Nome do Responsável' : 'Nome Completo'}
                    </Label>
                    <Input id="signup-name" type="text" placeholder={userType === 'cliente' ? "Nome do responsável" : "Seu nome completo"} value={fullName} onChange={e => {
                  const value = e.target.value;
                  // Permite apenas letras, espaços e hífens
                  if (value === '' || /^[A-Za-zÀ-ÿ\s\-]+$/.test(value)) {
                    setFullName(value);
                  }
                }} required />
                  </div>

                  {userType === 'colaborador' && <div className="space-y-2">
                      <Label htmlFor="cpf" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        CPF
                      </Label>
                      <Input id="cpf" type="text" placeholder="000.000.000-00" value={cpf} onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCpf(value);
                }} maxLength={11} required />
                    </div>}

                  {userType === 'cliente' && <>
                      <div className="space-y-2">
                        <Label htmlFor="company-name" className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-primary" />
                          Nome da Empresa
                        </Label>
                        <Input id="company-name" type="text" placeholder="Razão social da empresa" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cnpj" className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          CNPJ
                        </Label>
                        <Input id="cnpj" type="text" placeholder="00.000.000/0000-00" value={cnpj} onChange={e => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCnpj(value);
                  }} maxLength={14} required />
                      </div>
                    </>}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email
                    </Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Senha
                    </Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Confirmar Senha
                    </Label>
                    <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading} size="lg">
                    {loading ? "Criando conta..." : "Criar Conta"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>}
        </CardContent>
      </Card>
    </div>;
};