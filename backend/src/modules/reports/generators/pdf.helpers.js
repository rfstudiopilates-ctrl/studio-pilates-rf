import PDFDocument from 'pdfkit';

export function createPdfBuffer(buildDocument) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    buildDocument(doc);
    doc.end();
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  // Columnas DATE: usar el día calendario, no el instante UTC (evita -1 día en AR).
  let dateString;
  if (value instanceof Date) {
    dateString = value.toISOString().slice(0, 10);
  } else {
    dateString = String(value).slice(0, 10);
  }

  return new Date(`${dateString}T12:00:00`).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function writeReportHeader(doc, settings, title, range) {
  doc.fontSize(18).text(settings.studioName || 'Studio Pilates RF', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor('#555555')
    .text(`Período: ${range.from} → ${range.to}`, { align: 'center' });
  doc.text(`Generado: ${formatDateTime(new Date())}`, { align: 'center' });
  doc.moveDown();
  doc.fillColor('#000000');
}

export function writeKeyValueSection(doc, title, rows) {
  doc.fontSize(12).text(title, { underline: true });
  doc.moveDown(0.5);

  rows.forEach(([label, value]) => {
    doc.fontSize(10).text(`${label}: ${value}`);
  });

  doc.moveDown();
}

export function writeTable(doc, headers, rows, options = {}) {
  const startX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidth = tableWidth / headers.length;
  let y = doc.y;

  doc.fontSize(10).font('Helvetica-Bold');
  headers.forEach((header, index) => {
    doc.text(header, startX + index * columnWidth, y, {
      width: columnWidth - 8,
      continued: false,
    });
  });

  y += 18;
  doc.font('Helvetica');

  rows.forEach((row) => {
    if (y > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    row.forEach((cell, index) => {
      doc.text(String(cell ?? ''), startX + index * columnWidth, y, {
        width: columnWidth - 8,
        continued: false,
      });
    });

    y += options.rowHeight || 16;
  });

  doc.y = y + 10;
}
