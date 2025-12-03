import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoNewStandard from "@/assets/logo-newstandard-certificate.png";

interface CertificateDownloadProps {
  courseTitle: string;
  studentName: string;
  studentCPF: string;
  certificateNumber: string;
  issuedAt: string;
  totalHours: number;
}

const drawCertificate = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  logo: HTMLImageElement,
  {
    courseTitle,
    studentName,
    studentCPF,
    certificateNumber,
    issuedAt,
    totalHours,
  }: CertificateDownloadProps
) => {
  // Navy blue background
  ctx.fillStyle = '#1a365d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White background with margin
  ctx.fillStyle = 'white';
  ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Orange border decoration
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);
  
  // Inner navy border
  ctx.strokeStyle = '#1a365d';
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, canvas.width - 140, canvas.height - 140);

  // Draw logo at top
  const logoWidth = 200;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  ctx.drawImage(logo, (canvas.width - logoWidth) / 2, 90, logoWidth, logoHeight);

  // Title
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICADO', canvas.width / 2, 230);

  // Subtitle
  ctx.font = '22px Arial';
  ctx.fillStyle = '#f97316';
  ctx.fillText('DE CONCLUSÃO', canvas.width / 2, 265);

  // Main text
  ctx.font = '19px Arial';
  ctx.fillStyle = '#333';
  ctx.fillText('Certificamos que', canvas.width / 2, 310);

  // Student name
  ctx.font = 'bold 38px Arial';
  ctx.fillStyle = '#1a365d';
  ctx.fillText(studentName, canvas.width / 2, 365);
  
  // Student CPF
  ctx.font = '18px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText(`CPF: ${studentCPF}`, canvas.width / 2, 400);

  // Course completion text
  ctx.font = '19px Arial';
  ctx.fillStyle = '#333';
  ctx.fillText('concluiu com sucesso o curso de', canvas.width / 2, 470);

  // Course title
  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = '#f97316';
  
  // Wrap course title if too long
  const maxWidth = canvas.width - 200;
  const words = courseTitle.split(' ');
  let line = '';
  let y = 525;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), canvas.width / 2, y);
      line = words[i] + ' ';
      y += 40;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), canvas.width / 2, y);

  // Total hours
  ctx.font = '17px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText(`Carga horária: ${totalHours} horas`, canvas.width / 2, y + 50);

  // Date
  ctx.font = '17px Arial';
  ctx.fillStyle = '#666';
  const formattedDate = format(new Date(issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  ctx.fillText(`Emitido em ${formattedDate}`, canvas.width / 2, 670);

  // Certificate number
  ctx.font = '14px monospace';
  ctx.fillStyle = '#999';
  ctx.fillText(`Certificado Nº ${certificateNumber}`, canvas.width / 2, 710);

  // Signature line
  ctx.strokeStyle = '#1a365d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 150, 750);
  ctx.lineTo(canvas.width / 2 + 150, 750);
  ctx.stroke();

  ctx.font = '16px Arial';
  ctx.fillStyle = '#1a365d';
  ctx.fillText('New Standard Software', canvas.width / 2, 775);
};

export const generateCertificateImage = (
  props: CertificateDownloadProps
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('');
      return;
    }

    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = logoNewStandard;
    
    logo.onload = () => {
      drawCertificate(ctx, canvas, logo, props);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          resolve('');
        }
      });
    };
    
    logo.onerror = () => {
      resolve('');
    };
  });
};

export const generateCertificatePDF = async (props: CertificateDownloadProps) => {
  const url = await generateCertificateImage(props);
  
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificado-${props.certificateNumber}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
