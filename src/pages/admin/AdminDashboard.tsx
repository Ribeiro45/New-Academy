import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Users, BookOpen, Award } from 'lucide-react';

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

  useEffect(() => {
    fetchUsersProgress();
    fetchStats();
  }, []);

  const fetchUsersProgress = async () => {
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
