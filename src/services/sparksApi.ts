import { SparkBalance } from "@/types";

export const fetchSparkBalance = async (): Promise<SparkBalance> => {
  const response = await fetch("/api/sparks/balance");
  if (!response.ok) {
    throw new Error("Failed to fetch spark balance");
  }
  return await response.json();
};

export const claimDailySparks = async (): Promise<{
  success: boolean;
  new_balance: number;
}> => {
  const response = await fetch("/api/sparks/claim", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to claim daily sparks");
  }
  return await response.json();
};
