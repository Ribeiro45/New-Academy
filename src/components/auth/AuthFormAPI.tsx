import { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const authSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100, "Senha muito longa")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  fullName: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[A-Za-zÀ-ÿ\s\-]+$/, "Nome deve conter apenas letras, espaços e hífens")
    .optional(),
});

const cpfSchema = z.string().regex(/^\d{11}$/, "CPF inválido - deve conter 11 dígitos");
const cnpjSchema = z.string().regex(/^\d{14}$/, "CNPJ inválido - deve conter 14 dígitos");

export const AuthFormAPI = () => {
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
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [allowClientRegistration, setAllowClientRegistration] = useState(true);
  
  const navigate = useNavigate();
  const { login, register, verifyMfa, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchRegistrationSettings = async () => {
      try {
        const settings = await api.settings.get('registration_settings');
        if (settings?.setting_value) {
          const value = settings.setting_value as { allow_client_registration: boolean };
          setAllowClientRegistration(value.allow_client_registration);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    
    fetchRegistrationSettings();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate CPF/CNPJ based on user type
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

      const validatedData = authSchema.parse({ email: email.trim(), password });
      setLoading(true);

      const result = await login({
        email: validatedData.email,
        password: validatedData.password,
        cpf: userType === 'colaborador' ? cpf.replace(/\D/g, '') : undefined,
        cnpj: userType === 'cliente' ? cnpj.replace(/\D/g, '') : undefined,
        userType,
      });

      if (result.requiresMfa && result.mfaToken) {
        setMfaToken(result.mfaToken);
        setShow2FAChallenge(true);
        toast.info('Digite o código do seu autenticador para completar o login');
        return;
      }

      if (result.success) {
        toast.success("Login realizado com sucesso!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao fazer login");
      }
    } finally {
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
      await verifyMfa(mfaToken, mfaCode);
      
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }

      if (userType === 'colaborador') {
        if (!cpf) {
          toast.error("CPF é obrigatório");
          return;
        }
        cpfSchema.parse(cpf.replace(/\D/g, ''));
      }

      if (userType === 'cliente') {
        if (!companyName || !cnpj) {
          toast.error("Preencha todos os campos da empresa");
          return;
        }
        cnpjSchema.parse(cnpj.replace(/\D/g, ''));
      }

      const validatedData = authSchema.parse({ 
        email: email.trim(), 
        password, 
        fullName: fullName.trim() 
      });
      setLoading(true);

      await register({
        email: validatedData.email,
        password: validatedData.password,
        fullName: validatedData.fullName || '',
        userType,
        cpf: userType === 'colaborador' ? cpf.replace(/\D/g, '') : undefined,
        companyName: userType === 'cliente' ? companyName.trim() : undefined,
        cnpj: userType === 'cliente' ? cnpj.replace(/\D/g, '') : undefined,
      });

      toast.success("Conta criada com sucesso!");
      navigate("/dashboard");
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
      await api.auth.forgotPassword(email);
      toast.success("Link de recuperação enviado!");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-scale-in">
      <div className="text-center space-y-2 animate-fade-in">
        <div className="inline-flex items-center justify-center mb-4">
          <img src={logoNWhite} alt="NewWar" className="w-24 h-24 object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-white">NewWar</h1>
        <p className="text-white/80">Entre ou crie sua conta para começar</p>
      </div>

      <Card className="border-2 backdrop-blur-sm bg-card/50 shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl text-center">
            {showForgotPassword ? "Recuperar Senha" : "Acessar Plataforma"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full" 
                  onClick={() => setShowForgotPassword(false)}
                >
                  Voltar ao Login
                </Button>
              </div>
            </form>
          ) : show2FAChallenge ? (
            <form onSubmit={handleMFAVerify} className="space-y-4 animate-fade-in">
              <div className="text-center space-y-2 mb-6">
                <Shield className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Verificação em Duas Etapas</h3>
                <p className="text-sm text-muted-foreground">
                  Digite o código do seu aplicativo autenticador
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-code" className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Código de Verificação
                </Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  required
                />
              </div>

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading || mfaCode.length !== 6} size="lg">
                  {loading ? "Verificando..." : "Verificar Código"}
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full" 
                  onClick={() => {
                    setShow2FAChallenge(false);
                    setMfaCode('');
                    setMfaToken('');
                  }}
                >
                  Voltar ao Login
                </Button>
              </div>
            </form>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="text-sm">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              {/* User Type Selection */}
              <div className="mb-6 space-y-3">
                <Label className="text-sm font-medium">Tipo de Usuário</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={userType === 'colaborador' ? 'default' : 'outline'}
                    className={cn(
                      "h-auto py-3 flex flex-col items-center gap-1",
                      userType === 'colaborador' && "ring-2 ring-primary"
                    )}
                    onClick={() => setUserType('colaborador')}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-xs">Colaborador New</span>
                  </Button>
                  <Button
                    type="button"
                    variant={userType === 'cliente' ? 'default' : 'outline'}
                    className={cn(
                      "h-auto py-3 flex flex-col items-center gap-1",
                      userType === 'cliente' && "ring-2 ring-primary"
                    )}
                    onClick={() => setUserType('cliente')}
                  >
                    <Building className="w-5 h-5" />
                    <span className="text-xs">Cliente</span>
                  </Button>
                </div>
              </div>

              <TabsContent value="login" className="space-y-4 animate-fade-in">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {/* CPF field for colaborador */}
                  {userType === 'colaborador' && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="cpf" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        CPF
                      </Label>
                      <Input
                        id="cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        maxLength={14}
                        required
                      />
                    </div>
                  )}

                  {/* CNPJ field for cliente */}
                  {userType === 'cliente' && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="cnpj" className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary" />
                        CNPJ
                      </Label>
                      <Input
                        id="cnpj"
                        type="text"
                        placeholder="00.000.000/0000-00"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))}
                        maxLength={18}
                        required
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full group" disabled={loading} size="lg">
                    {loading ? "Entrando..." : (
                      <>
                        Entrar
                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>

                  <Button 
                    type="button"
                    variant="link"
                    className="w-full text-sm" 
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Esqueci minha senha
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 animate-fade-in">
                {userType === 'cliente' && !allowClientRegistration ? (
                  <div className="text-center py-8 space-y-4">
                    <Building className="w-16 h-16 mx-auto text-muted-foreground" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Cadastro de Clientes Desabilitado</h3>
                      <p className="text-sm text-muted-foreground">
                        O cadastro de novos clientes está temporariamente desabilitado.
                        Entre em contato com o administrador para mais informações.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Nome Completo
                      </Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Senha
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Mínimo 8 caracteres, 1 maiúscula, 1 minúscula e 1 número
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Confirmar Senha
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    {/* CPF for colaborador */}
                    {userType === 'colaborador' && (
                      <div className="space-y-2 animate-fade-in">
                        <Label htmlFor="signup-cpf" className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          CPF
                        </Label>
                        <Input
                          id="signup-cpf"
                          type="text"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                          maxLength={14}
                          required
                        />
                      </div>
                    )}

                    {/* Company fields for cliente */}
                    {userType === 'cliente' && (
                      <>
                        <div className="space-y-2 animate-fade-in">
                          <Label htmlFor="company-name" className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-primary" />
                            Nome da Empresa
                          </Label>
                          <Input
                            id="company-name"
                            type="text"
                            placeholder="Nome da sua empresa"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2 animate-fade-in">
                          <Label htmlFor="signup-cnpj" className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-primary" />
                            CNPJ
                          </Label>
                          <Input
                            id="signup-cnpj"
                            type="text"
                            placeholder="00.000.000/0000-00"
                            value={cnpj}
                            onChange={(e) => setCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))}
                            maxLength={18}
                            required
                          />
                        </div>
                      </>
                    )}

                    <Button type="submit" className="w-full group" disabled={loading} size="lg">
                      {loading ? "Criando conta..." : (
                        <>
                          Criar Conta
                          <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
