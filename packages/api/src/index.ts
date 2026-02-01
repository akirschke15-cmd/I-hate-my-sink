import { router, createContext } from './trpc';
import {
  authRouter,
  userRouter,
  companyRouter,
  customerRouter,
  measurementRouter,
  sinkRouter,
  quotesRouter,
} from './routers';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  company: companyRouter,
  customer: customerRouter,
  measurement: measurementRouter,
  sink: sinkRouter,
  quote: quotesRouter,
});

export type AppRouter = typeof appRouter;

export { createContext };
