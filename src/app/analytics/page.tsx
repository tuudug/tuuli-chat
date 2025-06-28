"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import * as Tabs from "@radix-ui/react-tabs";
import { ReloadIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { DATE_RANGE_OPTIONS, DateRangeValue } from "@/lib/constants";
import { createBrowserClient } from "@supabase/ssr"; // Updated import
import type { Database } from "@/types/supabase";

interface AnalyticsData {
  // Original data
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalOverallTokens: number;
  modelUsageData: { name: string; value: number }[];
  priceByModelData: { name: string; value: number }[];
  priceByUserData: { name: string; value: number }[];
  dateRange: string;
  startDate: string;
  fetchedMessagesCount: number;

  // Enhanced data
  totalCost: number;
  totalSparksCost: number;
  activeUsersCount: number;
  avgCostPerMessage: number;
  avgTokensPerMessage: number;
  avgCostPerToken: number;
  dailyCostTrend: {
    date: string;
    cost: number;
    messages: number;
    tokens: number;
    activeUsers: number;
  }[];
  hourlyCostTrend: { hour: string; cost: number; messages: number }[];
  modelEfficiencyData: {
    name: string;
    costPerToken: number;
    costPerMessage: number;
    avgTokensPerMessage: number;
    totalCost: number;
  }[];
  dailySparksData: { date: string; sparks: number }[];
  userAnalyticsData: {
    userId: string;
    totalCost: number;
    messageCount: number;
    avgCostPerMessage: number;
    totalTokens: number;
    avgTokensPerMessage: number;
    mostUsedModel: string;
    daysSinceFirst: number;
    avgMessagesPerDay: number;
    sparksCost: number;
    firstMessageDate: string;
    lastMessageDate: string;
  }[];
}

// Dark mode appropriate colors for Recharts
const DARK_MODE_CHART_COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#6EE7B7", // emerald-300
];

