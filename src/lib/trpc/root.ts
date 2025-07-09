import { createCallerFactory, createTRPCRouter } from "@/lib/trpc/server";
import { sparksRouter } from "./routers/sparks";
import { chatRouter } from "./routers/chat";
import { analyticsRouter } from "./routers/analytics";
import { pinRouter } from "./routers/pin";
import { searchRouter } from "./routers/search";
import { attachmentRouter } from "./routers/attachment";
import { expRouter } from "./routers/exp";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  sparks: sparksRouter,
  chat: chatRouter,
  analytics: analyticsRouter,
  pin: pinRouter,
  search: searchRouter,
  attachment: attachmentRouter,
  exp: expRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const api = createCaller(createContext);
 * const res = await api.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
