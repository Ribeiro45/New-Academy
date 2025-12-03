import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { CertificateCard } from "@/components/certificates/CertificateCard";
import { CertificatePreview } from "@/components/certificates/CertificatePreview";
import { Skeleton } from "@/components/ui/skeleton";
import { Award } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  course: {
    title: string;
    total_hours: number;
  };
}

const Certificates = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; cpf: string } | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [certificatesRes, profileRes] = await Promise.all([
        supabase
          .from("certificates")
          .select(`
            id,
            certificate_number,
            issued_at,
            course_id,
            courses (
              title,
              id
            )
          `)
          .order("issued_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("full_name, cpf")
          .eq("id", user?.id)
          .single(),
      ]);

      if (certificatesRes.data) {
        // Get course IDs to fetch lessons
        const courseIds = certificatesRes.data.map(c => c.course_id);
        
        // Fetch lessons for all courses
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("course_id, duration_minutes")
          .in("course_id", courseIds);

        // Calculate total hours per course
        const courseHours: Record<string, number> = {};
        lessonsData?.forEach(lesson => {
          if (!courseHours[lesson.course_id]) {
            courseHours[lesson.course_id] = 0;
          }
          courseHours[lesson.course_id] += lesson.duration_minutes || 0;
        });

        const formattedCerts = certificatesRes.data.map(cert => ({
          id: cert.id,
          certificate_number: cert.certificate_number,
          issued_at: cert.issued_at,
          course: {
            title: (cert.courses as any)?.title || "Curso sem título",
            total_hours: Math.round((courseHours[cert.course_id] || 0) / 60)
          }
        }));
        setCertificates(formattedCerts);
      }
      
      if (profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (error) {
      console.error("Error loading certificates:", error);
      toast.error("Erro ao carregar certificados");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setPreviewOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Award className="w-10 h-10 text-primary" />
              Meus Certificados
            </h1>
            <p className="text-muted-foreground">
              Certificados dos cursos que você completou
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                </div>
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhum certificado ainda</h3>
              <p className="text-muted-foreground mb-6">
                Complete um curso para receber seu primeiro certificado!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate, index) => (
                <div 
                  key={certificate.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CertificateCard
                    courseTitle={certificate.course.title}
                    certificateNumber={certificate.certificate_number}
                    issuedAt={certificate.issued_at}
                    studentName={profile?.full_name || "Estudante"}
                    onPreview={() => handlePreview(certificate)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedCertificate && (
          <CertificatePreview
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            courseTitle={selectedCertificate.course.title}
            studentName={profile?.full_name || "Estudante"}
            studentCPF={profile?.cpf || "000.000.000-00"}
            certificateNumber={selectedCertificate.certificate_number}
            issuedAt={selectedCertificate.issued_at}
            totalHours={selectedCertificate.course.total_hours}
          />
        )}
      </main>
    </div>
  );
};

export default Certificates;
