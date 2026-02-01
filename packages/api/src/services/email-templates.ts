import type { Quote, Customer, Company } from '@ihms/db/schema';

export interface QuoteEmailData {
  quote: Quote;
  customer: Customer;
  company: Company;
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function generateQuoteEmailSubject(data: QuoteEmailData): string {
  return `Quote ${data.quote.quoteNumber} from ${data.company.name}`;
}

export function generateQuoteEmailHtml(data: QuoteEmailData): string {
  const { quote, customer, company } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote ${quote.quoteNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="margin: 0 0 10px 0; color: #1f2937; font-size: 24px;">${company.name}</h1>
    ${company.phone ? `<p style="margin: 5px 0; color: #6b7280;">${company.phone}</p>` : ''}
    ${company.email ? `<p style="margin: 5px 0; color: #6b7280;">${company.email}</p>` : ''}
  </div>

  <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
    Quote #${quote.quoteNumber}
  </h2>

  <p>Dear ${customer.firstName} ${customer.lastName},</p>

  <p>Thank you for your interest. Please find attached your quote for your review.</p>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #374151;">Quote Summary</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Quote Number:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold;">${quote.quoteNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Date:</td>
        <td style="padding: 8px 0; text-align: right;">${formatDate(quote.createdAt)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Valid Until:</td>
        <td style="padding: 8px 0; text-align: right;">${formatDate(quote.validUntil)}</td>
      </tr>
      <tr style="border-top: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; color: #6b7280;">Subtotal:</td>
        <td style="padding: 12px 0; text-align: right;">${formatCurrency(quote.subtotal)}</td>
      </tr>
      ${
        parseFloat(quote.discountAmount) > 0
          ? `
      <tr>
        <td style="padding: 8px 0; color: #059669;">Discount:</td>
        <td style="padding: 8px 0; text-align: right; color: #059669;">-${formatCurrency(quote.discountAmount)}</td>
      </tr>
      `
          : ''
      }
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Tax (${(parseFloat(quote.taxRate) * 100).toFixed(2)}%):</td>
        <td style="padding: 8px 0; text-align: right;">${formatCurrency(quote.taxAmount)}</td>
      </tr>
      <tr style="border-top: 2px solid #1f2937;">
        <td style="padding: 12px 0; font-size: 18px; font-weight: bold; color: #1f2937;">Total:</td>
        <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: bold; color: #1f2937;">${formatCurrency(quote.total)}</td>
      </tr>
    </table>
  </div>

  <p>Please review the attached PDF for complete details. If you have any questions or would like to proceed, please don't hesitate to contact us.</p>

  <p style="margin-top: 30px;">
    Best regards,<br>
    <strong>${company.name}</strong>
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
    This quote is valid until ${formatDate(quote.validUntil)}.<br>
    A PDF copy is attached to this email.
  </p>
</body>
</html>
  `.trim();
}
