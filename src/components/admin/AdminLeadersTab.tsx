import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserMinus, Shield } from 'lucide-react';

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type Leader = User & {
  group_name?: string;
};

export function AdminLeadersTab() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadLeaders(), loadAvailableUsers()]);
    setLoading(false);
  };

  const loadLeaders = async () => {
    try {
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'lider');

      if (error) throw error;

      const leaderIds = rolesData?.map((r) => r.user_id) || [];

      if (leaderIds.length === 0) {
        setLeaders([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', leaderIds);

      if (profilesError) throw profilesError;

      const leadersWithGroups = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: group } = await supabase
            .from('groups')
            .select('name')
            .eq('leader_id', profile.id)
            .single();

          return {
            ...profile,
            group_name: group?.name,
          };
        })
      );

      setLeaders(leadersWithGroups);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar líderes',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'lider');

      const leaderIds = rolesData?.map((r) => r.user_id) || [];

      const query = supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (leaderIds.length > 0) {
        query.not('id', 'in', `(${leaderIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAvailableUsers((data || []).map(d => ({ ...d, avatar_url: null })));
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddLeader = async () => {
    if (!selectedUser) {
      toast({
        title: 'Erro',
        description: 'Selecione um usuário para promover a líder.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: selectedUser,
        role: 'lider',
      });

      if (error) throw error;

      toast({
        title: 'Líder adicionado',
        description: 'O usuário foi promovido a líder com sucesso.',
      });

      setSelectedUser('');
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar líder',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLeader = async (leaderId: string) => {
    const leader = leaders.find((l) => l.id === leaderId);
    
    if (leader?.group_name) {
      toast({
        title: 'Não é possível remover',
        description: `Este líder está atribuído ao grupo "${leader.group_name}". Remova-o do grupo primeiro.`,
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Tem certeza que deseja remover este líder?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', leaderId)
        .eq('role', 'lider');

      if (error) throw error;

      toast({
        title: 'Líder removido',
        description: 'O líder foi removido com sucesso.',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover líder',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Líder</CardTitle>
          <CardDescription>
            Promova um usuário para o papel de líder de grupo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddLeader} disabled={!selectedUser}>
              <Shield className="mr-2 h-4 w-4" />
              Adicionar Líder
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Líderes Atuais</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leaders.length === 0 ? (
            <p className="text-muted-foreground col-span-full">
              Nenhum líder cadastrado ainda.
            </p>
          ) : (
            leaders.map((leader) => (
              <Card key={leader.id}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar>
                    <AvatarImage src={leader.avatar_url || undefined} />
                    <AvatarFallback>
                      {leader.full_name?.charAt(0) || leader.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {leader.full_name || 'Sem nome'}
                    </CardTitle>
                    <CardDescription>{leader.email}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {leader.group_name && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Grupo: <strong>{leader.group_name}</strong>
                    </p>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveLeader(leader.id)}
                    className="w-full"
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remover Líder
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
