import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CertificateCardProps {
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  studentName: string;
  onPreview: () => void;
}

export const CertificateCard = ({
  courseTitle,
  certificateNumber,
  issuedAt,
  studentName,
  onPreview,
}: CertificateCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="h-2 bg-gradient-to-r from-primary to-accent" />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg line-clamp-2 mb-1">{courseTitle}</h3>
              <p className="text-sm text-muted-foreground">
                Certificado para {studentName}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Número do certificado</p>
          <p className="font-mono text-sm font-medium">{certificateNumber}</p>
        </div>

        <Button 
          onClick={onPreview}
          className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"
        >
          <Eye className="w-4 h-4 mr-2" />
          Visualizar Certificado
        </Button>
      </CardContent>
    </Card>
  );
};
