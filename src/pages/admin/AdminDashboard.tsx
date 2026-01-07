import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Users, BookOpen, Award, Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProgress {
  user_id: string;
  full_name: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  certificates_count: number;
}

export default function AdminDashboard() {
  const [usersProgress, setUsersProgress] = useState<UserProgress[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalCertificates: 0 });
  const [top3Users, setTop3Users] = useState<UserProgress[]>([]);

  useEffect(() => {
    fetchUsersProgress();
    fetchStats();
  }, []);

  const fetchUsersProgress = async () => {
    // Buscar IDs dos admins para excluí-los do pódio
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);

    const { data: profiles } = await supabase.from('profiles').select('id, full_name');
    const { data: lessons } = await supabase.from('lessons').select('id');
    
    const progressData: UserProgress[] = [];

    for (const profile of profiles || []) {
      const { data: completed } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', profile.id)
        .eq('completed', true);

      const { data: certificates } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', profile.id);

      progressData.push({
        user_id: profile.id,
        full_name: profile.full_name || 'Sem nome',
        total_lessons: lessons?.length || 0,
        completed_lessons: completed?.length || 0,
        progress_percentage: lessons?.length ? Math.round(((completed?.length || 0) / lessons.length) * 100) : 0,
        certificates_count: certificates?.length || 0,
      });
    }

    setUsersProgress(progressData);

    // Calcular top 3 excluindo admins
    const nonAdminUsers = progressData.filter(u => !adminIds.has(u.user_id));
    const sorted = [...nonAdminUsers].sort((a, b) => {
      if (b.certificates_count !== a.certificates_count) {
        return b.certificates_count - a.certificates_count;
      }
      if (b.progress_percentage !== a.progress_percentage) {
        return b.progress_percentage - a.progress_percentage;
      }
      return b.completed_lessons - a.completed_lessons;
    });
    setTop3Users(sorted.slice(0, 3));
  };

  const fetchStats = async () => {
    const { data: users } = await supabase.from('profiles').select('id');
    const { data: courses } = await supabase.from('courses').select('id');
    const { data: certificates } = await supabase.from('certificates').select('id');

    setStats({
      totalUsers: users?.length || 0,
      totalCourses: courses?.length || 0,
      totalCertificates: certificates?.length || 0,
    });
  };

  const getPodiumStyle = (position: number) => {
    switch (position) {
      case 0:
        return 'border-yellow-500 bg-yellow-500/10';
      case 1:
        return 'border-gray-400 bg-gray-400/10';
      case 2:
        return 'border-amber-700 bg-amber-700/10';
      default:
        return 'border-border bg-card';
    }
  };

  const getPodiumIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="h-8 w-8 text-yellow-500" />;
      case 1:
        return <Medal className="h-8 w-8 text-gray-400" />;
      case 2:
        return <Medal className="h-8 w-8 text-amber-700" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">Visão geral do progresso dos colaboradores</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
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
          </div>

          {/* Pódio de Destaque - Geral */}
          {top3Users.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  Pódio de Destaque - Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {top3Users.map((user, index) => (
                    <div
                      key={user.user_id}
                      className={cn(
                        'flex flex-col items-center p-6 rounded-lg border-2 transition-all',
                        getPodiumStyle(index)
                      )}
                    >
                      <div className="mb-3">{getPodiumIcon(index)}</div>
                      <span className="text-2xl font-bold mb-2">{index + 1}º</span>
                      <h3 className="font-semibold text-lg text-center mb-3">{user.full_name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1 text-center">
                        <p><Award className="inline h-4 w-4 mr-1" />{user.certificates_count} certificado(s)</p>
                        <p>{user.progress_percentage}% de progresso</p>
                        <p>{user.completed_lessons} aulas concluídas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Progresso dos Colaboradores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Lições Completas</TableHead>
                    <TableHead>Certificados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersProgress.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={user.progress_percentage} className="w-24" />
                          <span className="text-sm text-muted-foreground">{user.progress_percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.completed_lessons} / {user.total_lessons}</TableCell>
                      <TableCell>{user.certificates_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
