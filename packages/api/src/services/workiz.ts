import type { Quote, Customer, Company } from '@ihms/db/schema';

export interface WorkizJobInput {
  quote: Quote;
  customer: Customer;
  company: Company;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    type: string;
  }>;
}

export interface WorkizJobResult {
  success: boolean;
  jobId?: string;
  jobUrl?: string;
  error?: string;
}

/**
 * Create a job in Workiz from an accepted quote
 * STUB: Returns mock data - replace with real API calls when ready
 */
export async function createWorkizJob(
  input: WorkizJobInput,
  apiKey: string | undefined,
  enabled: boolean
): Promise<WorkizJobResult> {
  // Check if Workiz is enabled
  if (!enabled) {
    return {
      success: false,
      error: 'Workiz integration is not enabled',
    };
  }

  // Check for API key
  if (!apiKey) {
    return {
      success: false,
      error: 'Workiz API key is not configured',
    };
  }

  // STUB: In production, this would make a real API call
  console.log('[WORKIZ STUB] Creating job for quote:', input.quote.quoteNumber);
  console.log('[WORKIZ STUB] Customer:', `${input.customer.firstName} ${input.customer.lastName}`);
  console.log('[WORKIZ STUB] Total:', input.quote.total);
  console.log('[WORKIZ STUB] Line items:', input.lineItems.length);

  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate mock job ID
  const mockJobId = `WKZ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return {
    success: true,
    jobId: mockJobId,
    jobUrl: `https://app.workiz.com/jobs/${mockJobId}`,
  };
}

export function isWorkizConfigured(apiKey: string | undefined, enabled: boolean): boolean {
  return enabled && !!apiKey;
}
