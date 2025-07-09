import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/lib/trpc/root";
import { getUrl, transformer } from "./shared";

export const api = createTRPCReact<AppRouter>();

export const vanillaTrpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    httpBatchLink({
      url: getUrl(),
      transformer,
    }),
  ],
});
