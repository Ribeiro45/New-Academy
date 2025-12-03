import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";

const profileSchema = z.object({
  full_name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
  email: z.string().email("Email inválido"),
  phone: z.string()
    .regex(/^[0-9]*$/, "Telefone deve conter apenas números")
    .optional()
    .or(z.literal("")),
  birth_date: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      birth_date: "",
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadProfile(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        form.reset({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          birth_date: data.birth_date || "",
        });
        // Add timestamp to avatar URL to prevent caching
        const avatarUrlWithTimestamp = data.avatar_url 
          ? `${data.avatar_url}?t=${Date.now()}`
          : "";
        console.log("Avatar URL carregado:", avatarUrlWithTimestamp);
        setAvatarUrl(avatarUrlWithTimestamp);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      console.log("Iniciando upload de avatar...");
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;
      console.log("Upload realizado com sucesso");

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add timestamp to force cache refresh
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      console.log("Nova URL do avatar:", urlWithTimestamp);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithTimestamp);
      setAvatarFile(null);
      setAvatarPreview("");
      
      // Force reload of avatar
      const avatarElement = document.querySelector('[data-avatar-image]') as HTMLImageElement;
      if (avatarElement) {
        avatarElement.src = urlWithTimestamp;
      }

      toast({
        title: "Sucesso",
        description: "Foto atualizada com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível fazer upload da foto",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          birth_date: data.birth_date || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
          </div>

          <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>Adicione ou altere sua foto de perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  {(avatarPreview || avatarUrl) && (
                    <AvatarImage 
                      src={avatarPreview || avatarUrl} 
                      className="object-cover" 
                      data-avatar-image
                      key={avatarUrl}
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User size={40} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      console.log("Arquivo selecionado:", file?.name);
                      setAvatarFile(file);
                      if (file) {
                        console.log("Criando preview da imagem...");
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const result = reader.result as string;
                          console.log("Preview criado, tamanho:", result.length);
                          setAvatarPreview(result);
                        };
                        reader.onerror = () => {
                          console.error("Erro ao criar preview");
                        };
                        reader.readAsDataURL(file);
                      } else {
                        setAvatarPreview("");
                      }
                    }}
                    disabled={uploadingAvatar}
                  />
                  {avatarFile && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAvatarUpload} 
                        disabled={uploadingAvatar}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingAvatar ? "Enviando..." : "Salvar Foto"}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          console.log("Cancelando upload");
                          setAvatarFile(null);
                          setAvatarPreview("");
                        }}
                        disabled={uploadingAvatar}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seus dados pessoais</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento (opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <TwoFactorSetup />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
