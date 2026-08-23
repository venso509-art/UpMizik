import { jsPDF } from 'jspdf';

export interface CertificateData {
  artistStageName: string;
  artistRealName: string;
  awardTitle: string;
  thresholdFormatted: string;
  category?: 'stream' | 'donation' | 'special';
  certificateCode: string;
  issueDate: string;
  signerName: string;
  signerTitle: string;
  customMessage?: string;
  specialMention?: string;
  sealLabel?: string;
}

export const generateCertificatePdf = (data: CertificateData): string => {
  const {
    artistStageName,
    artistRealName,
    awardTitle,
    thresholdFormatted,
    category = 'special',
    certificateCode,
    issueDate,
    signerName,
    signerTitle,
    customMessage,
    specialMention,
    sealLabel = 'UM SÈTIFYE'
  } = data;

  // Create A4 Landscape PDF (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background: Deep Luxury Navy / Obsidian (#060913)
  doc.setFillColor(6, 9, 19);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Gold Border
  doc.setDrawColor(212, 160, 23); // #D4A017 Gold
  doc.setLineWidth(2.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'D');

  // Inner Thin Gold Border
  doc.setDrawColor(245, 208, 108); // Lighter Gold
  doc.setLineWidth(0.8);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28, 'D');

  // Corner Ornaments (Gold Triangles/Squares)
  const cornerSize = 8;
  // Top Left
  doc.setFillColor(212, 160, 23);
  doc.triangle(14, 14, 14 + cornerSize, 14, 14, 14 + cornerSize, 'F');
  // Top Right
  doc.triangle(pageWidth - 14, 14, pageWidth - 14 - cornerSize, 14, pageWidth - 14, 14 + cornerSize, 'F');
  // Bottom Left
  doc.triangle(14, pageHeight - 14, 14 + cornerSize, pageHeight - 14, 14, pageHeight - 14 - cornerSize, 'F');
  // Bottom Right
  doc.triangle(pageWidth - 14, pageHeight - 14, pageWidth - 14 - cornerSize, pageHeight - 14, pageWidth - 14, pageHeight - 14 - cornerSize, 'F');

  // Haitian Flag Accent ribbon at top center
  doc.setFillColor(0, 32, 128); // Blue
  doc.rect(pageWidth / 2 - 25, 14, 25, 2, 'F');
  doc.setFillColor(210, 16, 52); // Red
  doc.rect(pageWidth / 2, 14, 25, 2, 'F');

  // Header Brand Tagline (International Academy Style)
  doc.setTextColor(234, 179, 8); // Gold
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('UPMIZIK AYITI  •  KOMISYON NASYONAL SÈTIFIKASYON & HOMOLOGASYON MIZIKAL', pageWidth / 2, 28, { align: 'center' });

  // Main Certificate Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('times', 'bold');
  doc.text('SÈTIFIKA HOMOLOGASYON & REKÒ OFISYÈL', pageWidth / 2, 39, { align: 'center' });

  // English/International Sub-badge
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL RECORDING INDUSTRY CERTIFICATE OF ACHIEVEMENT', pageWidth / 2, 45, { align: 'center' });

  // Subtitle / Intro
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'italic');
  doc.text('Komite Evalyasyon ak Konsèy Administrasyon UpMizik Ayiti a deklare e sètifye solanèlman ke atis :', pageWidth / 2, 54, { align: 'center' });

  // Artist Stage Name (Hero Gold Typography)
  doc.setTextColor(250, 204, 21); // Bright Gold #FACC15
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(artistStageName, pageWidth / 2, 68, { align: 'center' });

  // Artist Real Name
  if (artistRealName && artistRealName.trim() !== '' && artistRealName !== artistStageName) {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`(${artistRealName})`, pageWidth / 2, 75, { align: 'center' });
  }

  // Citation Text
  const defaultCitation = `Atenn avèk siksè nivo rekò ofisyèl ak distenksyon nasyonal pou pèfòmans eksepsyonèl sa a :`;
  const citationText = customMessage && customMessage.trim() !== '' ? customMessage : defaultCitation;
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(citationText, pageWidth / 2, 86, { align: 'center' });

  // Award Title Card Box (Centered Ribbon)
  const awardBoxWidth = 196;
  const awardBoxHeight = 25;
  const awardBoxX = (pageWidth - awardBoxWidth) / 2;
  const awardBoxY = 92;

  doc.setFillColor(15, 23, 42); // Dark Navy Accent
  doc.setDrawColor(234, 179, 8); // Gold border
  doc.setLineWidth(1);
  doc.roundedRect(awardBoxX, awardBoxY, awardBoxWidth, awardBoxHeight, 3, 3, 'FD');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(awardTitle.toUpperCase(), pageWidth / 2, 102, { align: 'center' });

  doc.setTextColor(234, 179, 8);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`PALYE HOMOLOGE : ${thresholdFormatted}`, pageWidth / 2, 110, { align: 'center' });

  // Special Mention / Dedication (if any)
  if (specialMention && specialMention.trim() !== '') {
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`« ${specialMention} »`, pageWidth / 2, 125, { align: 'center' });
  }

  // Gold Seal / Emblem Graphic (Bottom Center - Perfectly Centered & Balanced)
  const sealCenterX = pageWidth / 2;
  const sealCenterY = 162;
  const sealRadius = 16;

  // Outer Gold Solid Rim
  doc.setFillColor(212, 160, 23); // Gold #D4A017
  doc.circle(sealCenterX, sealCenterY, sealRadius, 'F');

  // Inner Dark Circle
  doc.setFillColor(6, 9, 19);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 1.2, 'F');

  // Inner Fine Gold Ring
  doc.setDrawColor(245, 208, 108); // #F5D06C
  doc.setLineWidth(0.4);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 2.8, 'D');

  // 1. Star Icon at top of seal (Centered)
  doc.setTextColor(250, 204, 21); // Bright Gold
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('★', sealCenterX, sealCenterY - 4.5, { align: 'center' });

  // 2. UPMIZIK text (Centered)
  doc.setTextColor(250, 204, 21);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('UPMIZIK', sealCenterX, sealCenterY + 1.5, { align: 'center' });

  // 3. OFISYÈL text (Centered)
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('OFISYÈL', sealCenterX, sealCenterY + 6.5, { align: 'center' });

  // Left Footer: Certificate Verification Info
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('KÒD MATRIKIL / ID:', 25, 153);
  doc.setTextColor(234, 179, 8);
  doc.setFontSize(9.5);
  doc.setFont('courier', 'bold');
  doc.text(`#${certificateCode}`, 25, 159);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DAT HOMOLOGASYON:', 25, 168);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(issueDate, 25, 174);

  doc.setTextColor(16, 185, 129); // Emerald Green
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('✔ Otantifye & Verifye sou upmizik.com', 25, 181);

  // Right Footer: Signature Box
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('KOMISYON HOMOLOGASYON & DIREKSYON:', pageWidth - 85, 153);

  // Handwritten Style signature line
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('times', 'bolditalic');
  doc.text(signerName, pageWidth - 85, 162);

  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 85, 165, pageWidth - 25, 165);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(signerTitle, pageWidth - 85, 170);

  doc.setTextColor(234, 179, 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Kolèj Sètifikasyon UpMizik Ayiti', pageWidth - 85, 176);

  // Bottom Notice
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Sètifika sa a se yon distenksyon ofisyèl ki anrejistre nan Rejis Nasyonal Palmarès UpMizik Ayiti. Tout dwa rezève.', pageWidth / 2, 196, { align: 'center' });

  // Trigger download with sanitized filename
  const cleanArtist = artistStageName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanAward = awardTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Setifika-UpMizik-${cleanArtist}-${cleanAward}.pdf`;
  doc.save(filename);

  return filename;
};
