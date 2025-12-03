import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Award, TrendingUp, Users, ChevronRight, Play, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import logoN from "@/assets/logo-n.png";
import logoNWhite from "@/assets/logo-n-white.png";
const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const {
    isDarkMode,
    toggleTheme
  } = useTheme();
  const [settings, setSettings] = useState({
    hero: {
      badge_text: "NewWar - Plataforma de Aprendizado",
      title_line1: "Transforme seu",
      title_line2: "Conhecimento",
      description: "Acesse cursos de alta qualidade, acompanhe seu progresso e obtenha certificados reconhecidos.",
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    features: {
      section_title: "Por que escolher nossa plataforma?",
      section_subtitle: "Recursos poderosos para acelerar seu aprendizado"
    },
    cta: {
      title: "Pronto para começar?",
      description: "Junte-se a centenas de colaboradores que já estão transformando suas carreiras"
    }
  });
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/dashboard");
      } else {
        setIsLoading(false);
      }
    });

    // Fetch site settings
    const fetchSettings = async () => {
      const {
        data
      } = await supabase.from("site_settings").select("setting_key, setting_value").in("setting_key", ["homepage_hero", "homepage_features", "homepage_cta"]);
      if (data) {
        const settingsMap: any = {};
        data.forEach(item => {
          if (item.setting_key === "homepage_hero") settingsMap.hero = item.setting_value;
          if (item.setting_key === "homepage_features") settingsMap.features = item.setting_value;
          if (item.setting_key === "homepage_cta") settingsMap.cta = item.setting_value;
        });
        if (Object.keys(settingsMap).length > 0) {
          setSettings(prev => ({
            ...prev,
            ...settingsMap
          }));
        }
      }
    };
    fetchSettings();
  }, [navigate]);
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  const features = [{
    icon: BookOpen,
    title: "Cursos Completos",
    description: "Acesse uma biblioteca completa de cursos em vídeo"
  }, {
    icon: TrendingUp,
    title: "Acompanhe seu Progresso",
    description: "Monitore seu desenvolvimento em tempo real"
  }, {
    icon: Award,
    title: "Certificados",
    description: "Receba certificados ao concluir os cursos"
  }, {
    icon: Users,
    title: "Aprendizado Colaborativo",
    description: "Aprenda junto com outros colaboradores"
  }];
  return <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={isDarkMode ? logoNWhite : logoN} alt="NewWar" className="h-8 w-8 object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">New Academy</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button onClick={() => navigate("/auth")} size="lg">
              Entrar
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-block">
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                {settings.hero.badge_text}
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              {settings.hero.title_line1}
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {settings.hero.title_line2}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">{settings.hero.description}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => navigate("/auth")} size="lg" className="text-lg px-8 py-6 group">
                Começar Agora
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/demo")}>
                <Play className="w-5 h-5 mr-2" />
                Ver Demo
              </Button>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl"></div>
            <Card className="relative border-2 border-border/50 backdrop-blur-sm bg-card/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video relative group">
                  <iframe className="w-full h-full rounded-lg" src={settings.hero.video_url} title="Vídeo Demonstração" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
                </div>
                <div className="p-6 space-y-2">
                  <h3 className="text-xl font-semibold">Veja como funciona</h3>
                  <p className="text-muted-foreground">
                    Conheça todos os recursos da nossa plataforma em apenas alguns minutos
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-bold">{settings.features.section_title}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{settings.features.section_subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 animate-fade-in" style={{
          animationDelay: `${index * 100}ms`
        }}>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>)}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="relative overflow-hidden border-2 border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary-glow/10"></div>
          <CardContent className="relative p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold">{settings.cta.title}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{settings.cta.description}</p>
            <Button onClick={() => navigate("/auth")} size="lg" className="text-lg px-10 py-6">
              Criar Conta Grátis
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={isDarkMode ? logoNWhite : logoN} alt="NewWar" className="h-6 w-6 object-contain" />
              <span className="font-semibold">New Academy</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 New Academy. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;