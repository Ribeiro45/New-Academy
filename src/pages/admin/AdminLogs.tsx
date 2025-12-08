import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw, Eye, Filter, Calendar, Database } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  description: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const TABLE_LABELS: Record<string, string> = {
  courses: 'Cursos',
  modules: 'Módulos',
  lessons: 'Aulas',
  quizzes: 'Quizzes',
  enrollments: 'Matrículas',
  certificates: 'Certificados',
  groups: 'Grupos',
  user_roles: 'Permissões',
  faqs: 'Base de Conhecimento',
  site_settings: 'Configurações',
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-500/10 text-green-600 border-green-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Criação',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Buscar informações dos usuários
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      
      let userProfiles: Record<string, { full_name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profiles) {
          userProfiles = profiles.reduce((acc, profile) => {
            acc[profile.id] = { full_name: profile.full_name || 'Usuário', email: profile.email || '' };
            return acc;
          }, {} as Record<string, { full_name: string; email: string }>);
        }
      }

      const logsWithUsers = (data || []).map(log => ({
        ...log,
        user_name: log.user_id ? userProfiles[log.user_id]?.full_name || 'Sistema' : 'Sistema',
        user_email: log.user_id ? userProfiles[log.user_id]?.email || '' : '',
      }));

      setLogs(logsWithUsers);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTable = filterTable === 'all' || log.table_name === filterTable;
    const matchesAction = filterAction === 'all' || log.action === filterAction;

    return matchesSearch && matchesTable && matchesAction;
  });

  const uniqueTables = [...new Set(logs.map(log => log.table_name))];

  const renderJsonDiff = (oldData: any, newData: any) => {
    if (!oldData && !newData) return null;

    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);

    const changes: { key: string; oldValue: any; newValue: any; changed: boolean }[] = [];

    allKeys.forEach(key => {
      const oldValue = oldData?.[key];
      const newValue = newData?.[key];
      const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
      changes.push({ key, oldValue, newValue, changed });
    });

    return (
      <div className="space-y-2">
        {changes.map(({ key, oldValue, newValue, changed }) => (
          <div key={key} className={`p-2 rounded text-sm ${changed ? 'bg-muted/50' : ''}`}>
            <span className="font-medium text-foreground">{key}:</span>
            {changed ? (
              <div className="ml-4 space-y-1">
                {oldValue !== undefined && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-mono text-xs">-</span>
                    <code className="text-red-500 text-xs break-all">
                      {typeof oldValue === 'object' ? JSON.stringify(oldValue, null, 2) : String(oldValue)}
                    </code>
                  </div>
                )}
                {newValue !== undefined && (
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-mono text-xs">+</span>
                    <code className="text-green-500 text-xs break-all">
                      {typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : String(newValue)}
                    </code>
                  </div>
                )}
              </div>
            ) : (
              <span className="ml-2 text-muted-foreground text-xs">
                {typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue ?? '-')}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs de Atividade</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de todas as alterações realizadas no sistema
          </p>
        </div>
        <Button onClick={loadLogs} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, tabela ou usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[180px]">
                <Database className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tabelas</SelectItem>
                {uniqueTables.map(table => (
                  <SelectItem key={table} value={table}>
                    {TABLE_LABELS[table] || table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Alteração</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{logs.length}</div>
            <p className="text-sm text-muted-foreground">Total de Logs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter(l => l.action === 'INSERT').length}
            </div>
            <p className="text-sm text-muted-foreground">Criações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {logs.filter(l => l.action === 'UPDATE').length}
            </div>
            <p className="text-sm text-muted-foreground">Alterações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {logs.filter(l => l.action === 'DELETE').length}
            </div>
            <p className="text-sm text-muted-foreground">Exclusões</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Registros ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum log encontrado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{log.user_name}</div>
                        {log.user_email && (
                          <div className="text-xs text-muted-foreground">{log.user_email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ACTION_COLORS[log.action] || ''}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TABLE_LABELS[log.table_name] || log.table_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {log.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                Detalhes do Log
                                <Badge variant="outline" className={ACTION_COLORS[log.action] || ''}>
                                  {ACTION_LABELS[log.action] || log.action}
                                </Badge>
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-sm font-medium text-muted-foreground">Data/Hora</span>
                                    <p className="text-foreground">
                                      {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium text-muted-foreground">Usuário</span>
                                    <p className="text-foreground">{log.user_name}</p>
                                    {log.user_email && (
                                      <p className="text-xs text-muted-foreground">{log.user_email}</p>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium text-muted-foreground">Tabela</span>
                                    <p className="text-foreground">{TABLE_LABELS[log.table_name] || log.table_name}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium text-muted-foreground">ID do Registro</span>
                                    <p className="text-foreground font-mono text-sm">{log.record_id || '-'}</p>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">Descrição</span>
                                  <p className="text-foreground">{log.description || '-'}</p>
                                </div>

                                <div>
                                  <span className="text-sm font-medium text-muted-foreground mb-2 block">
                                    Alterações
                                  </span>
                                  <div className="bg-muted/30 rounded-lg p-4">
                                    {renderJsonDiff(log.old_data, log.new_data)}
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
