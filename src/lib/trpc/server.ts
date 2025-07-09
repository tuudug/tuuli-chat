import { transformer } from "@/lib/trpc/shared";
import { initTRPC } from "@trpc/server";
import { createTRPCContext } from "./context";

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer,
    errorFormatter({ shape }) {
      return shape;
    },
  });

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error("NOT_AUTHENTICATED");
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
