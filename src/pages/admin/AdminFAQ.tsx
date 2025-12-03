import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, Upload, Image as ImageIcon, Bold, Italic, Link as LinkIcon } from 'lucide-react';
interface FAQ {
  id: string;
  title: string;
  description: string | null;
  target_audience: string;
  pdf_url: string | null;
  order_index: number;
  parent_id: string | null;
  is_section: boolean;
}
export default function AdminFAQ() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFAQ, setDeletingFAQ] = useState<{
    id: string;
    name: string;
    pdfUrl: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_audience: 'ambos',
    order_index: 0,
    parent_id: null as string | null,
    is_section: false
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    loadFAQs();
  }, []);
  const loadFAQs = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('faqs' as any).select('*').order('order_index', {
        ascending: true
      });
      if (error) throw error;
      setFaqs(data as any || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast.error('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
      } else {
        toast.error('Por favor, selecione um arquivo PDF');
      }
    }
  };
  const uploadPDF = async (file: File): Promise<string | null> => {
    try {
      const fileExt = 'pdf';
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('faq-pdfs').upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('faq-pdfs').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Erro ao fazer upload do PDF');
      return null;
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `faq-images/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem');
        return;
      }

      setUploadingImage(true);
      try {
        const imageUrl = await uploadImage(file);
        if (imageUrl && textareaRef.current) {
          const textarea = textareaRef.current;
          const cursorPos = textarea.selectionStart;
          const textBefore = formData.description.substring(0, cursorPos);
          const textAfter = formData.description.substring(cursorPos);
          const newText = `${textBefore}<img src="${imageUrl}" alt="Imagem" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />${textAfter}`;
          
          setFormData({ ...formData, description: newText });
          toast.success('Imagem inserida com sucesso');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      } finally {
        setUploadingImage(false);
        e.target.value = '';
      }
    }
  };

  const insertTag = (tag: string, hasClosing: boolean = true) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.description.substring(start, end);
    const beforeText = formData.description.substring(0, start);
    const afterText = formData.description.substring(end);
    
    let newText = '';
    if (hasClosing) {
      newText = `${beforeText}<${tag}>${selectedText}</${tag}>${afterText}`;
    } else {
      newText = `${beforeText}<${tag}>${afterText}`;
    }
    
    setFormData({ ...formData, description: newText });
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tag.length + 2 + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let pdfUrl = editingFAQ?.pdf_url || null;
      if (pdfFile) {
        pdfUrl = await uploadPDF(pdfFile);
        if (!pdfUrl) {
          setUploading(false);
          return;
        }
      }
      const faqData = {
        ...formData,
        pdf_url: pdfUrl
      };
      if (editingFAQ) {
        const {
          error
        } = await supabase.from('faqs' as any).update(faqData).eq('id', editingFAQ.id);
        if (error) throw error;
        toast.success('FAQ atualizado com sucesso');
      } else {
        const {
          error
        } = await supabase.from('faqs' as any).insert([faqData]);
        if (error) throw error;
        toast.success('FAQ criado com sucesso');
      }
      resetForm();
      loadFAQs();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast.error('Erro ao salvar FAQ');
    } finally {
      setUploading(false);
    }
  };
  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormData({
      title: faq.title,
      description: faq.description || '',
      target_audience: faq.target_audience,
      order_index: faq.order_index,
      parent_id: faq.parent_id,
      is_section: faq.is_section
    });
    setIsDialogOpen(true);
  };
  const handleDeleteClick = (id: string, name: string, pdfUrl: string | null) => {
    setDeletingFAQ({
      id,
      name,
      pdfUrl
    });
    setDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!deletingFAQ) return;
    try {
      if (deletingFAQ.pdfUrl) {
        const path = deletingFAQ.pdfUrl.split('/faq-pdfs/')[1];
        if (path) {
          await supabase.storage.from('faq-pdfs').remove([path]);
        }
      }
      const {
        error
      } = await supabase.from('faqs' as any).delete().eq('id', deletingFAQ.id);
      if (error) throw error;
      toast.success('FAQ excluído com sucesso');
      loadFAQs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Erro ao excluir FAQ');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingFAQ(null);
    }
  };
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      target_audience: 'ambos',
      order_index: 0,
      parent_id: null,
      is_section: false
    });
    setPdfFile(null);
    setEditingFAQ(null);
  };

  const renderSection = (section: FAQ, level: number = 0): JSX.Element => {
    const childSections = faqs.filter(f => f.is_section && f.parent_id === section.id);
    const childItems = faqs.filter(f => !f.is_section && f.parent_id === section.id);

    return (
      <div key={section.id} className={`border rounded-lg p-4 ${level > 0 ? 'ml-6 mt-4' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className={`${level === 0 ? 'text-lg' : 'text-base'} font-semibold`}>
              {level > 0 && '↳ '}
              {section.title}
            </h3>
            {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Público: <span className="capitalize">{section.target_audience}</span> | Ordem: {section.order_index}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(section)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(section.id, section.title, section.pdf_url)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        {childItems.length > 0 && (
          <div className="ml-4 mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Ordem</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {childItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.order_index}</TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      {item.pdf_url ? (
                        <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem PDF</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(item.id, item.title, item.pdf_url)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {childSections.length > 0 && (
          <div className="space-y-2">
            {childSections.map(childSection => renderSection(childSection, level + 1))}
          </div>
        )}

        {childItems.length === 0 && childSections.length === 0 && (
          <p className="text-sm text-muted-foreground italic ml-4">Nenhum item ou sub-seção nesta seção</p>
        )}
      </div>
    );
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Gerenciar Base de Conhecimento</h1>
              <p className="text-muted-foreground">
                Crie e gerencie a base de conhecimento com PDFs
              </p>
            </div>
        <Dialog open={isDialogOpen} onOpenChange={open => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Campo  
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFAQ ? 'Editar FAQ' : 'Novo FAQ'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do FAQ e faça upload do PDF
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="is_section">Tipo *</Label>
                <Select value={formData.is_section ? 'section' : 'item'} onValueChange={value => setFormData({
                ...formData,
                is_section: value === 'section'
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="section">Seção</SelectItem>
                    <SelectItem value="item">Item de FAQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.is_section && <div className="space-y-2">
                  <Label htmlFor="parent_section">Seção Pai (Opcional)</Label>
                  <Select value={formData.parent_id || 'none'} onValueChange={value => setFormData({
                ...formData,
                parent_id: value === 'none' ? null : value
              })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma (Seção principal)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (Seção principal)</SelectItem>
                      {faqs.filter(f => f.is_section && f.id !== editingFAQ?.id).map(section => <SelectItem key={section.id} value={section.id}>
                          {section.title}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para criar uma seção principal, ou selecione para criar uma sub-seção
                  </p>
                </div>}

              {!formData.is_section && <div className="space-y-2">
                  <Label htmlFor="parent_id">Seção Pai *</Label>
                  <Select value={formData.parent_id || 'none'} onValueChange={value => setFormData({
                ...formData,
                parent_id: value === 'none' ? null : value
              })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma seção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem seção</SelectItem>
                      {faqs.filter(f => f.is_section).map(section => <SelectItem key={section.id} value={section.id}>
                          {section.title}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>}

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={formData.title} onChange={e => setFormData({
                ...formData,
                title: e.target.value
              })} required placeholder={formData.is_section ? "Ex: FAQ-Administrativo" : "Digite o título do FAQ"} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Descrição {formData.is_section && "(com suporte a HTML e imagens)"}
                </Label>
                
                {formData.is_section && (
                  <div className="flex gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertTag('strong')}
                      title="Negrito"
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertTag('em')}
                      title="Itálico"
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertTag('h3')}
                      title="Título"
                    >
                      H3
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertTag('p')}
                      title="Parágrafo"
                    >
                      P
                    </Button>
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage}
                        asChild
                      >
                        <span>
                          {uploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
                
                <Textarea 
                  ref={textareaRef}
                  id="description" 
                  value={formData.description} 
                  onChange={e => setFormData({
                    ...formData,
                    description: e.target.value
                  })} 
                  placeholder={formData.is_section ? "Digite HTML ou use os botões acima para formatar..." : "Digite uma descrição (opcional)"} 
                  rows={formData.is_section ? 8 : 3}
                  className="font-mono text-sm"
                />
                
                {formData.is_section && formData.description && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <Label className="text-xs text-muted-foreground mb-2 block">Preview:</Label>
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: formData.description }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">Público-alvo *</Label>
                <Select value={formData.target_audience} onValueChange={value => setFormData({
                ...formData,
                target_audience: value
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambos">Ambos</SelectItem>
                    <SelectItem value="cliente">Clientes</SelectItem>
                    <SelectItem value="colaborador">Colaboradores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">Ordem de exibição</Label>
                <Input id="order_index" type="number" value={formData.order_index} onChange={e => setFormData({
                ...formData,
                order_index: parseInt(e.target.value)
              })} min={0} />
              </div>

              {!formData.is_section && <div className="space-y-2">
                  <Label htmlFor="pdf">PDF {!editingFAQ && '*'}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="pdf" type="file" accept="application/pdf" onChange={handleFileChange} required={!editingFAQ && !formData.is_section} />
                    {pdfFile && <Upload className="w-5 h-5 text-green-500" />}
                  </div>
                  {editingFAQ?.pdf_url && <p className="text-sm text-muted-foreground">
                      PDF atual: <a href={editingFAQ.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver PDF</a>
                    </p>}
                </div>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </> : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campos da Base De Conhecimento        </CardTitle>
          <CardDescription>Lista de todos os campos disponíveis</CardDescription>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum FAQ cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-6">
              {faqs.filter(f => f.is_section && !f.parent_id).map(section => renderSection(section))}
              
              {faqs.filter(f => !f.is_section && !f.parent_id).length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Itens sem seção</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Público-alvo</TableHead>
                        <TableHead>PDF</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faqs.filter(f => !f.is_section && !f.parent_id).map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.order_index}</TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell className="capitalize">{item.target_audience}</TableCell>
                          <TableCell>
                            {item.pdf_url ? (
                              <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Ver PDF
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Sem PDF</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(item.id, item.title, item.pdf_url)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o FAQ <strong>{deletingFAQ?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingFAQ(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}