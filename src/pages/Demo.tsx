import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlayCircle, BookOpen, Award, TrendingUp } from "lucide-react";
import { VideoPlayer } from "@/components/course/VideoPlayer";

const Demo = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    title: "Como Funciona a Plataforma",
    subtitle: "Um overview completo da NewWar e seus recursos",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    video_title: "Tutorial Completo da Plataforma",
  });
  const [steps, setSteps] = useState([
    {
      title: "1. Explore os Cursos",
      description: "Navegue pela biblioteca de cursos disponíveis e escolha o que você quer aprender"
    },
    {
      title: "2. Assista às Aulas",
      description: "Acesse vídeos de alta qualidade e aprenda no seu próprio ritmo"
    },
    {
      title: "3. Acompanhe seu Progresso",
      description: "Veja seu desenvolvimento em tempo real e complete os quizzes"
    },
    {
      title: "4. Receba Certificados",
      description: "Ao completar 100% do curso, receba seu certificado oficial"
    }
  ]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "demo_page")
        .maybeSingle();

      if (data?.setting_value) {
        const savedData = data.setting_value as any;
        setSettings({
          title: savedData.title || "Como Funciona a Plataforma",
          subtitle: savedData.subtitle || "Um overview completo da NewWar e seus recursos",
          video_url: savedData.video_url || "https://www.youtube.com/embed/dQw4w9WgXcQ",
          video_title: savedData.video_title || "Tutorial Completo da Plataforma",
        });
        
        // Handle new format (steps array)
        if (savedData.steps && Array.isArray(savedData.steps)) {
          setSteps(savedData.steps);
        } 
        // Handle legacy format (step1, step2, etc.)
        else if (savedData.step1_title) {
          const legacySteps = [];
          for (let i = 1; i <= 10; i++) {
            if (savedData[`step${i}_title`]) {
              legacySteps.push({
                title: savedData[`step${i}_title`],
                description: savedData[`step${i}_description`] || '',
              });
            }
          }
          if (legacySteps.length > 0) {
            setSteps(legacySteps);
          }
        }
      }
    };
    fetchSettings();
  }, []);

  const iconList = [BookOpen, PlayCircle, TrendingUp, Award];
  
  const tutorialSteps = steps.map((step, index) => ({
    icon: iconList[index % iconList.length],
    title: step.title,
    description: step.description
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {settings.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {settings.subtitle}
          </p>
        </div>

        {/* Video and Tutorial Grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Video Overview */}
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="w-6 h-6 text-primary" />
                {settings.video_title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VideoPlayer youtubeUrl={settings.video_url} title={settings.video_title} />
              <p className="text-sm text-muted-foreground mt-4">
                Assista ao vídeo completo para entender todos os recursos da plataforma
              </p>
            </CardContent>
          </Card>

          {/* Tutorial Steps */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Passo a Passo</h2>
            {tutorialSteps.map((step, index) => (
              <Card 
                key={index}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* CTA */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border-2 border-primary/20">
              <CardContent className="p-6 text-center space-y-4">
                <h3 className="text-2xl font-bold">Pronto para começar?</h3>
                <p className="text-muted-foreground">
                  Crie sua conta gratuitamente e comece a aprender hoje mesmo
                </p>
                <Button 
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Criar Conta Grátis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Demo;
