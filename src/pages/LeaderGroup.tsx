import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Users } from 'lucide-react';

type Group = {
  id: string;
  name: string;
  description: string | null;
};

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  user_type: string | null;
};

export default function LeaderGroup() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadGroupData();
  }, []);

  const loadGroupData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the group where user is the leader
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name, description')
        .eq('leader_id', user.id)
        .single();

      if (groupError) throw groupError;

      setGroup(groupData);

      // Get group members
      const { data: memberIds, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupData.id);

      if (membersError) throw membersError;

      if (memberIds && memberIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, user_type')
          .in('id', memberIds.map(m => m.user_id));

        if (profilesError) throw profilesError;

        setMembers(profiles || []);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  if (!group) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Sem Grupo Atribuído</CardTitle>
            <CardDescription>
              Você ainda não foi atribuído como líder de nenhum grupo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Meu Grupo</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
          {group.description && (
            <CardDescription>{group.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{members.length} membro(s)</span>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-bold mb-4">Membros do Grupo</h2>

      {members.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Nenhum membro no grupo ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    {member.avatar_url && (
                      <AvatarImage src={member.avatar_url} alt={member.full_name || ''} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {member.full_name || 'Sem nome'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                    {member.user_type && (
                      <p className="text-xs text-muted-foreground capitalize mt-1">
                        {member.user_type}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
