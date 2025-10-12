import { createCallerFactory, createTRPCRouter } from "@/lib/trpc/server";
import { chatRouter } from "./routers/chat";
import { analyticsRouter } from "./routers/analytics";
import { searchRouter } from "./routers/search";
import { attachmentRouter } from "./routers/attachment";
import { userRouter } from "./routers/user";
import { imageRouter } from "./routers/image";
import { transcribeRouter } from "./routers/transcribe";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  chat: chatRouter,
  analytics: analyticsRouter,
  search: searchRouter,
  attachment: attachmentRouter,
  user: userRouter,
  image: imageRouter,
  transcribe: transcribeRouter,
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
