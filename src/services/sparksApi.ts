import { api } from "@/lib/trpc/client";

export const fetchSparkBalance = () => {
  return api.sparks.getBalance.useQuery();
};

export const claimDailySparks = () => {
  return api.sparks.claimDaily.useMutation();
};
