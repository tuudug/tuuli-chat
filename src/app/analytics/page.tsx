"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as Tabs from "@radix-ui/react-tabs";
import { ReloadIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { DATE_RANGE_OPTIONS, DateRangeValue } from "@/lib/constants";
import { createBrowserClient } from "@supabase/ssr"; // Updated import
import type { Database } from "@/types/supabase";

interface AnalyticsData {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalOverallTokens: number;
  modelUsageData: { name: string; value: number }[];
  priceByModelData: { name: string; value: number }[];
  priceByUserData: { name: string; value: number }[];
  dateRange: string;
  startDate: string;
  fetchedMessagesCount: number;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Total Prompt Tokens
              </h3>
              <p className="text-3xl font-semibold text-gray-100">
                {analyticsData.totalPromptTokens.toLocaleString()}
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Total Completion Tokens
              </h3>
              <p className="text-3xl font-semibold text-gray-100">
                {analyticsData.totalCompletionTokens.toLocaleString()}
              </p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400">
                Total Overall Tokens
              </h3>
              <p className="text-3xl font-semibold text-gray-100">
                {analyticsData.totalOverallTokens.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPieChart(
              analyticsData.modelUsageData,
              "Model Usage Distribution"
            )}
            {renderPieChart(
              analyticsData.priceByModelData,
              "Price Breakdown by Model"
            )}
          </div>
          <div className="mt-6">
            {renderPieChart(
              analyticsData.priceByUserData,
              "Price Breakdown by User (UUIDs)"
            )}
          </div>

          <footer className="mt-10 text-xs text-gray-500">
            <p>
              Data for range: {analyticsData.dateRange} (Starting from:{" "}
              {new Date(analyticsData.startDate).toLocaleDateString()})
            </p>
            <p>
              Total assistant messages processed:{" "}
              {analyticsData.fetchedMessagesCount.toLocaleString()}
            </p>
          </footer>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
