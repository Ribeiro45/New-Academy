import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Video, Award, Settings, Folder, Trash2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SiteSettings {
  homepage_hero: {
    badge_text: string;
    title_line1: string;
    title_line2: string;
    description: string;
    video_url: string;
  };
  homepage_features: {
    section_title: string;
    section_subtitle: string;
  };
  homepage_cta: {
    title: string;
    description: string;
  };
  demo_page: {
    title: string;
    subtitle: string;
    video_url: string;
    video_title: string;
    step1_title: string;
    step1_description: string;
    step2_title: string;
    step2_description: string;
    step3_title: string;
    step3_description: string;
    step4_title: string;
    step4_description: string;
  };
  registration_settings: {
    allow_client_registration: boolean;
  };
}

interface TopicCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order_index: number;
  link_url: string;
}

interface EditingTopicCard extends TopicCard {
  isDirty?: boolean;
}

const AdminSiteSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topicCards, setTopicCards] = useState<EditingTopicCard[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    homepage_hero: {
      badge_text: "",
      title_line1: "",
      title_line2: "",
      description: "",
      video_url: "",
    },
    homepage_features: {
      section_title: "",
      section_subtitle: "",
    },
    homepage_cta: {
      title: "",
      description: "",
    },
    demo_page: {
      title: "",
      subtitle: "",
      video_url: "",
      video_title: "",
      step1_title: "",
      step1_description: "",
      step2_title: "",
      step2_description: "",
      step3_title: "",
      step3_description: "",
      step4_title: "",
      step4_description: "",
    },
    registration_settings: {
      allow_client_registration: false,
    },
  });

  useEffect(() => {
    fetchSettings();
    fetchTopicCards();
  }, []);

  const fetchTopicCards = async () => {
    try {
      const { data, error } = await supabase
        .from("topic_cards")
        .select("*")
        .order("order_index");

      if (error) throw error;
      if (data) {
        setTopicCards(data);
      }
    } catch (error) {
      console.error("Error fetching topic cards:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cards de tópicos",
        variant: "destructive",
      });
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach((item) => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      setSettings(settingsMap as SiteSettings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("site_settings")
          .update({ setting_value: update.setting_value })
          .eq("setting_key", update.setting_key);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section: keyof SiteSettings, field: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleAddTopicCard = async () => {
    try {
      const { error } = await supabase.from("topic_cards").insert({
        title: "Novo Tópico",
        description: "Descrição do tópico",
        icon: "FileText",
        color: "orange",
        order_index: topicCards.length + 1,
        link_url: "/faq",
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Card de tópico criado com sucesso!",
      });

      fetchTopicCards();
    } catch (error) {
      console.error("Error creating topic card:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar card de tópico",
        variant: "destructive",
      });
    }
  };

  const updateLocalTopicCard = (id: string, updates: Partial<TopicCard>) => {
    setTopicCards(prev => prev.map(card => 
      card.id === id ? { ...card, ...updates, isDirty: true } : card
    ));
  };

  const handleSaveTopicCard = async (card: EditingTopicCard) => {
    try {
      const { isDirty, ...cardData } = card;
      const { error } = await supabase
        .from("topic_cards")
        .update(cardData)
        .eq("id", card.id);

      if (error) throw error;

      setTopicCards(prev => prev.map(c => 
        c.id === card.id ? { ...c, isDirty: false } : c
      ));

      toast({
        title: "Sucesso",
        description: "Card atualizado com sucesso!",
      });
    } catch (error) {
      console.error("Error updating topic card:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar card",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTopicCard = async (id: string) => {
    try {
      const { error } = await supabase.from("topic_cards").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Card removido com sucesso!",
      });

      fetchTopicCards();
    } catch (error) {
      console.error("Error deleting topic card:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover card",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Configurações do Site</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie o conteúdo da página inicial e página de demonstração
            </p>
          </div>

          <Tabs defaultValue="hero" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="hero">
                <Home className="w-4 h-4 mr-2" />
                Hero
              </TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="cta">CTA</TabsTrigger>
              <TabsTrigger value="demo">
                <Video className="w-4 h-4 mr-2" />
                Demo
              </TabsTrigger>
              <TabsTrigger value="topics">
                <Folder className="w-4 h-4 mr-2" />
                Tópicos
              </TabsTrigger>
              <TabsTrigger value="registration">
                <Settings className="w-4 h-4 mr-2" />
                Cadastro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hero" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seção Hero - Página Inicial</CardTitle>
                  <CardDescription>
                    Configure o conteúdo principal da página inicial
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="badge">Texto do Badge</Label>
                    <Input
                      id="badge"
                      value={settings.homepage_hero.badge_text}
                      onChange={(e) =>
                        updateSetting("homepage_hero", "badge_text", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="title1">Título - Linha 1</Label>
                    <Input
                      id="title1"
                      value={settings.homepage_hero.title_line1}
                      onChange={(e) =>
                        updateSetting("homepage_hero", "title_line1", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="title2">Título - Linha 2 (Destaque)</Label>
                    <Input
                      id="title2"
                      value={settings.homepage_hero.title_line2}
                      onChange={(e) =>
                        updateSetting("homepage_hero", "title_line2", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={settings.homepage_hero.description}
                      onChange={(e) =>
                        updateSetting("homepage_hero", "description", e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="video">URL do Vídeo (YouTube Embed)</Label>
                    <Input
                      id="video"
                      value={settings.homepage_hero.video_url}
                      onChange={(e) =>
                        updateSetting("homepage_hero", "video_url", e.target.value)
                      }
                      placeholder="https://www.youtube.com/embed/..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Use o formato: https://www.youtube.com/embed/VIDEO_ID
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seção de Features</CardTitle>
                  <CardDescription>
                    Configure os títulos da seção de recursos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="features-title">Título da Seção</Label>
                    <Input
                      id="features-title"
                      value={settings.homepage_features.section_title}
                      onChange={(e) =>
                        updateSetting("homepage_features", "section_title", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="features-subtitle">Subtítulo da Seção</Label>
                    <Input
                      id="features-subtitle"
                      value={settings.homepage_features.section_subtitle}
                      onChange={(e) =>
                        updateSetting("homepage_features", "section_subtitle", e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cta" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seção Call-to-Action</CardTitle>
                  <CardDescription>
                    Configure o convite para ação na página inicial
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cta-title">Título</Label>
                    <Input
                      id="cta-title"
                      value={settings.homepage_cta.title}
                      onChange={(e) =>
                        updateSetting("homepage_cta", "title", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="cta-description">Descrição</Label>
                    <Textarea
                      id="cta-description"
                      value={settings.homepage_cta.description}
                      onChange={(e) =>
                        updateSetting("homepage_cta", "description", e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="demo" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Página de Demonstração</CardTitle>
                  <CardDescription>
                    Configure o conteúdo da página de demonstração
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="demo-title">Título Principal</Label>
                    <Input
                      id="demo-title"
                      value={settings.demo_page.title}
                      onChange={(e) =>
                        updateSetting("demo_page", "title", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="demo-subtitle">Subtítulo</Label>
                    <Input
                      id="demo-subtitle"
                      value={settings.demo_page.subtitle}
                      onChange={(e) =>
                        updateSetting("demo_page", "subtitle", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="demo-video-title">Título do Vídeo</Label>
                    <Input
                      id="demo-video-title"
                      value={settings.demo_page.video_title}
                      onChange={(e) =>
                        updateSetting("demo_page", "video_title", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="demo-video">URL do Vídeo (YouTube Embed)</Label>
                    <Input
                      id="demo-video"
                      value={settings.demo_page.video_url}
                      onChange={(e) =>
                        updateSetting("demo_page", "video_url", e.target.value)
                      }
                      placeholder="https://www.youtube.com/embed/..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Use o formato: https://www.youtube.com/embed/VIDEO_ID
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Passos do Tutorial</CardTitle>
                  <CardDescription>
                    Configure os 4 passos do tutorial da página de demonstração
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step 1 */}
                  <div className="space-y-2 p-4 border rounded-lg">
                    <h3 className="font-semibold text-sm text-muted-foreground">Passo 1</h3>
                    <div>
                      <Label htmlFor="step1-title">Título</Label>
                      <Input
                        id="step1-title"
                        value={settings.demo_page.step1_title}
                        onChange={(e) =>
                          updateSetting("demo_page", "step1_title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="step1-description">Descrição</Label>
                      <Textarea
                        id="step1-description"
                        value={settings.demo_page.step1_description}
                        onChange={(e) =>
                          updateSetting("demo_page", "step1_description", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-2 p-4 border rounded-lg">
                    <h3 className="font-semibold text-sm text-muted-foreground">Passo 2</h3>
                    <div>
                      <Label htmlFor="step2-title">Título</Label>
                      <Input
                        id="step2-title"
                        value={settings.demo_page.step2_title}
                        onChange={(e) =>
                          updateSetting("demo_page", "step2_title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="step2-description">Descrição</Label>
                      <Textarea
                        id="step2-description"
                        value={settings.demo_page.step2_description}
                        onChange={(e) =>
                          updateSetting("demo_page", "step2_description", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-2 p-4 border rounded-lg">
                    <h3 className="font-semibold text-sm text-muted-foreground">Passo 3</h3>
                    <div>
                      <Label htmlFor="step3-title">Título</Label>
                      <Input
                        id="step3-title"
                        value={settings.demo_page.step3_title}
                        onChange={(e) =>
                          updateSetting("demo_page", "step3_title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="step3-description">Descrição</Label>
                      <Textarea
                        id="step3-description"
                        value={settings.demo_page.step3_description}
                        onChange={(e) =>
                          updateSetting("demo_page", "step3_description", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="space-y-2 p-4 border rounded-lg">
                    <h3 className="font-semibold text-sm text-muted-foreground">Passo 4</h3>
                    <div>
                      <Label htmlFor="step4-title">Título</Label>
                      <Input
                        id="step4-title"
                        value={settings.demo_page.step4_title}
                        onChange={(e) =>
                          updateSetting("demo_page", "step4_title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="step4-description">Descrição</Label>
                      <Textarea
                        id="step4-description"
                        value={settings.demo_page.step4_description}
                        onChange={(e) =>
                          updateSetting("demo_page", "step4_description", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topics" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Cards de Navegação por Tópicos</CardTitle>
                      <CardDescription>
                        Gerencie os cards que aparecem no dashboard
                      </CardDescription>
                    </div>
                    <Button onClick={handleAddTopicCard}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Card
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {topicCards.map((card, index) => (
                    <div key={card.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Card {index + 1}</h3>
                        <div className="flex gap-2">
                          {card.isDirty && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveTopicCard(card)}
                            >
                              Salvar
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTopicCard(card.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={card.title}
                            onChange={(e) =>
                              updateLocalTopicCard(card.id, { title: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Ícone</Label>
                          <Select
                            value={card.icon}
                            onValueChange={(value) =>
                              updateLocalTopicCard(card.id, { icon: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Lightbulb">Lightbulb</SelectItem>
                              <SelectItem value="BookOpen">BookOpen</SelectItem>
                              <SelectItem value="AlertCircle">AlertCircle</SelectItem>
                              <SelectItem value="Code">Code</SelectItem>
                              <SelectItem value="FileText">FileText</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Cor (Tailwind)</Label>
                          <Input
                            value={card.color}
                            onChange={(e) =>
                              updateLocalTopicCard(card.id, { color: e.target.value })
                            }
                            placeholder="orange, blue, green, etc"
                          />
                        </div>
                        <div>
                          <Label>Link</Label>
                          <Input
                            value={card.link_url}
                            onChange={(e) =>
                              updateLocalTopicCard(card.id, { link_url: e.target.value })
                            }
                            placeholder="/courses, /faq, etc"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Descrição</Label>
                          <Textarea
                            value={card.description || ""}
                            onChange={(e) =>
                              updateLocalTopicCard(card.id, { description: e.target.value })
                            }
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Ordem</Label>
                          <Input
                            type="number"
                            value={card.order_index}
                            onChange={(e) =>
                              updateLocalTopicCard(card.id, {
                                order_index: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {topicCards.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum card de tópico criado ainda.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="registration" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Cadastro</CardTitle>
                  <CardDescription>
                    Controle quem pode se cadastrar na plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow-client-registration">
                        Permitir Cadastro de Clientes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando desabilitado, apenas colaboradores poderão se cadastrar
                      </p>
                    </div>
                    <Switch
                      id="allow-client-registration"
                      checked={settings.registration_settings.allow_client_registration}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          registration_settings: {
                            allow_client_registration: checked,
                          },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </div>
  );
};

export default AdminSiteSettings;
