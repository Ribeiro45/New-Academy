import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ChevronLeft, ChevronRight, FileText, Folder, ArrowLeft, MessageSquarePlus, User, Send, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useViewLogger } from '@/hooks/useViewLogger';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FAQ {
  id: string;
  title: string;
  description: string | null;
  target_audience: string;
  pdf_url: string | null;
  pdf_pages: any;
  parent_id: string | null;
  is_section: boolean;
  created_at: string | null;
}

interface FAQNote {
  id: string;
  faq_id: string;
  user_id: string;
  note: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function FAQSection() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { logView, logAction } = useViewLogger();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('colaborador');
  const [numPages, setNumPages] = useState<{ [key: string]: number }>({});
  const [pageNumbers, setPageNumbers] = useState<{ [key: string]: number }>({});
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null);
  const [sectionData, setSectionData] = useState<FAQ | null>(null);
  const [notes, setNotes] = useState<FAQNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  useEffect(() => {
    loadUserType();
    loadFAQs();
  }, [sectionId]);

  useEffect(() => {
    if (selectedFaq) {
      loadNotes(selectedFaq.id);
    }
  }, [selectedFaq]);

  const loadUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type, full_name, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserType(profile.user_type || 'colaborador');
          setCurrentUser({
            id: user.id,
            name: profile.full_name || '',
            email: profile.email || user.email || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading user type:', error);
    }
  };

  const loadNotes = async (faqId: string) => {
    try {
      const { data, error } = await supabase
        .from('faq_notes')
        .select('*')
        .eq('faq_id', faqId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names for each note
      const notesWithUsers: FAQNote[] = [];
      for (const note of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', note.user_id)
          .single();
        
        notesWithUsers.push({
          ...note,
          user_name: profile?.full_name || 'Usuário',
          user_email: profile?.email || ''
        });
      }
      
      setNotes(notesWithUsers);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleSubmitNote = async () => {
    if (!newNote.trim() || !selectedFaq || !currentUser) {
      toast.error('Por favor, escreva uma nota');
      return;
    }

    setSubmittingNote(true);
    try {
      const { error } = await supabase
        .from('faq_notes')
        .insert({
          faq_id: selectedFaq.id,
          user_id: currentUser.id,
          note: newNote.trim()
        });

      if (error) throw error;

      // Log the action
      logView('faq_notes', selectedFaq.id, `Nota adicionada: ${selectedFaq.title}`);

      toast.success('Nota adicionada com sucesso!');
      setNewNote('');
      loadNotes(selectedFaq.id);
    } catch (error) {
      console.error('Error submitting note:', error);
      toast.error('Erro ao adicionar nota');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleEditNote = async (noteId: string, oldNoteText: string) => {
    if (!editingNoteText.trim() || !selectedFaq) {
      toast.error('A nota não pode estar vazia');
      return;
    }

    try {
      const { error } = await supabase
        .from('faq_notes')
        .update({ note: editingNoteText.trim() })
        .eq('id', noteId);

      if (error) throw error;

      // Log the update action
      await logAction(
        'UPDATE',
        'faq_notes',
        noteId,
        `Nota editada no documento: ${selectedFaq.title}`,
        { note: oldNoteText },
        { note: editingNoteText.trim() }
      );

      toast.success('Nota atualizada!');
      setEditingNoteId(null);
      setEditingNoteText('');
      loadNotes(selectedFaq.id);
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Erro ao atualizar nota');
    }
  };

  const handleDeleteNote = async (noteId: string, noteText: string) => {
    if (!selectedFaq) return;

    try {
      const { error } = await supabase
        .from('faq_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      // Log the delete action
      await logAction(
        'DELETE',
        'faq_notes',
        noteId,
        `Nota excluída do documento: ${selectedFaq.title}`,
        { note: noteText },
        null
      );

      toast.success('Nota excluída!');
      loadNotes(selectedFaq.id);
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Erro ao excluir nota');
    }
  };

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faqs' as any)
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      
      const allFaqs = (data as any as FAQ[]) || [];
      setFaqs(allFaqs);
      
      // Find section data
      const section = allFaqs.find(f => f.id === sectionId && f.is_section);
      setSectionData(section || null);
      
      // Initialize page numbers
      const initialPages: { [key: string]: number } = {};
      allFaqs.forEach((faq) => {
        initialPages[faq.id] = 1;
      });
      setPageNumbers(initialPages);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast.error('Erro ao carregar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = (faqId: string, { numPages }: { numPages: number }) => {
    setNumPages(prev => ({ ...prev, [faqId]: numPages }));
  };

  const changePage = (faqId: string, offset: number) => {
    setPageNumbers(prev => ({
      ...prev,
      [faqId]: (prev[faqId] || 1) + offset
    }));
  };

  // Filter FAQs by user type
  const filteredFAQs = faqs.filter(faq => {
    return faq.target_audience === userType || faq.target_audience === 'ambos';
  });

  // Get items for selected section recursively
  const getItemsForSection = (parentId: string): FAQ[] => {
    const items: FAQ[] = [];
    const collectItems = (pId: string) => {
      const directItems = filteredFAQs.filter(f => !f.is_section && f.parent_id === pId);
      items.push(...directItems);
      
      const childSections = filteredFAQs.filter(f => f.is_section && f.parent_id === pId);
      childSections.forEach(section => collectItems(section.id));
    };
    collectItems(parentId);
    return items;
  };

  // Get direct sub-sections
  const getSubSections = (parentId: string): FAQ[] => {
    return filteredFAQs.filter(f => f.is_section && f.parent_id === parentId);
  };

  const sectionItems = sectionId ? getItemsForSection(sectionId) : [];
  const subSections = sectionId ? getSubSections(sectionId) : [];
  const directItems = sectionId ? filteredFAQs.filter(f => !f.is_section && f.parent_id === sectionId) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-6 md:p-8">
          {/* Back button */}
          <Link 
            to="/faq" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Base de Conhecimento
          </Link>

          {/* Section Header */}
          {sectionData ? (
            <Card className="border-border/50 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Folder className="w-7 h-7 text-primary" />
                  {sectionData.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sectionData.description && (
                  <div 
                    className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sectionData.description) }}
                  />
                )}
                <div className="text-sm text-muted-foreground pt-4 mt-4 border-t border-border/50">
                  {sectionItems.length} {sectionItems.length === 1 ? 'documento' : 'documentos'} • {subSections.length} {subSections.length === 1 ? 'sub-seção' : 'sub-seções'}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Seção não encontrada</h1>
              <p className="text-muted-foreground">A seção solicitada não existe ou você não tem acesso.</p>
            </div>
          )}

          {/* Sub-sections */}
          {subSections.length > 0 && (
            <Card className="border-border/50 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-primary" />
                  Sub-seções
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {subSections.map((subSection) => (
                    <Link
                      key={subSection.id}
                      to={`/faq/section/${subSection.id}`}
                      className="group"
                    >
                      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                              {subSection.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {getItemsForSection(subSection.id).length} documentos
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Direct Documents */}
          {directItems.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {directItems.map((item) => (
                    <Card
                      key={item.id}
                      className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-border/50 overflow-hidden"
                      onClick={() => {
                        logView('faqs', item.id, item.title);
                        setSelectedFaq(item);
                      }}
                    >
                      {item.pdf_url && (
                        <div className="w-full h-40 bg-muted/50 border-b border-border/50 flex items-center justify-center overflow-hidden">
                          <Document file={item.pdf_url} loading={null}>
                            <Page
                              pageNumber={1}
                              width={260}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              className="mx-auto scale-95 group-hover:scale-100 transition-transform origin-center"
                            />
                          </Document>
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {sectionData && directItems.length === 0 && subSections.length === 0 && (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Folder className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum conteúdo disponível nesta seção</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={!!selectedFaq} onOpenChange={() => { setSelectedFaq(null); setShowNotes(false); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 bg-card border-border">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold">{selectedFaq?.title}</DialogTitle>
                {selectedFaq?.description && (
                  <p className="text-muted-foreground mt-2 text-sm">{selectedFaq.description}</p>
                )}
              </div>
              <Button
                variant={showNotes ? "default" : "outline"}
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className="gap-2 shrink-0"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Notas ({notes.length})
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex">
            {/* PDF Content */}
            <div className={`flex-1 overflow-auto p-6 bg-muted/30 transition-all ${showNotes ? 'w-2/3' : 'w-full'}`}>
              {selectedFaq?.pdf_url && (
                <div className="space-y-6">
                  <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                    <Document
                      file={selectedFaq.pdf_url}
                      onLoadSuccess={(pdf) => onDocumentLoadSuccess(selectedFaq.id, pdf)}
                      loading={
                        <div className="flex items-center justify-center p-12">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumbers[selectedFaq.id] || 1}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="mx-auto"
                        width={Math.min(window.innerWidth * (showNotes ? 0.55 : 0.85), showNotes ? 800 : 1200)}
                      />
                    </Document>
                  </div>
                  
                  {numPages[selectedFaq.id] && numPages[selectedFaq.id] > 1 && (
                    <div className="flex items-center justify-center gap-4 pb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(selectedFaq.id, -1)}
                        disabled={(pageNumbers[selectedFaq.id] || 1) <= 1}
                        className="gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                      </Button>
                      
                      <span className="text-sm font-medium px-4 py-2 bg-card rounded-lg border border-border/50">
                        Página {pageNumbers[selectedFaq.id] || 1} de {numPages[selectedFaq.id]}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(selectedFaq.id, 1)}
                        disabled={(pageNumbers[selectedFaq.id] || 1) >= numPages[selectedFaq.id]}
                        className="gap-2"
                      >
                        Próxima
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes Panel */}
            {showNotes && (
              <div className="w-1/3 border-l border-border/50 flex flex-col bg-background">
                <div className="p-4 border-b border-border/50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquarePlus className="w-4 h-4 text-primary" />
                    Notas de Correções e Melhorias
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione sugestões para melhorar este documento
                  </p>
                </div>

                {/* Add Note Form */}
                {currentUser && (
                  <div className="p-4 border-b border-border/50 space-y-3">
                    <Textarea
                      placeholder="Escreva sua nota de correção ou sugestão de melhoria..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <Button
                      onClick={handleSubmitNote}
                      disabled={submittingNote || !newNote.trim()}
                      className="w-full gap-2"
                      size="sm"
                    >
                      {submittingNote ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enviar Nota
                    </Button>
                  </div>
                )}

                {/* Notes List */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {notes.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        Nenhuma nota ainda. Seja o primeiro a contribuir!
                      </p>
                    ) : (
                      notes.map((note) => (
                        <Card key={note.id} className="border-border/50">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="p-1.5 rounded-full bg-primary/10">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {note.user_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(note.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                              {/* Edit/Delete buttons for own notes */}
                              {currentUser && currentUser.id === note.user_id && (
                                <div className="flex items-center gap-1">
                                  {editingNoteId === note.id ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleEditNote(note.id, note.note)}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                          setEditingNoteId(null);
                                          setEditingNoteText('');
                                        }}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={() => {
                                          setEditingNoteId(note.id);
                                          setEditingNoteText(note.note);
                                        }}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteNote(note.id, note.note)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            {editingNoteId === note.id ? (
                              <Textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                rows={3}
                                className="resize-none text-sm"
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm text-foreground whitespace-pre-wrap">
                                {note.note}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