const AnalyticsPage = () => {
  const [selectedDateRange, setSelectedDateRange] =
    useState<DateRangeValue>("24h");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [checkingAdminStatus, setCheckingAdminStatus] = useState(true);

  // Updated Supabase client creation for client components
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkAdminStatus = async () => {
      setCheckingAdminStatus(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setIsUserAdmin(false);
        setCheckingAdminStatus(false);
        setError("Not authenticated. Please log in.");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_verified")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        setIsUserAdmin(false);
        setError("Could not verify admin status.");
      } else {
        setIsUserAdmin(profile.is_verified);
        if (!profile.is_verified) {
          setError("Access Denied. This page is for administrators only.");
        }
      }
      setCheckingAdminStatus(false);
    };
    checkAdminStatus();
  }, [supabase]);

  const fetchAnalyticsData = useCallback(
    async (range: DateRangeValue) => {
      if (!isUserAdmin) return; // Don't fetch if not admin

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/analytics?dateRange=${range}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }
        const data: AnalyticsData = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch analytics data."
        );
        setAnalyticsData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [isUserAdmin]
  );

  useEffect(() => {
    if (isUserAdmin && !checkingAdminStatus) {
      fetchAnalyticsData(selectedDateRange);
    }
  }, [selectedDateRange, isUserAdmin, checkingAdminStatus, fetchAnalyticsData]);

  const handleRefresh = () => {
    if (isUserAdmin) {
      fetchAnalyticsData(selectedDateRange);
    }
  };

  const renderPieChart = (
    data: { name: string; value: number }[],
    title: string,
    dataKey = "value",
    nameKey = "name"
  ) => (
    <div className="mb-8 p-6 border border-gray-700 rounded-lg shadow-md bg-gray-800">
      <h2 className="text-xl font-semibold mb-6 text-gray-200">{title}</h2>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8" // Default fill, overridden by Cell
              dataKey={dataKey}
              nameKey={nameKey}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    DARK_MODE_CHART_COLORS[
                      index % DARK_MODE_CHART_COLORS.length
                    ]
                  }
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#2D3748",
                borderColor: "#4A5568",
              }} // gray-800, gray-600
              itemStyle={{ color: "#E2E8F0" }} // gray-200
              formatter={(value: number, name: string, props) => {
                if (title.toLowerCase().includes("price")) {
                  return [`$${value.toFixed(4)}`, props.payload.name];
                }
                return [value, props.payload.name];
              }}
            />
            <Legend wrapperStyle={{ color: "#A0AEC0" }} /> {/* gray-400 */}
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400">No data available for this period.</p>
      )}
    </div>
  );

  if (checkingAdminStatus) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-300">
        <ReloadIcon className="mr-2 h-8 w-8 animate-spin text-blue-400" />
        <p className="text-xl">Verifying admin status...</p>
      </div>
    );
  }

  if (!isUserAdmin && error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-900 text-red-200 p-6">
        <ExclamationTriangleIcon className="h-12 w-12 mb-4 text-red-400" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-center">{error}</p>
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-300">
        <p className="text-xl">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-900 text-gray-200 min-h-screen">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-100">
          Application Analytics
        </h1>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-md hover:bg-gray-700 transition-colors"
          aria-label="Refresh data"
        >
          <ReloadIcon
            className={`h-5 w-5 text-gray-300 ${
              isLoading ? "animate-spin" : ""
            }`}
          />
        </button>
      </header>

      <Tabs.Root
        value={selectedDateRange}
        onValueChange={(value) => setSelectedDateRange(value as DateRangeValue)}
        className="mb-8"
      >
        <Tabs.List
          className="flex border-b border-gray-700"
          aria-label="Select date range"
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <Tabs.Trigger
              key={opt.value}
              value={opt.value}
              className="px-4 py-3 -mb-px text-sm font-medium text-gray-400 hover:text-blue-400 data-[state=active]:text-blue-400 data-[state=active]:border-blue-400 data-[state=active]:border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-colors"
            >
              {opt.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      {isLoading && !analyticsData && (
        <div className="flex items-center justify-center py-10">
          <ReloadIcon className="mr-2 h-6 w-6 animate-spin text-blue-400" />
          <p className="text-lg text-gray-400">Loading analytics data...</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 border border-red-700 bg-red-900 text-red-300 rounded-md flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0 text-red-400" />
          <p>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {analyticsData && !isLoading && !error && (
        <div>
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">Total Cost</h3>
              <p className="text-3xl font-semibold text-green-400">
                ${analyticsData.totalCost.toFixed(4)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.totalSparksCost.toLocaleString()} sparks
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Avg Cost/Message
              </h3>
              <p className="text-3xl font-semibold text-blue-400">
                ${analyticsData.avgCostPerMessage.toFixed(6)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.avgTokensPerMessage} tokens/msg
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Active Users
              </h3>
              <p className="text-3xl font-semibold text-purple-400">
                {analyticsData.activeUsersCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.fetchedMessagesCount} messages
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Cost Efficiency
              </h3>
              <p className="text-3xl font-semibold text-yellow-400">
                ${(analyticsData.avgCostPerToken * 1000).toFixed(6)}
              </p>
              <p className="text-xs text-gray-500 mt-1">per 1K tokens</p>
            </div>
          </div>

          {/* Cost Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="p-6 border border-gray-700 rounded-lg shadow-md bg-gray-800">
              <h2 className="text-xl font-semibold mb-6 text-gray-200">
                Daily Cost Trend
              </h2>
              {analyticsData.dailyCostTrend &&
              analyticsData.dailyCostTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analyticsData.dailyCostTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#A0AEC0", fontSize: 12 }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      yAxisId="cost"
                      orientation="left"
                      tick={{ fill: "#A0AEC0", fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="messages"
                      orientation="right"
                      tick={{ fill: "#A0AEC0", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#2D3748",
                        borderColor: "#4A5568",
                        color: "#E2E8F0",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "cost")
                          return [`$${value.toFixed(6)}`, "Cost"];
                        if (name === "messages") return [value, "Messages"];
                        if (name === "activeUsers")
                          return [value, "Active Users"];
                        return [value, name];
                      }}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString()
                      }
                    />
                    <Area
                      yAxisId="cost"
                      type="monotone"
                      dataKey="cost"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                    <Bar
                      yAxisId="messages"
                      dataKey="messages"
                      fill="#10B981"
                      fillOpacity={0.7}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400">
                  No trend data available for this period.
                </p>
              )}
            </div>

            <div className="p-6 border border-gray-700 rounded-lg shadow-md bg-gray-800">
              <h2 className="text-xl font-semibold mb-6 text-gray-200">
                Hourly Usage Pattern
              </h2>
              {analyticsData.hourlyCostTrend &&
              analyticsData.hourlyCostTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.hourlyCostTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: "#A0AEC0", fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: "#A0AEC0", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#2D3748",
                        borderColor: "#4A5568",
                        color: "#E2E8F0",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "cost")
                          return [`$${value.toFixed(6)}`, "Cost"];
                        return [value, "Messages"];
                      }}
                    />
                    <Bar dataKey="cost" fill="#F59E0B" name="cost" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400">
                  No hourly data available for this period.
                </p>
              )}
            </div>
          </div>

          {/* Model Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="p-6 border border-gray-700 rounded-lg shadow-md bg-gray-800">
              <h2 className="text-xl font-semibold mb-6 text-gray-200">
                Model Efficiency Analysis
              </h2>
              {analyticsData.modelEfficiencyData &&
              analyticsData.modelEfficiencyData.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.modelEfficiencyData.map((model) => (
                    <div
                      key={model.name}
                      className="p-4 bg-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-gray-200">
                          {model.name}
                        </h3>
                        <span className="text-sm font-semibold text-green-400">
                          ${model.totalCost.toFixed(4)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Cost/Token:</span>
                          <p className="text-blue-300">
                            ${(model.costPerToken * 1000).toFixed(6)}/1K
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Cost/Message:</span>
                          <p className="text-yellow-300">
                            ${model.costPerMessage.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Avg Tokens:</span>
                          <p className="text-purple-300">
                            {model.avgTokensPerMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">
                  No model efficiency data available.
                </p>
              )}
            </div>

            {renderPieChart(
              analyticsData.modelUsageData,
              "Model Usage Distribution"
            )}
          </div>

          {/* User Analytics Table */}
          {analyticsData.userAnalyticsData &&
            analyticsData.userAnalyticsData.length > 0 && (
              <div className="mb-8 p-6 border border-gray-700 rounded-lg shadow-md bg-gray-800">
                <h2 className="text-xl font-semibold mb-6 text-gray-200">
                  User Analytics
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          User ID
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Total Cost
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Messages
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Avg Cost/Msg
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Total Tokens
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Avg Tokens/Msg
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Most Used Model
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Activity
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Sparks Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.userAnalyticsData
                        .slice(0, 20)
                        .map((user, index) => (
                          <tr
                            key={user.userId}
                            className={
                              index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"
                            }
                          >
                            <td className="px-4 py-3 font-medium text-gray-200">
                              {user.userId}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-green-400 font-semibold">
                                ${user.totalCost.toFixed(4)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {user.messageCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              ${user.avgCostPerMessage.toFixed(6)}
                            </td>
                            <td className="px-4 py-3">
                              {user.totalTokens.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              {user.avgTokensPerMessage}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-medium bg-blue-900 text-blue-300 rounded">
                                {user.mostUsedModel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs">
                                <div className="text-purple-300">
                                  {user.avgMessagesPerDay}/day
                                </div>
                                <div className="text-gray-500">
                                  {user.daysSinceFirst} days
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-violet-400">
                                {user.sparksCost.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {analyticsData.userAnalyticsData.length > 20 && (
                    <p className="mt-4 text-sm text-gray-500">
                      Showing top 20 users out of{" "}
                      {analyticsData.userAnalyticsData.length} total users
                    </p>
                  )}
                </div>
              </div>
            )}

          {/* Cost Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {renderPieChart(
              analyticsData.priceByModelData,
              "Cost Breakdown by Model"
            )}
            {renderPieChart(analyticsData.priceByUserData, "Top Users by Cost")}
          </div>

          {/* Sparks Analysis */}
          {analyticsData.dailySparksData &&
            analyticsData.dailySparksData.length > 0 && (
              <div className="mb-8 p-6 border border-gray-700 rounded-lg shadow-md bg-gray-800">
                <h2 className="text-xl font-semibold mb-6 text-gray-200">
                  Daily Sparks Usage
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.dailySparksData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#A0AEC0", fontSize: 12 }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis tick={{ fill: "#A0AEC0", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#2D3748",
                        borderColor: "#4A5568",
                        color: "#E2E8F0",
                      }}
                      formatter={(value: number) => [
                        value.toLocaleString(),
                        "Sparks Spent",
                      ]}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString()
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="sparks"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

          {/* Token Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Total Prompt Tokens
              </h3>
              <p className="text-3xl font-semibold text-gray-100">
                {analyticsData.totalPromptTokens.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(
                  (analyticsData.totalPromptTokens /
                    analyticsData.totalOverallTokens) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Total Completion Tokens
              </h3>
              <p className="text-3xl font-semibold text-gray-100">
                {analyticsData.totalCompletionTokens.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(
                  (analyticsData.totalCompletionTokens /
                    analyticsData.totalOverallTokens) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Total Overall Tokens
              </h3>
              <p className="text-3xl font-semibold text-gray-100">
                {analyticsData.totalOverallTokens.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(analyticsData.totalOverallTokens / 1_000_000).toFixed(2)}M
                tokens
              </p>
            </div>
          </div>

          <footer className="mt-10 text-xs text-gray-500 space-y-1">
            <p>
              Data for range: {analyticsData.dateRange} (Starting from:{" "}
              {new Date(analyticsData.startDate).toLocaleDateString()})
            </p>
            <p>
              Total assistant messages processed:{" "}
              {analyticsData.fetchedMessagesCount.toLocaleString()}
            </p>
            <p>
              Average cost per 1K tokens: $
              {(analyticsData.avgCostPerToken * 1000).toFixed(6)} | Average
              tokens per message: {analyticsData.avgTokensPerMessage}
            </p>
          </footer>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
