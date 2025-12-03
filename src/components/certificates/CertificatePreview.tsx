import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { generateCertificateImage } from "./CertificateDownload";

interface CertificatePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  studentName: string;
  studentCPF: string;
  certificateNumber: string;
  issuedAt: string;
  totalHours: number;
}

export const CertificatePreview = ({
  open,
  onOpenChange,
  courseTitle,
  studentName,
  studentCPF,
  certificateNumber,
  issuedAt,
  totalHours,
}: CertificatePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (open) {
      generateCertificateImage({
        courseTitle,
        studentName,
        studentCPF,
        certificateNumber,
        issuedAt,
        totalHours,
      }).then((url) => {
        if (url) setPreviewUrl(url);
      });
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [open, courseTitle, studentName, studentCPF, certificateNumber, issuedAt, totalHours]);

  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement("a");
      link.href = previewUrl;
      link.download = `certificado-${certificateNumber}.png`;
      link.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Certificado</DialogTitle>
          <DialogDescription>
            Visualize seu certificado antes de fazer o download
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {previewUrl ? (
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <img
                src={previewUrl}
                alt="Pré-visualização do certificado"
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">Gerando pré-visualização...</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
            <Button onClick={handleDownload} disabled={!previewUrl}>
              <Download className="w-4 h-4 mr-2" />
              Baixar Certificado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
