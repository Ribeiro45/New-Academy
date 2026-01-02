import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, Award, TrendingUp } from 'lucide-react';

type Group = {
  id: string;
  name: string;
};

type MemberProgress = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  completedLessons: number;
  totalLessons: number;
  certificates: number;
  progressPercent: number;
};

export default function LeaderDashboard() {
  const [group, setGroup] = useState<Group | null>(null);
  const [membersProgress, setMembersProgress] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalCertificates: 0,
    avgProgress: 0,
    completedCourses: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the group where user is the leader
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('leader_id', user.id)
        .maybeSingle();

      if (groupError) throw groupError;
      if (!groupData) {
        setLoading(false);
        return;
      }

      setGroup(groupData);

      // Get group members
      const { data: memberIds, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupData.id);

      if (membersError) throw membersError;

      if (!memberIds || memberIds.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = memberIds.map(m => m.user_id);

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get all lessons count
      const { count: totalLessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });

      const totalLessons = totalLessonsCount || 0;

      // Get progress for each member
      const progressPromises = userIds.map(async (userId) => {
        const { count: completedCount } = await supabase
          .from('user_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('completed', true);

        const { count: certCount } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        return {
          userId,
          completedLessons: completedCount || 0,
          certificates: certCount || 0,
        };
      });

      const progressData = await Promise.all(progressPromises);

      // Combine data
      const membersWithProgress: MemberProgress[] = (profiles || []).map(profile => {
        const progress = progressData.find(p => p.userId === profile.id);
        const completedLessons = progress?.completedLessons || 0;
        const progressPercent = totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100) 
          : 0;

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          completedLessons,
          totalLessons,
          certificates: progress?.certificates || 0,
          progressPercent,
        };
      });

      setMembersProgress(membersWithProgress);

      // Calculate stats
      const totalCertificates = membersWithProgress.reduce((sum, m) => sum + m.certificates, 0);
      const avgProgress = membersWithProgress.length > 0
        ? Math.round(membersWithProgress.reduce((sum, m) => sum + m.progressPercent, 0) / membersWithProgress.length)
        : 0;
      const completedCourses = membersWithProgress.filter(m => m.progressPercent === 100).length;

      setStats({
        totalMembers: membersWithProgress.length,
        totalCertificates,
        avgProgress,
        completedCourses,
      });

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
    return <div className="p-8 animate-pulse">Carregando...</div>;
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
    <div className="p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Painel do Grupo</h1>
        <p className="text-muted-foreground mb-6">
          Acompanhe o progresso dos membros do grupo <strong>{group.name}</strong>
        </p>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProgress}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificados Emitidos</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCertificates}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cursos Concluídos</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedCourses}</div>
            </CardContent>
          </Card>
        </div>

        {/* Members Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso dos Membros</CardTitle>
            <CardDescription>
              Visualize o progresso individual de cada membro do seu grupo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersProgress.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum membro no grupo ainda.
              </p>
            ) : (
              <div className="space-y-6">
                {membersProgress.map((member) => (
                  <div key={member.id} className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      {member.avatar_url && (
                        <AvatarImage src={member.avatar_url} alt={member.full_name || ''} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">
                          {member.full_name || 'Sem nome'}
                        </p>
                        <div className="flex items-center gap-2">
                          {member.certificates > 0 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {member.certificates}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {member.progressPercent}%
                          </span>
                        </div>
                      </div>
                      <Progress value={member.progressPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {member.completedLessons} de {member.totalLessons} aulas concluídas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
