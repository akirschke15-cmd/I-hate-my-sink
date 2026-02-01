import { Resend } from 'resend';

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  fromName: string;
  fromAddress: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Initialize Resend client lazily
let resendClient: Resend | null = null;

function getResendClient(apiKey: string): Resend {
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEmail(
  input: SendEmailInput,
  apiKey: string | undefined,
  isDev: boolean
): Promise<SendEmailResult> {
  // Dev mode: log and return success without sending
  if (isDev && !apiKey) {
    console.log('[DEV EMAIL] Would send email:', {
      to: input.to,
      toName: input.toName,
      subject: input.subject,
      from: `${input.fromName} <${input.fromAddress}>`,
      hasAttachments: !!input.attachments?.length,
      attachmentCount: input.attachments?.length || 0,
    });
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  try {
    const resend = getResendClient(apiKey);

    const { data, error } = await resend.emails.send({
      from: `${input.fromName} <${input.fromAddress}>`,
      to: input.toName ? `${input.toName} <${input.to}>` : input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    });

    if (error) {
      console.error('[EMAIL ERROR]', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[EMAIL ERROR]', message);
    return { success: false, error: message };
  }
}

export function isEmailConfigured(apiKey: string | undefined, isDev: boolean): boolean {
  return !!apiKey || isDev;
}
