import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setAuthToken } from '@/lib/api';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  fullName?: string;
  userType?: string;
  cpf?: string;
  avatarUrl?: string;
  mfaEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  roles: string[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isLeader: boolean;
  loading: boolean;
  login: (data: LoginData) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
}

interface LoginData {
  email: string;
  password: string;
  cpf?: string;
  cnpj?: string;
  userType: 'colaborador' | 'cliente';
}

interface LoginResult {
  success: boolean;
  requiresMfa?: boolean;
  mfaToken?: string;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  userType: 'colaborador' | 'cliente';
  cpf?: string;
  companyName?: string;
  cnpj?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = roles.includes('admin');
  const isEditor = roles.includes('admin') || roles.includes('editor');
  const isLeader = roles.includes('lider');

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const response = await api.auth.me();
      setUser({
        id: response.id,
        email: response.email,
        fullName: response.profile?.fullName,
        userType: response.profile?.userType,
        cpf: response.profile?.cpf,
        avatarUrl: response.profile?.avatarUrl,
        mfaEnabled: response.mfaEnabled,
      });
      setRoles(response.roles || []);
    } catch (error) {
      console.error('Error refreshing user:', error);
      // Token invalid, clear it
      setAuthToken(null);
      setUser(null);
      setRoles([]);
    }
  };

  const login = async (data: LoginData): Promise<LoginResult> => {
    const response = await api.auth.login({
      email: data.email,
      password: data.password,
      cpf: data.cpf,
      cnpj: data.cnpj,
      userType: data.userType,
    });

    if (response.requiresMfa) {
      return {
        success: false,
        requiresMfa: true,
        mfaToken: response.mfaToken,
      };
    }

    if (response.token) {
      setAuthToken(response.token);
      await refreshUser();
      return { success: true };
    }

    throw new Error('Login falhou');
  };

  const verifyMfa = async (mfaToken: string, code: string) => {
    const response = await api.auth.mfaVerify({ mfaToken, code });
    
    if (response.token) {
      setAuthToken(response.token);
      await refreshUser();
    } else {
      throw new Error('Verificação MFA falhou');
    }
  };

  const register = async (data: RegisterData) => {
    const response = await api.auth.register({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      userType: data.userType,
      cpf: data.cpf,
      companyName: data.companyName,
      cnpj: data.cnpj,
      sendConfirmationEmail: true,
    });

    // Não fazer login automático se precisa confirmar email
    if (response.message?.includes('check your email') || !response.user?.emailConfirmed) {
      return;
    }

    if (response.token) {
      setAuthToken(response.token);
      await refreshUser();
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setRoles([]);
    toast.success('Logout realizado com sucesso');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        isAuthenticated: !!user,
        isAdmin,
        isEditor,
        isLeader,
        loading,
        login,
        register,
        logout,
        refreshUser,
        verifyMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
