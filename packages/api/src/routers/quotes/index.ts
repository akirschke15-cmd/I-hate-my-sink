import { router } from '../../trpc';
import { quotesCrudRouter } from './crud';
import { quotesLineItemsRouter } from './line-items';
import { quotesEmailRouter } from './email';
import { quotesIntegrationsRouter } from './integrations';
import { quotesAnalyticsRouter } from './analytics';

export const quotesRouter = router({
  ...quotesCrudRouter._def.procedures,
  ...quotesLineItemsRouter._def.procedures,
  ...quotesEmailRouter._def.procedures,
  ...quotesIntegrationsRouter._def.procedures,
  ...quotesAnalyticsRouter._def.procedures,
});
