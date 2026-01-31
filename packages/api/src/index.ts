import { router, createContext } from './trpc';
import {
  authRouter,
  userRouter,
  companyRouter,
  customerRouter,
  measurementRouter,
} from './routers';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  company: companyRouter,
  customer: customerRouter,
  measurement: measurementRouter,
});

export type AppRouter = typeof appRouter;

export { createContext };
