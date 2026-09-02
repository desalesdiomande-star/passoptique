import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  authorization: string;
  optician: string;
  exerciseNumber: string;
}

interface PdfItem {
  description: string;
  qty: number;
  unitPrice: number;
}

interface PdfInvoice {
  id: string;
  type: 'invoice' | 'quote';
  client: string;
  date: string;
  dueDate: string;
  items: PdfItem[];
  paymentMethod: string;
  status: string;
}

const SHOP_DEFAULTS: ShopInfo = {
  name: 'Optique Vision Plus',
  address: 'Cocody, Rue des Jardins, Abidjan',
  phone: '+225 07 08 09 10',
  authorization: 'AUT-2024-0042',
  optician: 'Dr. Kouamé Jean-Baptiste',
  exerciseNumber: 'EX-2024-0078',
};

export const generateInvoicePdf = (invoice: PdfInvoice, lang: 'fr' | 'en', shop?: Partial<ShopInfo>) => {
  const s = { ...SHOP_DEFAULTS, ...shop };
  const doc = new jsPDF();
  const isFr = lang === 'fr';
  const isQuote = invoice.type === 'quote';
  const pageW = doc.internal.pageSize.getWidth();
  const primary = [255, 203, 5] as const; // #FFCB05

  // Header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 40, 'F');

  // Shop name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(s.name, 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(s.address, 14, 25);
  doc.text(`Tél: ${s.phone}`, 14, 30);

  // Document title on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const title = isQuote ? (isFr ? 'DEVIS' : 'QUOTE') : (isFr ? 'FACTURE' : 'INVOICE');
  doc.text(`${title} #${invoice.id}`, pageW - 14, 18, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${invoice.date}`, pageW - 14, 25, { align: 'right' });
  if (invoice.dueDate) {
    doc.text(`${isFr ? 'Échéance' : 'Due'}: ${invoice.dueDate}`, pageW - 14, 30, { align: 'right' });
  }

  // Regulatory info box
  let y = 48;
  doc.setFillColor(245, 246, 248);
  doc.roundedRect(14, y, pageW - 28, 20, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`N° Autorisation: ${s.authorization}`, 18, y + 6);
  doc.text(`N° Exercice: ${s.exerciseNumber}`, pageW / 2, y + 6);
  doc.text(`${isFr ? 'Opticien' : 'Optician'}: ${s.optician}`, 18, y + 13);

  // Client
  y = 76;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Client:', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.client, 38, y);

  // Items table
  y = 86;
  const total = invoice.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  autoTable(doc, {
    startY: y,
    head: [[
      isFr ? 'Description' : 'Description',
      isFr ? 'Qté' : 'Qty',
      isFr ? 'Prix unitaire' : 'Unit Price',
      isFr ? 'Montant' : 'Amount',
    ]],
    body: invoice.items.map(it => [
      it.description,
      it.qty.toString(),
      `${it.unitPrice.toLocaleString()} FCFA`,
      `${(it.qty * it.unitPrice).toLocaleString()} FCFA`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [255, 203, 5], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(...primary);
  doc.roundedRect(pageW - 80, finalY, 66, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`${isFr ? 'TOTAL' : 'TOTAL'}: ${total.toLocaleString()} FCFA`, pageW - 16, finalY + 10, { align: 'right' });

  // Payment method
  if (invoice.paymentMethod) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${isFr ? 'Mode de paiement' : 'Payment method'}: ${invoice.paymentMethod}`, 14, finalY + 10);
  }

  // Signatures
  const sigY = finalY + 30;
  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);

  doc.text(isFr ? 'Signature client' : 'Client Signature', 45, sigY, { align: 'center' });
  doc.line(14, sigY + 20, 76, sigY + 20);

  doc.text(isFr ? 'Signature opticien' : 'Optician Signature', pageW - 45, sigY, { align: 'center' });
  doc.line(pageW - 76, sigY + 20, pageW - 14, sigY + 20);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('© Pass Santé Mousso — PASS OPTIQUE by MTN', pageW / 2, footerY, { align: 'center' });

  // Download
  doc.save(`${invoice.id}.pdf`);
};

export const generateReportPdf = (
  title: string,
  lang: 'fr' | 'en',
  data: { label: string; value: string }[],
  userName: string,
  role: string,
  period: string,
) => {
  const doc = new jsPDF();
  const isFr = lang === 'fr';
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(255, 203, 5);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${isFr ? 'Période' : 'Period'}: ${period}`, pageW - 14, 14, { align: 'right' });
  doc.text(`${isFr ? 'Généré par' : 'Generated by'}: ${userName} (${role})`, pageW - 14, 22, { align: 'right' });

  // Data table
  autoTable(doc, {
    startY: 42,
    head: [[isFr ? 'Indicateur' : 'Metric', isFr ? 'Valeur' : 'Value']],
    body: data.map(d => [d.label, d.value]),
    theme: 'striped',
    headStyles: { fillColor: [255, 203, 5], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`© Pass Santé Mousso — PASS OPTIQUE by MTN — ${new Date().toLocaleDateString()}`, pageW / 2, footerY, { align: 'center' });

  doc.save(`${title.replace(/\s+/g, '_')}_${period}.pdf`);
};