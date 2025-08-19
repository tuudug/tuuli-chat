import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { MODEL_PRICES, DATE_RANGE_OPTIONS } from "@/lib/constants";
import type { DateRangeValue } from "@/lib/constants";
import type { GeminiModelId } from "@/types";

export const analyticsRouter = createTRPCRouter({
  getData: protectedProcedure
    .input(
      z.object({
        dateRange: z.custom<DateRangeValue>(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const { dateRange } = input;

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated.",
        });
      }

      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("tier")
        .eq("id", user.id)
        .single();

      if (profileError || !userProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Could not retrieve user profile.",
        });
      }

      if (userProfile.tier !== "premium") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Premium access required.",
        });
      }

      if (
        !dateRange ||
        !DATE_RANGE_OPTIONS.some((opt) => opt.value === dateRange)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or missing dateRange parameter.",
        });
      }

      const serviceSupabase = createSupabaseServiceRoleClient();

      const initialDate = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "24h":
          startDate = new Date(initialDate.setDate(initialDate.getDate() - 1));
          break;
        case "7d":
          startDate = new Date(initialDate.setDate(initialDate.getDate() - 7));
          break;
        case "30d":
          startDate = new Date(initialDate.setDate(initialDate.getDate() - 30));
          break;
        default:
          startDate = new Date(initialDate.setDate(initialDate.getDate() - 1));
      }
      startDate.setUTCHours(0, 0, 0, 0);

      const { data: messages, error: messagesError } = await serviceSupabase
        .from("messages")
        .select(
          "model_used, prompt_tokens, completion_tokens, user_id, created_at, sparks_cost"
        )
        .eq("role", "assistant")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (messagesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch messages for analytics.",
        });
      }

      const { data: userStats, error: userStatsError } = await serviceSupabase
        .from("messages")
        .select("user_id, created_at")
        .gte("created_at", startDate.toISOString());

      if (userStatsError) {
        console.error("Error fetching user stats:", userStatsError);
      }

      const { data: sparksTransactions, error: sparksError } =
        await serviceSupabase
          .from("sparks_transactions")
          .select("amount, created_at, user_id, transaction_type, model_used")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true });

      if (sparksError) {
        console.error("Error fetching sparks transactions:", sparksError);
      }

      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalCost = 0;
      let totalSparksCost = 0;
      const modelUsage: Record<string, number> = {};
      const priceByModel: Record<string, number> = {};
      const priceByUser: Record<string, number> = {};
      const dailyStats: Record<
        string,
        { cost: number; messages: number; tokens: number; users: Set<string> }
      > = {};
      const hourlyStats: Record<string, { cost: number; messages: number }> =
        {};
      const modelEfficiency: Record<
        string,
        { totalCost: number; totalTokens: number; messageCount: number }
      > = {};
      const userAnalytics: Record<
        string,
        {
          totalCost: number;
          messageCount: number;
          totalTokens: number;
          modelUsage: Record<string, number>;
          firstMessage: Date;
          lastMessage: Date;
          sparksCost: number;
        }
      > = {};

      for (const message of messages) {
        const messageDate = new Date(message.created_at);
        const dayKey = messageDate.toISOString().split("T")[0];
        const hourKey = messageDate.getUTCHours().toString();

        if (message.prompt_tokens) totalPromptTokens += message.prompt_tokens;
        if (message.completion_tokens)
          totalCompletionTokens += message.completion_tokens;
        if (message.sparks_cost) totalSparksCost += message.sparks_cost;

        const modelId = message.model_used as GeminiModelId | null;
        if (modelId && MODEL_PRICES[modelId]) {
          modelUsage[modelId] = (modelUsage[modelId] || 0) + 1;

          const promptTokens = message.prompt_tokens || 0;
          const completionTokens = message.completion_tokens || 0;
          const totalMessageTokens = promptTokens + completionTokens;
          const modelPrices = MODEL_PRICES[modelId];

          const cost =
            promptTokens * modelPrices.input +
            completionTokens * modelPrices.output;
          totalCost += cost;

          priceByModel[modelId] = (priceByModel[modelId] || 0) + cost;
          if (message.user_id) {
            priceByUser[message.user_id] =
              (priceByUser[message.user_id] || 0) + cost;

            if (!userAnalytics[message.user_id]) {
              userAnalytics[message.user_id] = {
                totalCost: 0,
                messageCount: 0,
                totalTokens: 0,
                modelUsage: {},
                firstMessage: messageDate,
                lastMessage: messageDate,
                sparksCost: 0,
              };
            }

            const userStats = userAnalytics[message.user_id];
            userStats.totalCost += cost;
            userStats.messageCount += 1;
            userStats.totalTokens += totalMessageTokens;
            userStats.modelUsage[modelId] =
              (userStats.modelUsage[modelId] || 0) + 1;
            userStats.sparksCost += message.sparks_cost || 0;

            if (messageDate < userStats.firstMessage) {
              userStats.firstMessage = messageDate;
            }
            if (messageDate > userStats.lastMessage) {
              userStats.lastMessage = messageDate;
            }
          }

          if (!dailyStats[dayKey]) {
            dailyStats[dayKey] = {
              cost: 0,
              messages: 0,
              tokens: 0,
              users: new Set(),
            };
          }
          dailyStats[dayKey].cost += cost;
          dailyStats[dayKey].messages += 1;
          dailyStats[dayKey].tokens += totalMessageTokens;
          if (message.user_id) dailyStats[dayKey].users.add(message.user_id);

          if (!hourlyStats[hourKey]) {
            hourlyStats[hourKey] = { cost: 0, messages: 0 };
          }
          hourlyStats[hourKey].cost += cost;
          hourlyStats[hourKey].messages += 1;

          if (!modelEfficiency[modelId]) {
            modelEfficiency[modelId] = {
              totalCost: 0,
              totalTokens: 0,
              messageCount: 0,
            };
          }
          modelEfficiency[modelId].totalCost += cost;
          modelEfficiency[modelId].totalTokens += totalMessageTokens;
          modelEfficiency[modelId].messageCount += 1;
        } else if (modelId) {
          modelUsage[modelId] = (modelUsage[modelId] || 0) + 1;
        }
      }

      const totalOverallTokens = totalPromptTokens + totalCompletionTokens;

      const uniqueUsers = new Set(userStats?.map((m) => m.user_id) || []);
      const activeUsersCount = uniqueUsers.size;

      const dailySparksSpending: Record<string, number> = {};
      if (sparksTransactions) {
        for (const transaction of sparksTransactions) {
          if (
            transaction.transaction_type === "spend" &&
            transaction.amount < 0
          ) {
            const dayKey = new Date(transaction.created_at || "")
              .toISOString()
              .split("T")[0];
            dailySparksSpending[dayKey] =
              (dailySparksSpending[dayKey] || 0) + Math.abs(transaction.amount);
          }
        }
      }

      const modelUsageData = Object.entries(modelUsage).map(
        ([name, value]) => ({
          name,
          value,
        })
      );

      const priceByModelData = Object.entries(priceByModel).map(
        ([name, value]) => ({
          name,
          value: parseFloat(value.toFixed(6)),
        })
      );

      const priceByUserData = Object.entries(priceByUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({
          name: name.substring(0, 8) + "...",
          value: parseFloat(value.toFixed(6)),
        }));

      const dailyCostTrend = Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date,
          cost: parseFloat(stats.cost.toFixed(6)),
          messages: stats.messages,
          tokens: stats.tokens,
          activeUsers: stats.users.size,
        }));

      const hourlyCostTrend = Array.from({ length: 24 }, (_, hour) => ({
        hour: hour.toString().padStart(2, "0") + ":00",
        cost: parseFloat((hourlyStats[hour]?.cost || 0).toFixed(6)),
        messages: hourlyStats[hour]?.messages || 0,
      }));

      const modelEfficiencyData = Object.entries(modelEfficiency).map(
        ([name, stats]) => ({
          name,
          costPerToken: parseFloat(
            (stats.totalCost / stats.totalTokens).toFixed(8)
          ),
          costPerMessage: parseFloat(
            (stats.totalCost / stats.messageCount).toFixed(6)
          ),
          avgTokensPerMessage: Math.round(
            stats.totalTokens / stats.messageCount
          ),
          totalCost: parseFloat(stats.totalCost.toFixed(6)),
        })
      );

      const dailySparksData = Object.entries(dailySparksSpending)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amount]) => ({
          date,
          sparks: amount,
        }));

      const userAnalyticsData = Object.entries(userAnalytics)
        .sort(([, a], [, b]) => b.totalCost - a.totalCost)
        .map(([userId, stats]) => {
          const daysSinceFirst = Math.max(
            1,
            Math.ceil(
              (stats.lastMessage.getTime() - stats.firstMessage.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          const mostUsedModel =
            Object.entries(stats.modelUsage).sort(
              ([, a], [, b]) => b - a
            )[0]?.[0] || "N/A";

          return {
            userId: userId.substring(0, 8) + "...",
            totalCost: parseFloat(stats.totalCost.toFixed(6)),
            messageCount: stats.messageCount,
            avgCostPerMessage: parseFloat(
              (stats.totalCost / stats.messageCount).toFixed(6)
            ),
            totalTokens: stats.totalTokens,
            avgTokensPerMessage: Math.round(
              stats.totalTokens / stats.messageCount
            ),
            mostUsedModel,
            daysSinceFirst,
            avgMessagesPerDay: parseFloat(
              (stats.messageCount / daysSinceFirst).toFixed(2)
            ),
            sparksCost: stats.sparksCost,
            firstMessageDate: stats.firstMessage.toISOString().split("T")[0],
            lastMessageDate: stats.lastMessage.toISOString().split("T")[0],
          };
        });

      return {
        totalPromptTokens,
        totalCompletionTokens,
        totalOverallTokens,
        modelUsageData,
        priceByModelData,
        priceByUserData,
        dateRange,
        startDate: startDate.toISOString(),
        fetchedMessagesCount: messages.length,
        totalCost: parseFloat(totalCost.toFixed(6)),
        totalSparksCost,
        activeUsersCount,
        avgCostPerMessage:
          messages.length > 0
            ? parseFloat((totalCost / messages.length).toFixed(6))
            : 0,
        avgTokensPerMessage:
          messages.length > 0
            ? Math.round(totalOverallTokens / messages.length)
            : 0,
        avgCostPerToken:
          totalOverallTokens > 0
            ? parseFloat((totalCost / totalOverallTokens).toFixed(8))
            : 0,
        dailyCostTrend,
        hourlyCostTrend,
        modelEfficiencyData,
        dailySparksData,
        userAnalyticsData,
      };
    }),
});
