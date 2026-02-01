import PDFDocument from 'pdfkit';
import type { Quote, Customer, Company, QuoteLineItem } from '@ihms/db/schema';

// Helper to format currency
function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `$${num.toFixed(2)}`;
}

// Helper to format date
function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate PDF buffer for a quote
 */
export async function generateQuotePdfBuffer(
  quote: Quote,
  customer: Customer,
  company: Company,
  lineItems: QuoteLineItem[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 612 - 100;

    // Header - Company Info
    doc.fontSize(24).font('Helvetica-Bold').text(company.name, { align: 'left' });

    doc.fontSize(10).font('Helvetica');
    if (company.address) {
      doc.text(company.address);
    }
    if (company.phone) {
      doc.text(`Phone: ${company.phone}`);
    }
    if (company.email) {
      doc.text(`Email: ${company.email}`);
    }

    doc.moveDown(0.5);

    // Quote Title
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1f2937').text('QUOTE', { align: 'right' });
    doc.fontSize(12).font('Helvetica').fillColor('#6b7280').text(`#${quote.quoteNumber}`, { align: 'right' });

    doc.moveDown(1);

    // Horizontal line
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);

    // Two column layout
    const leftColumnX = 50;
    const rightColumnX = 320;
    const columnStartY = doc.y;

    // Left column - Customer Info
    doc.fillColor('#6b7280').fontSize(10).text('BILL TO:', leftColumnX, columnStartY);
    doc
      .fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`${customer.firstName} ${customer.lastName}`, leftColumnX, doc.y + 5);

    doc.font('Helvetica').fontSize(10);

    const customerAddress = customer.address as {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    } | null;

    if (customerAddress) {
      if (customerAddress.street) {
        doc.text(customerAddress.street, leftColumnX);
      }
      const cityStateZip = [customerAddress.city, customerAddress.state, customerAddress.zip]
        .filter(Boolean)
        .join(', ');
      if (cityStateZip) {
        doc.text(cityStateZip, leftColumnX);
      }
    }

    if (customer.email) {
      doc.text(customer.email, leftColumnX);
    }
    if (customer.phone) {
      doc.text(customer.phone, leftColumnX);
    }

    // Right column - Quote Details
    doc.fillColor('#6b7280').fontSize(10).text('QUOTE DETAILS:', rightColumnX, columnStartY);

    const detailsY = columnStartY + 18;
    doc.fillColor('#111827');

    const details = [
      ['Quote Date:', formatDate(quote.createdAt)],
      ['Valid Until:', formatDate(quote.validUntil)],
      ['Status:', quote.status.charAt(0).toUpperCase() + quote.status.slice(1)],
    ];

    details.forEach(([label, value], index) => {
      const y = detailsY + index * 18;
      doc.font('Helvetica').text(label, rightColumnX, y);
      doc.font('Helvetica-Bold').text(value, rightColumnX + 80, y);
    });

    doc.y = Math.max(doc.y, columnStartY + 90);
    doc.moveDown(1);

    // Line Items Table
    const tableTop = doc.y;
    const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Discount', 'Total'];
    const columnWidths = [220, 50, 80, 70, 80];
    const columnXPositions: number[] = [];

    let currentX = 50;
    columnWidths.forEach((width) => {
      columnXPositions.push(currentX);
      currentX += width;
    });

    // Table header background
    doc.fillColor('#f3f4f6').rect(50, tableTop, pageWidth, 25).fill();

    // Table header text
    doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold');
    tableHeaders.forEach((header, i) => {
      const align = i === 0 ? 'left' : 'right';
      const x = columnXPositions[i];
      const width = columnWidths[i] - (i === 0 ? 0 : 10);
      doc.text(header, x + 5, tableTop + 8, { width, align });
    });

    // Table rows
    let rowY = tableTop + 30;
    doc.font('Helvetica').fontSize(10);

    lineItems.forEach((item) => {
      if (rowY > 680) {
        doc.addPage();
        rowY = 50;
      }

      doc.fillColor('#111827');

      let description = item.name;
      if (item.sku) {
        description += `\nSKU: ${item.sku}`;
      }
      if (item.description) {
        description += `\n${item.description}`;
      }

      const descHeight = doc.heightOfString(description, { width: columnWidths[0] - 10 });

      doc.text(description, columnXPositions[0] + 5, rowY, { width: columnWidths[0] - 10 });
      doc.text(item.quantity.toString(), columnXPositions[1] + 5, rowY, {
        width: columnWidths[1] - 10,
        align: 'right',
      });
      doc.text(formatCurrency(item.unitPrice), columnXPositions[2] + 5, rowY, {
        width: columnWidths[2] - 10,
        align: 'right',
      });

      const discountPercent = parseFloat(item.discountPercent);
      doc.text(discountPercent > 0 ? `${discountPercent}%` : '-', columnXPositions[3] + 5, rowY, {
        width: columnWidths[3] - 10,
        align: 'right',
      });

      doc.text(formatCurrency(item.lineTotal), columnXPositions[4] + 5, rowY, {
        width: columnWidths[4] - 10,
        align: 'right',
      });

      const rowHeight = Math.max(descHeight, 15) + 10;
      rowY += rowHeight;

      doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, rowY - 5).lineTo(562, rowY - 5).stroke();
    });

    doc.moveDown(1);
    doc.y = rowY + 10;

    // Totals section
    const totalsX = 400;
    const totalsValueX = 480;

    const totalsData: [string, string][] = [['Subtotal:', formatCurrency(quote.subtotal)]];

    const discountAmount = parseFloat(quote.discountAmount);
    if (discountAmount > 0) {
      totalsData.push(['Discount:', `-${formatCurrency(discountAmount)}`]);
    }

    const taxRate = parseFloat(quote.taxRate);
    if (taxRate > 0) {
      totalsData.push([`Tax (${(taxRate * 100).toFixed(2)}%):`, formatCurrency(quote.taxAmount)]);
    }

    doc.font('Helvetica').fontSize(11);
    totalsData.forEach(([label, value]) => {
      doc.fillColor('#6b7280').text(label, totalsX, doc.y, { continued: true });
      doc.fillColor('#111827').text(value, totalsValueX, doc.y - 11, { align: 'right', width: 80 });
    });

    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(totalsX, doc.y + 5).lineTo(562, doc.y + 5).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(14);
    doc.fillColor('#111827').text('Total:', totalsX, doc.y, { continued: true });
    doc.text(formatCurrency(quote.total), totalsValueX, doc.y - 14, { align: 'right', width: 80 });

    doc.moveDown(2);

    // Notes section
    if (quote.notes) {
      doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(10).text('NOTES:', 50);
      doc.font('Helvetica').fillColor('#374151').text(quote.notes, 50);
      doc.moveDown(1);
    }

    // Signature section
    if (quote.signatureUrl && quote.signedAt) {
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(1);

      doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(10).text('CUSTOMER ACCEPTANCE:', 50);
      doc.moveDown(0.5);

      if (quote.signatureUrl.startsWith('data:image')) {
        try {
          const base64Data = quote.signatureUrl.split(',')[1];
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          doc.image(signatureBuffer, 50, doc.y, { width: 200, height: 80 });
          doc.y += 85;
        } catch {
          doc.text('[Signature on file]', 50);
        }
      }

      doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(`Signed on: ${formatDate(quote.signedAt)}`, 50);
    }

    // Footer
    const footerY = 730;
    doc
      .fontSize(9)
      .fillColor('#9ca3af')
      .text('Thank you for your business!', 50, footerY, { align: 'center', width: pageWidth });
    doc.text(`Generated on ${formatDate(new Date())}`, 50, footerY + 12, { align: 'center', width: pageWidth });

    doc.end();
  });
}
