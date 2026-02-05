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

    // Page dimensions (Letter size: 612x792, with 50px margins on each side)
    const pageWidth = 612 - 100; // 512px usable width
    const leftMargin = 50;
    const rightMargin = 562; // 612 - 50

    // Header - Company Info (left side)
    const companyNameY = doc.y;
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(company.name, leftMargin, companyNameY, { width: 280, lineBreak: true });

    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    if (company.address) {
      doc.text(company.address, leftMargin, doc.y, { width: 280 });
    }
    if (company.phone) {
      doc.text(`Phone: ${company.phone}`, leftMargin, doc.y, { width: 280 });
    }
    if (company.email) {
      doc.text(`Email: ${company.email}`, leftMargin, doc.y, { width: 280 });
    }

    // Quote Title (right side, parallel to company info)
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text('QUOTE', 340, companyNameY, { align: 'right', width: 222 });
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(`#${quote.quoteNumber}`, 340, doc.y, { align: 'right', width: 222 });

    // Move down past both columns
    doc.y = Math.max(doc.y, companyNameY + 80);
    doc.moveDown(0.5);

    // Horizontal line
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(leftMargin, doc.y).lineTo(rightMargin, doc.y).stroke();
    doc.moveDown(1);

    // Two column layout for customer and quote details
    const leftColumnX = leftMargin;
    const rightColumnX = 310;
    const columnStartY = doc.y;

    // Left column - Customer Info (max width 240px)
    doc.fillColor('#6b7280').fontSize(9).text('BILL TO:', leftColumnX, columnStartY);
    doc
      .fillColor('#111827')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`${customer.firstName} ${customer.lastName}`, leftColumnX, doc.y + 5, { width: 240 });

    doc.font('Helvetica').fontSize(9);

    const customerAddress = customer.address as {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    } | null;

    if (customerAddress) {
      if (customerAddress.street) {
        doc.text(customerAddress.street, leftColumnX, doc.y, { width: 240 });
      }
      const cityStateZip = [customerAddress.city, customerAddress.state, customerAddress.zip]
        .filter(Boolean)
        .join(', ');
      if (cityStateZip) {
        doc.text(cityStateZip, leftColumnX, doc.y, { width: 240 });
      }
    }

    if (customer.email) {
      doc.text(customer.email, leftColumnX, doc.y, { width: 240 });
    }
    if (customer.phone) {
      doc.text(customer.phone, leftColumnX, doc.y, { width: 240 });
    }

    // Right column - Quote Details (max width 240px)
    doc.fillColor('#6b7280').fontSize(9).text('QUOTE DETAILS:', rightColumnX, columnStartY);

    const detailsY = columnStartY + 16;
    doc.fillColor('#111827').fontSize(9);

    const details = [
      ['Quote Date:', formatDate(quote.createdAt)],
      ['Valid Until:', formatDate(quote.validUntil)],
      ['Status:', quote.status.charAt(0).toUpperCase() + quote.status.slice(1)],
    ];

    details.forEach(([label, value], index) => {
      const y = detailsY + index * 16;
      doc.font('Helvetica').text(label, rightColumnX, y, { width: 70 });
      doc.font('Helvetica-Bold').text(value, rightColumnX + 70, y, { width: 180 });
    });

    doc.y = Math.max(doc.y, columnStartY + 70);
    doc.moveDown(1);

    // Line Items Table
    const tableTop = doc.y;
    const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Discount', 'Total'];

    // Adjusted column widths to fit within 512px page width
    // Total: 254 + 46 + 68 + 68 + 68 = 504px (leaves 8px buffer)
    const columnWidths = [254, 46, 68, 68, 68];
    const columnXPositions: number[] = [];

    let currentX = leftMargin;
    columnWidths.forEach((width) => {
      columnXPositions.push(currentX);
      currentX += width;
    });

    // Table header background
    doc.fillColor('#f3f4f6').rect(leftMargin, tableTop, pageWidth, 22).fill();

    // Table header text
    doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
    tableHeaders.forEach((header, i) => {
      const align = i === 0 ? 'left' : 'right';
      const x = columnXPositions[i];
      const width = columnWidths[i] - 8; // 4px padding on each side
      doc.text(header, x + 4, tableTop + 7, { width, align });
    });

    // Table rows
    let rowY = tableTop + 26;
    doc.font('Helvetica').fontSize(9);

    lineItems.forEach((item) => {
      // Check if we need a new page (leave room for totals and footer)
      if (rowY > 640) {
        doc.addPage();
        rowY = 50;
      }

      doc.fillColor('#111827');

      // Build description with proper wrapping
      let description = item.name;
      if (item.sku) {
        description += `\nSKU: ${item.sku}`;
      }
      if (item.description) {
        // Limit description length to prevent excessive wrapping
        const maxDescLength = 150;
        const truncatedDesc =
          item.description.length > maxDescLength
            ? item.description.substring(0, maxDescLength) + '...'
            : item.description;
        description += `\n${truncatedDesc}`;
      }

      const descWidth = columnWidths[0] - 8;
      const descHeight = doc.heightOfString(description, { width: descWidth });

      // Description column (left-aligned)
      doc.text(description, columnXPositions[0] + 4, rowY, { width: descWidth, lineBreak: true });

      // Numeric columns (right-aligned)
      const numericY = rowY; // Align to top of row
      doc.text(item.quantity.toString(), columnXPositions[1] + 4, numericY, {
        width: columnWidths[1] - 8,
        align: 'right',
      });
      doc.text(formatCurrency(item.unitPrice), columnXPositions[2] + 4, numericY, {
        width: columnWidths[2] - 8,
        align: 'right',
      });

      const discountPercent = parseFloat(item.discountPercent);
      doc.text(discountPercent > 0 ? `${discountPercent}%` : '-', columnXPositions[3] + 4, numericY, {
        width: columnWidths[3] - 8,
        align: 'right',
      });

      doc.text(formatCurrency(item.lineTotal), columnXPositions[4] + 4, numericY, {
        width: columnWidths[4] - 8,
        align: 'right',
      });

      // Calculate row height and add separator line
      const rowHeight = Math.max(descHeight, 14) + 8;
      rowY += rowHeight;

      doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(leftMargin, rowY - 4).lineTo(rightMargin, rowY - 4).stroke();
    });

    doc.moveDown(0.5);
    doc.y = rowY + 8;

    // Totals section (right-aligned, within page margins)
    // Adjusted to keep everything within bounds: rightMargin = 562
    const totalsLabelX = 370;
    const totalsLabelWidth = 100;
    const totalsValueX = 475;
    const totalsValueWidth = 87; // Ends at 562 (within right margin)

    const totalsData: [string, string][] = [['Subtotal:', formatCurrency(quote.subtotal)]];

    const discountAmount = parseFloat(quote.discountAmount);
    if (discountAmount > 0) {
      totalsData.push(['Discount:', `-${formatCurrency(discountAmount)}`]);
    }

    const taxRate = parseFloat(quote.taxRate);
    if (taxRate > 0) {
      totalsData.push([`Tax (${(taxRate * 100).toFixed(2)}%):`, formatCurrency(quote.taxAmount)]);
    }

    doc.font('Helvetica').fontSize(10);
    totalsData.forEach(([label, value]) => {
      const currentY = doc.y;
      doc.fillColor('#6b7280').text(label, totalsLabelX, currentY, { width: totalsLabelWidth, align: 'right' });
      doc.fillColor('#111827').text(value, totalsValueX, currentY, { width: totalsValueWidth, align: 'right' });
      doc.moveDown(0.8);
    });

    doc
      .strokeColor('#111827')
      .lineWidth(1)
      .moveTo(totalsLabelX, doc.y + 5)
      .lineTo(rightMargin, doc.y + 5)
      .stroke();
    doc.moveDown(0.8);

    doc.font('Helvetica-Bold').fontSize(12);
    const totalY = doc.y;
    doc.fillColor('#111827').text('Total:', totalsLabelX, totalY, { width: totalsLabelWidth, align: 'right' });
    doc.text(formatCurrency(quote.total), totalsValueX, totalY, { width: totalsValueWidth, align: 'right' });

    doc.moveDown(1.5);

    // Notes section
    if (quote.notes) {
      // Check if we need a new page for notes
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(9).text('NOTES:', leftMargin);
      doc.font('Helvetica').fillColor('#374151').fontSize(9).text(quote.notes, leftMargin, doc.y, { width: pageWidth });
      doc.moveDown(1);
    }

    // Signature section
    if (quote.signatureUrl && quote.signedAt) {
      // Check if we need a new page for signature
      if (doc.y > 630) {
        doc.addPage();
      }

      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(leftMargin, doc.y).lineTo(rightMargin, doc.y).stroke();
      doc.moveDown(0.8);

      doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(9).text('CUSTOMER ACCEPTANCE:', leftMargin);
      doc.moveDown(0.5);

      if (quote.signatureUrl.startsWith('data:image')) {
        try {
          const base64Data = quote.signatureUrl.split(',')[1];
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          doc.image(signatureBuffer, leftMargin, doc.y, { width: 180, height: 70 });
          doc.y += 75;
        } catch {
          doc.text('[Signature on file]', leftMargin);
        }
      }

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(`Signed on: ${formatDate(quote.signedAt)}`, leftMargin);
    }

    // Footer (fixed position at bottom)
    const footerY = 730;
    doc
      .fontSize(8)
      .fillColor('#9ca3af')
      .text('Thank you for your business!', leftMargin, footerY, { align: 'center', width: pageWidth });
    doc.text(`Generated on ${formatDate(new Date())}`, leftMargin, footerY + 12, {
      align: 'center',
      width: pageWidth,
    });

    doc.end();
  });
}
