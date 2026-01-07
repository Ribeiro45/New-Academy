import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Award, Users, LogOut, Moon, Sun, Shield, Library, User, HelpCircle, ChevronDown, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { useEditor } from '@/hooks/useEditor';
import { useLeader } from '@/hooks/useLeader';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import logoNewStandard from '@/assets/logo-newstandard.png';
import logoNewStandardDark from '@/assets/logo-newstandard-dark.png';

interface FAQSection {
  id: string;
  title: string;
  parent_id: string | null;
}

interface SectionItemProps {
  section: FAQSection;
  allSections: FAQSection[];
  level?: number;
  currentPath: string;
  expandedSections: Set<string>;
  onToggleExpand: (sectionId: string) => void;
}

const SectionItem = ({ section, allSections, level = 0, currentPath, expandedSections, onToggleExpand }: SectionItemProps) => {
  const subsections = allSections.filter(s => s.parent_id === section.id);
  const hasSubsections = subsections.length > 0;
  const isActive = currentPath === `/faq/section/${section.id}`;
  const expanded = expandedSections.has(section.id);

  if (!hasSubsections) {
    return (
      <Link
        to={`/faq/section/${section.id}`}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-sidebar-accent/50 text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/30'
        }`}
        style={{ marginLeft: `${level * 0.5}rem` }}
      >
        {section.title}
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <Collapsible open={expanded} onOpenChange={() => onToggleExpand(section.id)}>
        <div className="flex items-center gap-1" style={{ marginLeft: `${level * 0.5}rem` }}>
          <Link
            to={`/faq/section/${section.id}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors flex-1 text-left ${
              isActive
                ? 'bg-sidebar-accent/50 text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/30'
            }`}
          >
            <span className="flex-1">{section.title}</span>
          </Link>
          <CollapsibleTrigger asChild>
            <button
              className="p-1 rounded hover:bg-sidebar-accent/30 text-sidebar-foreground/80"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-1 mt-1">
          {subsections.map((subsection) => (
            <SectionItem
              key={subsection.id}
              section={subsection}
              allSections={allSections}
              level={level + 1}
              currentPath={currentPath}
              expandedSections={expandedSections}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [userName, setUserName] = useState('Usuário');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [faqSections, setFaqSections] = useState<FAQSection[]>([]);
  const [faqExpanded, setFaqExpanded] = useState(() => {
    const saved = localStorage.getItem('faq-menu-expanded');
    return saved === 'true';
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('faq-expanded-sections');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const handleToggleExpand = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      localStorage.setItem('faq-expanded-sections', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const handleFaqExpandedChange = (open: boolean) => {
    setFaqExpanded(open);
    localStorage.setItem('faq-menu-expanded', String(open));
  };
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const { isEditor } = useEditor();
  const { isLeader } = useLeader();
  const { isDarkMode, toggleTheme } = useTheme();

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  useEffect(() => {
    loadUserProfile();
    loadFAQSections();
    
    // Listen for profile changes in realtime
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profile updated:', payload);
          if (payload.new.full_name) {
            setUserName(payload.new.full_name);
          }
          if (payload.new.avatar_url) {
            // Add timestamp to force cache refresh
            setAvatarUrl(`${payload.new.avatar_url}?t=${Date.now()}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profile?.full_name) {
        setUserName(profile.full_name);
      }
      if (profile?.avatar_url) {
        // Add timestamp to force cache refresh
        setAvatarUrl(`${profile.avatar_url}?t=${Date.now()}`);
      }
    }
  };

  const loadFAQSections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      const userType = profile?.user_type || 'colaborador';

      const { data, error } = await supabase
        .from('faqs' as any)
        .select('id, title, parent_id')
        .eq('is_section', true)
        .in('target_audience', [userType, 'ambos'])
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading FAQ sections:', error);
        return;
      }

      setFaqSections((data as any) as FAQSection[] || []);
    } catch (error) {
      console.error('Error loading FAQ sections:', error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/auth');
    }
  };


  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Library, label: 'Meus Cursos', path: '/my-courses' },
    { icon: BookOpen, label: 'Todos os Cursos', path: '/courses' },
    { icon: Award, label: 'Certificados', path: '/certificates' },
    { icon: User, label: 'Meu Perfil', path: '/profile' },
  ];

  const leaderMenuItems = [
    { icon: Users, label: 'Meu Grupo', path: '/leader/group' },
    { icon: Shield, label: 'Painel do Grupo', path: '/leader/dashboard' },
  ];

  const adminMenuItems = [
    { icon: Shield, label: 'Painel Admin', path: '/admin/dashboard' },
    { icon: BookOpen, label: 'Gerenciar Cursos', path: '/admin/courses' },
    { icon: Users, label: 'Gerenciamento', path: '/admin/management' },
    { icon: Shield, label: 'Acesso aos Cursos', path: '/admin/course-access' },
    { icon: HelpCircle, label: 'Gerenciar Base de Conhecimento', path: '/admin/faq' },
    { icon: BookOpen, label: 'Editor de Demo', path: '/admin/demo' },
    { icon: BookOpen, label: 'Configurações do Site', path: '/admin/settings' },
    { icon: ScrollText, label: 'Logs de Atividade', path: '/admin/logs' },
  ];

  const editorMenuItems = [
    { icon: HelpCircle, label: 'Gerenciar Base de Conhecimento', path: '/admin/faq' },
  ];

  return (
    <>
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-sidebar-background border-r border-sidebar-border transition-all duration-300 flex flex-col`}>
        {/* Header with Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img 
                src={isDarkMode ? logoNewStandardDark : logoNewStandard} 
                alt="New Standard" 
                className={`${collapsed ? 'h-12' : 'h-16'} object-contain cursor-pointer hover:opacity-80 transition-opacity`} 
              />
            </Link>
            <button
              onClick={toggleCollapsed}
              className="text-sidebar-foreground hover:text-sidebar-primary"
            >
              {collapsed ? '>>' : '<<'}
            </button>
          </div>
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-b border-sidebar-border">
            <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sidebar-foreground">
                <p className="font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">Ver perfil</p>
              </div>
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Base de Conhecimento - Expandable Menu */}
          <Collapsible open={faqExpanded} onOpenChange={handleFaqExpandedChange}>
            <div className="flex items-center gap-1">
              <Link
                to="/faq"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors flex-1 ${
                  location.pathname === '/faq'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <HelpCircle size={20} />
                {!collapsed && <span>Base de Conhecimento</span>}
              </Link>
              {!collapsed && (
                <CollapsibleTrigger asChild>
                  <button
                    className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronDown size={16} className={`transition-transform ${faqExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
              )}
            </div>
            {!collapsed && (
              <CollapsibleContent className="ml-6 mt-1 space-y-1">
                {faqSections
                  .filter(section => !section.parent_id)
                  .map((section) => (
                    <SectionItem
                      key={section.id}
                      section={section}
                      allSections={faqSections}
                      currentPath={location.pathname}
                      expandedSections={expandedSections}
                      onToggleExpand={handleToggleExpand}
                    />
                  ))}
              </CollapsibleContent>
            )}
          </Collapsible>

          {isLeader && !isAdmin && (
            <>
              <div className="my-4 border-t border-sidebar-border" />
              {leaderMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Icon size={20} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}

          {(isAdmin || isEditor) && (
            <>
              <div className="my-4 border-t border-sidebar-border" />
              {isAdmin && adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Icon size={20} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
              {isEditor && !isAdmin && editorMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Icon size={20} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer with Theme Toggle & Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            {!collapsed && <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground w-full transition-colors"
          >
            <LogOut size={20} />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
