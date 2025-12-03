import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Plus, Trash2 } from 'lucide-react';

interface Step {
  title: string;
  description: string;
}

export default function AdminDemo() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    title: '',
    subtitle: '',
    video_url: '',
    video_title: '',
  });
  const [steps, setSteps] = useState<Step[]>([
    { title: '', description: '' },
    { title: '', description: '' },
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'demo_page')
      .maybeSingle();

    if (data?.setting_value) {
      const savedData = data.setting_value as any;
      setSettings({
        title: savedData.title || '',
        subtitle: savedData.subtitle || '',
        video_url: savedData.video_url || '',
        video_title: savedData.video_title || '',
      });
      
      // Load steps from saved data
      if (savedData.steps && Array.isArray(savedData.steps)) {
        setSteps(savedData.steps);
      } else {
        // Legacy format conversion
        const legacySteps: Step[] = [];
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

  const handleSave = async () => {
    setLoading(true);
    try {
      const dataToSave = {
        setting_key: 'demo_page',
        setting_value: { ...settings, steps } as any,
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert(dataToSave);

      if (error) throw error;

      toast.success('Configurações da página de demonstração salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleStepChange = (index: number, field: keyof Step, value: string) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ));
  };

  const addStep = () => {
    setSteps(prev => [...prev, { title: '', description: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(prev => prev.filter((_, i) => i !== index));
    } else {
      toast.error('Deve haver pelo menos um passo!');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Editor da Página de Demonstração</h1>
              <p className="text-muted-foreground">Configure o conteúdo da página de tutorial</p>
            </div>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Seção Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título Principal</Label>
                <Input
                  id="title"
                  value={settings.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Como Funciona a Plataforma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtítulo</Label>
                <Input
                  id="subtitle"
                  value={settings.subtitle}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  placeholder="Um overview completo da NewWar"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vídeo Tutorial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video_title">Título do Vídeo</Label>
                <Input
                  id="video_title"
                  value={settings.video_title}
                  onChange={(e) => handleChange('video_title', e.target.value)}
                  placeholder="Tutorial Completo da Plataforma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_url">URL do Vídeo (YouTube Embed)</Label>
                <Input
                  id="video_url"
                  value={settings.video_url}
                  onChange={(e) => handleChange('video_url', e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Passos do Tutorial</CardTitle>
              <Button onClick={addStep} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Passo
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((step, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Passo {index + 1}</CardTitle>
                    <Button 
                      onClick={() => removeStep(index)} 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`step${index}_title`}>Título</Label>
                      <Input
                        id={`step${index}_title`}
                        value={step.title}
                        onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                        placeholder={`${index + 1}. Título do Passo`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`step${index}_description`}>Descrição</Label>
                      <Textarea
                        id={`step${index}_description`}
                        value={step.description}
                        onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                        placeholder="Descrição detalhada do passo"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
