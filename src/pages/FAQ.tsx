import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ChevronLeft, ChevronRight, Search, FileText, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
}

interface FaqSectionAccess {
  faq_section_id: string;
  group_id: string;
}

interface GroupMember {
  group_id: string;
}

export default function FAQ() {
  const [searchParams] = useSearchParams();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('colaborador');
  const [numPages, setNumPages] = useState<{ [key: string]: number }>({});
  const [pageNumbers, setPageNumbers] = useState<{ [key: string]: number }>({});
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [allowedSections, setAllowedSections] = useState<string[]>([]);
  const [hasGroupMembership, setHasGroupMembership] = useState(false);
  
  const selectedSection = searchParams.get('section');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load user profile and type
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserType(profile.user_type || 'colaborador');
        }

        // Load user's group memberships
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        const groupIds = memberships?.map(m => m.group_id) || [];
        setUserGroups(groupIds);
        setHasGroupMembership(groupIds.length > 0);

        // If user has groups, load allowed sections
        if (groupIds.length > 0) {
          const { data: sectionAccess } = await supabase
            .from('faq_section_access')
            .select('faq_section_id')
            .in('group_id', groupIds);

          const allowedSectionIds = sectionAccess?.map(a => a.faq_section_id) || [];
          setAllowedSections(allowedSectionIds);
        }
      }

      // Load FAQs
      await loadFAQs();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFAQs = async () => {
    try {
      const { data, error } = await supabase
        .from('faqs' as any)
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFaqs(data as any || []);
      
      // Initialize page numbers
      const initialPages: { [key: string]: number } = {};
      if (data) {
        (data as any[]).forEach((faq: any) => {
          initialPages[faq.id] = 1;
        });
      }
      setPageNumbers(initialPages);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast.error('Erro ao carregar FAQs');
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

  // Check if a section is allowed for the user
  const isSectionAllowed = (sectionId: string): boolean => {
    // If user has no group membership, show all sections
    if (!hasGroupMembership) return true;
    // If user has groups, check if section is in allowed list
    return allowedSections.includes(sectionId);
  };

  // Get the root section ID for an item
  const getRootSectionId = (item: FAQ): string | null => {
    if (!item.parent_id) return item.is_section ? item.id : null;
    
    let currentParentId = item.parent_id;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    
    while (currentParentId && iterations < maxIterations) {
      const parent = faqs.find(f => f.id === currentParentId);
      if (!parent) return currentParentId;
      if (!parent.parent_id) return parent.id;
      currentParentId = parent.parent_id;
      iterations++;
    }
    
    return currentParentId;
  };

  // Filter FAQs based on audience, search, and group access
  const filteredFAQs = faqs.filter(faq => {
    const matchesAudience = faq.target_audience === userType || faq.target_audience === 'ambos';
    const matchesSearch = searchQuery === '' || 
      faq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faq.description && faq.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Check group access
    let hasGroupAccess = true;
    if (hasGroupMembership) {
      const rootSectionId = getRootSectionId(faq);
      if (rootSectionId) {
        hasGroupAccess = isSectionAllowed(rootSectionId);
      }
    }
    
    return matchesAudience && matchesSearch && hasGroupAccess;
  });

  // Get recent documents (items with PDF) - 10 most recent
  const recentDocs = filteredFAQs
    .filter(f => !f.is_section && f.pdf_url)
    .sort((a, b) => {
      const dateA = new Date((a as any).created_at || (a as any).updated_at || 0);
      const dateB = new Date((b as any).created_at || (b as any).updated_at || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);

  // Get items for selected section
  const getItemsForSection = (sectionId: string): FAQ[] => {
    const items: FAQ[] = [];
    const collectItems = (parentId: string) => {
      const directItems = filteredFAQs.filter(f => !f.is_section && f.parent_id === parentId);
      items.push(...directItems);
      
      const childSections = filteredFAQs.filter(f => f.is_section && f.parent_id === parentId);
      childSections.forEach(section => collectItems(section.id));
    };
    collectItems(sectionId);
    return items;
  };

  const selectedSectionItems = selectedSection ? getItemsForSection(selectedSection) : [];
  const selectedSectionData = faqs.find(s => s.id === selectedSection && s.is_section);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pageTitle = userType === 'cliente' ? 'FAQ' : 'Base de Conhecimento';
  const pageDescription = userType === 'cliente' 
    ? 'Perguntas frequentes'
    : 'Encontre respostas para as perguntas mais comuns';

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageDescription}</p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar conteúdo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-card border-border/50"
              />
            </div>
          </div>

          {/* Main Content */}
          {selectedSection ? (
            /* Selected Topic Documents */
            <div className="space-y-6">
              {/* Section Overview */}
              {selectedSectionData && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Folder className="w-6 h-6 text-primary" />
                      {selectedSectionData.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedSectionData.description && (
                      <div 
                        className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary mb-6"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedSectionData.description) }}
                      />
                    )}
                    <div className="text-sm text-muted-foreground pt-4 border-t border-border/50">
                      {selectedSectionItems.length} {selectedSectionItems.length === 1 ? 'documento' : 'documentos'} nesta seção
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents Grid */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Documentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSectionItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum documento neste tópico
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {selectedSectionItems.map((item) => (
                        <Card
                          key={item.id}
                          className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-border/50 overflow-hidden"
                          onClick={() => setSelectedFaq(item)}
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
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Recent Documents */
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentos Recentes
                </CardTitle>
                <CardDescription>Últimos 10 documentos adicionados</CardDescription>
              </CardHeader>
              <CardContent>
                {recentDocs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum documento disponível
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {recentDocs.map((doc) => (
                      <Card
                        key={doc.id}
                        className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-border/50 overflow-hidden"
                        onClick={() => setSelectedFaq(doc)}
                      >
                        {doc.pdf_url && (
                          <div className="w-full h-40 bg-muted/50 border-b border-border/50 flex items-center justify-center overflow-hidden">
                            <Document file={doc.pdf_url} loading={null}>
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
                            {doc.title}
                          </h3>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground line-clamp-3">{doc.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={!!selectedFaq} onOpenChange={() => setSelectedFaq(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 bg-card border-border">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold">{selectedFaq?.title}</DialogTitle>
                {selectedFaq?.description && (
                  <p className="text-muted-foreground mt-2 text-sm">{selectedFaq.description}</p>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6 bg-muted/30">
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
                      width={Math.min(window.innerWidth * 0.85, 1200)}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}