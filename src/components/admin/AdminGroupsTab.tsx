import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Edit, Plus, Users } from 'lucide-react';

type Group = {
  id: string;
  name: string;
  leader_id: string | null;
  leader_name?: string;
  member_count?: number;
};

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export function AdminGroupsTab() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    leader_id: '',
  });

  useEffect(() => {
    loadGroups();
    loadUsers();
  }, []);

  const loadGroups = async () => {
    try {
      const { data: groupsData, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          leader_id
        `)
        .order('name');

      if (error) throw error;

      const groupsWithDetails = await Promise.all(
        (groupsData || []).map(async (group) => {
          let leader_name = 'Sem líder';
          if (group.leader_id) {
            const { data: leaderProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', group.leader_id)
              .single();
            leader_name = leaderProfile?.full_name || 'Sem líder';
          }

          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            leader_name,
            member_count: count || 0,
          };
        })
      );

      setGroups(groupsWithDetails);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar grupos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      const { data: membersData, error } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (error) throw error;

      const memberIds = membersData?.map((m) => m.user_id) || [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      setGroupMembers(profiles || []);

      // Get all users who are already in other groups
      const { data: allGroupMembers } = await supabase
        .from('group_members')
        .select('user_id');

      const usersInGroups = allGroupMembers?.map((m) => m.user_id) || [];

      // Get all users with admin or lider roles
      const { data: restrictedRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'lider']);

      const restrictedUserIds = restrictedRoles?.map((r) => r.user_id) || [];

      // Filter available users: not in current group, not in any group, not admin/lider
      const available = users.filter(
        (u) =>
          !memberIds.includes(u.id) &&
          !usersInGroups.includes(u.id) &&
          !restrictedUserIds.includes(u.id)
      );

      setAvailableUsers(available);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar membros',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedGroup) {
        const { error } = await supabase
          .from('groups')
          .update({
            name: formData.name,
            leader_id: formData.leader_id || null,
          })
          .eq('id', selectedGroup.id);

        if (error) throw error;

        if (formData.leader_id) {
          await updateLeaderRole(formData.leader_id);
        }

        toast({
          title: 'Grupo atualizado',
          description: 'O grupo foi atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase.from('groups').insert({
          name: formData.name,
          leader_id: formData.leader_id || null,
        });

        if (error) throw error;

        if (formData.leader_id) {
          await updateLeaderRole(formData.leader_id);
        }

        toast({
          title: 'Grupo criado',
          description: 'O grupo foi criado com sucesso.',
        });
      }

      loadGroups();
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar grupo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateLeaderRole = async (userId: string) => {
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'lider')
      .single();

    if (!existingRole) {
      await supabase.from('user_roles').insert({
        user_id: userId,
        role: 'lider',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;

    try {
      const { error } = await supabase.from('groups').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Grupo excluído',
        description: 'O grupo foi excluído com sucesso.',
      });

      loadGroups();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir grupo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      leader_id: group.leader_id || '',
    });
    setDialogOpen(true);
  };

  const handleManageMembers = (group: Group) => {
    setSelectedGroup(group);
    loadGroupMembers(group.id);
    setMembersDialogOpen(true);
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroup.id,
        user_id: userId,
      });

      if (error) throw error;

      toast({
        title: 'Membro adicionado',
        description: 'O membro foi adicionado ao grupo com sucesso.',
      });

      loadGroupMembers(selectedGroup.id);
      loadGroups();
      setMembersDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar membro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: 'O membro foi removido do grupo com sucesso.',
      });

      loadGroupMembers(selectedGroup.id);
      loadGroups();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      leader_id: '',
    });
    setSelectedGroup(null);
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedGroup ? 'Editar Grupo' : 'Novo Grupo'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do grupo abaixo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Grupo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="leader">Líder do Grupo (opcional)</Label>
                <Select
                  value={formData.leader_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, leader_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um líder (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem líder</SelectItem>
                    {users.filter(u => u.id).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {selectedGroup ? 'Atualizar' : 'Criar'} Grupo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <CardDescription className="text-sm">
                Líder: {group.leader_name}
                <br />
                Membros: {group.member_count}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-2 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageMembers(group)}
                  className="w-full justify-start"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Membros
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(group)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Membros de {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription>
              Gerencie os membros deste grupo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Adicionar Membro</Label>
              <Select onValueChange={handleAddMember}>
                <SelectTrigger>
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
            </div>
            <div>
              <Label>Membros Atuais</Label>
              <div className="space-y-2 mt-2">
                {groupMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum membro neste grupo
                  </p>
                ) : (
                  groupMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <span>{member.full_name || member.email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
