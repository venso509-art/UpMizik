import { jsPDF } from 'jspdf';
import { ArtistUser, MusicItem } from '../types';
import { ArtistBadgeInfo, calculateArtistTotalDonations } from './badgeSystem';

export interface PortfolioData {
  artist: ArtistUser;
  songs: MusicItem[];
  badgeInfo: ArtistBadgeInfo;
  periodName?: string;
}

export const generateArtistPortfolioPdf = (data: PortfolioData): string => {
  const { artist, songs, badgeInfo, periodName } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const currentMonth = periodName || now.toLocaleDateString('ht-HT', { month: 'long', year: 'numeric' });
  const generatedAt = now.toLocaleString('ht-HT', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const docRef = `UPM-PORT-${Math.floor(100000 + Math.random() * 900000)}`;

  // Calculations
  const totalDonations = calculateArtistTotalDonations(artist, songs);
  const netArtist85 = Number((totalDonations * 0.85).toFixed(2));
  const totalListens = songs.reduce((sum, s) => sum + (s.listens || 0), 0);
  const topTracks = [...songs].sort((a, b) => (b.listens || 0) - (a.listens || 0)).slice(0, 5);

  // Background Header Banner (Dark Navy #0B1120)
  doc.setFillColor(11, 17, 32);
  doc.rect(0, 0, 210, 45, 'F');

  // Top Accent Bar (Red #DC2626 & Yellow #EAB308)
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, 105, 3, 'F');
  doc.setFillColor(234, 179, 8);
  doc.rect(105, 0, 105, 3, 'F');

  // Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('UpMizik Ayiti', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(234, 179, 8);
  doc.text('RAPÒ PÈFÒMANS & PÒTFOLYO ATIS OFISYÈL', 14, 25);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Peryòd: ${currentMonth.toUpperCase()}`, 14, 32);

  // Document Reference badge (Top right)
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(140, 12, 56, 18, 2, 2, 'F');
  doc.setTextColor(148, 163, 184);
  doc.text('REFERANS DOKIMAN', 144, 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 179, 8);
  doc.setFontSize(10);
  doc.text(`#${docRef}`, 144, 25);

  // ARTIST PROFILE OVERVIEW CARD
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 52, 182, 34, 3, 3, 'FD');

  // Left Artist Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(artist.stageName, 20, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Non Reyèl: ${artist.name || artist.stageName}`, 20, 68);
  doc.text(`Imèl Verifye: ${artist.email || 'atis@upmizik.com'}`, 20, 74);
  doc.text(`Telefòn / MonCash: ${artist.phone || 'Non anrejistre'}`, 20, 80);

  // Right Badge Box
  doc.setFillColor(234, 179, 8);
  doc.roundedRect(132, 58, 58, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTATI VERIFIKASYON', 136, 64);
  doc.setFontSize(12);
  doc.text(badgeInfo.label, 136, 72);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Platfòm UpMizik Ayiti', 136, 77);

  // METRICS & FINANCIAL KPIS SUMMARY BOXES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Rezime Estatistik & Finans', 14, 95);

  const kpis = [
    { label: 'Total Ekout', value: totalListens.toLocaleString(), sub: 'Ekout valide (5s+)' },
    { label: 'Total Donasyon Resevwa', value: `$${totalDonations.toFixed(2)} USD`, sub: 'Sipò MonCash / Natcash' },
    { label: 'Peman Nèt Atis (85%)', value: `$${netArtist85.toFixed(2)} USD`, sub: 'Kredite nan bous ou' },
    { label: 'Mizik Pibliye', value: `${songs.length} Moso`, sub: 'Katalòg aktif' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * 47;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, 100, 43, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label.toUpperCase(), x + 4, 106);

    doc.setFontSize(11);
    doc.setTextColor(idx === 2 ? 16 : 15, idx === 2 ? 185 : 23, idx === 2 ? 129 : 42);
    doc.text(kpi.value, x + 4, 115);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, x + 4, 122);
  });

  // TOP PERFORMING TRACKS TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Pi Bon Moso Mizik ki Gen Plis Siksè', 14, 136);

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 141, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('#', 18, 146.5);
  doc.text('TIT MOSO MIZIK', 28, 146.5);
  doc.text('KATEGORI', 98, 146.5);
  doc.text('EKOUT', 132, 146.5);
  doc.text('DONASYON', 165, 146.5);

  // Table Rows
  let startY = 149;
  if (topTracks.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, startY, 182, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Pa gen okenn moso mizik anrejistre pou peryòd sa a.', 65, startY + 8);
    startY += 12;
  } else {
    topTracks.forEach((track, i) => {
      const isEven = i % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
      doc.setDrawColor(241, 245, 249);
      doc.rect(14, startY, 182, 9, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${i + 1}`, 18, startY + 6);

      doc.text(track.title.length > 32 ? `${track.title.substring(0, 32)}...` : track.title, 28, startY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(track.category || 'Mizik Ayisyen', 98, startY + 6);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text((track.listens || 0).toLocaleString(), 132, startY + 6);

      doc.setTextColor(16, 185, 129);
      doc.text(`$${(track.totalDonations || 0).toFixed(2)}`, 165, startY + 6);

      startY += 9;
    });
  }

  // MONTHLY GOAL & LEVEL ATTAINMENT SUMMARY
  startY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Objektif Mansyèl & Pwochen Nivo', 14, startY);

  startY += 5;
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(14, startY, 182, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9);
  doc.text(`Nivo Aktyèl: ${badgeInfo.label}`, 20, startY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  if (badgeInfo.nextTierMinDonations) {
    const needed = Math.max(0, badgeInfo.nextTierMinDonations - totalDonations);
    doc.text(
      `Pwochen Nivo: ${badgeInfo.nextTierLabel} (Objektif: $${badgeInfo.nextTierMinDonations} USD). Manke sèlman $${needed.toFixed(2)} USD pou debloke l!`,
      20,
      startY + 13
    );
  } else {
    doc.text('🏆 Felisitasyon! Ou atenn nivo Elit ki pi wo sou platfòm UpMizik la.', 20, startY + 13);
  }
  doc.text(
    'Règleman ak transfè 85% fèt otomatikman chak 1ye nan mwa a sou kont MonCash/Natcash ki anrejistre a.',
    20,
    startY + 18
  );

  // OFFICIAL CERTIFICATE & SECURITY FOOTER
  const footerY = 250;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, 196, footerY);

  // Left Footer Seal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('UpMizik Ayiti — Sèvis Distribisyon & Sipò Mizikal', 14, footerY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Jenere nan dat: ${generatedAt} | Sèvè Otonòm: cloud.upmizik.com`, 14, footerY + 14);
  doc.text('Dokiman sa a se yon rapò ofisyèl ak sètifye pou itilizasyon pèsonèl ak pwofesyonèl atis la.', 14, footerY + 19);

  // Right Footer Signature Stamp Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(144, footerY + 4, 52, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('VALIDE PA DIREKSYON FINANS', 148, footerY + 10);
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.text('✓ UPMIZIK SÈTIFYE', 148, footerY + 16);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Kòd: #${docRef}`, 148, footerY + 21);

  // Save the PDF
  const filename = `UpMizik_Pòtfolyo_${artist.stageName.replace(/[^a-zA-Z0-9]/g, '_')}_${now.getFullYear()}_${now.getMonth() + 1}.pdf`;
  doc.save(filename);
  return filename;
};
