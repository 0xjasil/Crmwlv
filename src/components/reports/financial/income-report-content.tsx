"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconTrendingUp,
  IconDownload,
  IconRefresh,
  IconFilter,
  IconSearch,
  IconMinus,
  IconCash,
  IconCalendar,
  IconChartLine,
  IconCoins,
  IconArrowUp,
  IconArrowDown,
  IconFileText,
} from "@tabler/icons-react";
import { getIncomeReport } from "@/server/actions/report-actions";
import { IncomeReport, DateRangeFilter } from "@/types/reports";
import { formatCurrency } from "@/lib/utils";
import { FinancialReportSkeleton } from "./financial-report-skeleton";

type IncomeCSVRow = [
  invoiceNumber: string,
  clientName: string,
  category: string,
  amount: number,
  itemCount: number,
  date: string,
  sourceCategory: string,
  sourceCategoryAmount: number | "",
  sourceCategoryTransactions: number | "",
  sourcePercent: number | "",
  month: string,
  monthlyRevenue: number | "",
  monthlyGrowth: number | ""
];

export function IncomeReportContent() {
  const [reportData, setReportData] = useState<IncomeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter | undefined>();
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [tempDateRange, setTempDateRange] = useState<
    DateRangeFilter | undefined
  >();

  const [sortBy, setSortBy] = useState<"amount" | "growth" | "source">(
    "amount"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        dateRange,
        search: searchTerm || undefined,
      };

      const result = await getIncomeReport(filters);

      if (result?.data) {
        setReportData(result.data);
      } else {
        setError("Failed to load income report data");
      }
    } catch (err) {
      setError("An error occurred while loading the report");
      console.error("Error fetching income report:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, searchTerm]);

  const handleExportCSV = () => {
    if (!reportData) return;

    const headers = [
      "Invoice Number",
      "Client Name",
      "Category",
      "Amount",
      "Item Count",
      "Date",
      "Source Category",
      "Source Category Total Amount",
      "Source Category Transactions",
      "Source % of Total",
      "Month",
      "Monthly Revenue",
      "Monthly Growth",
    ];

    const rows: IncomeCSVRow[] = [];

    reportData.detailedTransactions?.forEach((t) => {
      const categoryInfo = reportData.sources.find(
        (s) => s.source === t.category
      );
      const monthKey = new Date(t.date).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      const monthInfo = reportData.monthlyRevenue.find(
        (m) => m.month === monthKey
      );

      rows.push([
        t.invoiceNumber,
        t.clientName,
        t.category,
        t.amount,
        t.itemCount,
        new Date(t.date).toLocaleDateString(),
        categoryInfo?.source ?? "",
        categoryInfo?.amount ?? "",
        categoryInfo?.transactionCount ?? "",
        categoryInfo?.percentage ?? "",
        monthInfo?.month ?? "",
        monthInfo?.amount ?? "",
        monthInfo?.growth ?? "",
      ]);
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income-full-table-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchReportData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!searchTerm) return;
    const timeout = setTimeout(() => {
      fetchReportData();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Get unique sources and payment methods for filtering
  const sources = reportData?.sources.map((s) => s.source) || [];
  const uniqueSources = Array.from(new Set(sources));

  // Filter and sort sources
  const filteredAndSortedSources = reportData?.sources
    .filter((source) => {
      if (selectedSource !== "all" && source.source !== selectedSource)
        return false;
      return true;
    })
    .sort((a, b) => {
      let valueA: number | string, valueB: number | string;

      switch (sortBy) {
        case "amount":
          valueA = a.amount;
          valueB = b.amount;
          break;
        case "source":
          valueA = a.source.toLowerCase();
          valueB = b.source.toLowerCase();
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        default:
          valueA = a.amount;
          valueB = b.amount;
      }

      return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
    });

  if (loading) {
    return <FinancialReportSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <IconTrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2 text-destructive">
              Error Loading Report
            </h3>
            <p className="text-sm mb-4">{error}</p>
            <Button onClick={fetchReportData} variant="outline" size="sm">
              <IconRefresh className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <IconTrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">
              No income data found for the selected period.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (growth: number) => {
    if (growth > 0) return <IconArrowUp className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <IconArrowDown className="h-4 w-4 text-red-600" />;
    return <IconMinus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Income Analysis Report
          </h1>
          <p className="text-muted-foreground">
            Revenue tracking from invoices and other sources (excluding course
            fees)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchReportData} variant="outline" size="sm">
            <IconRefresh className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportCSV} size="sm">
            <IconDownload className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFilter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
          <CardDescription>
            Filter and customize your income analysis report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 w-full sm:w-[240px]">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search income sources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2 w-full sm:w-auto flex-1 min-w-[300px]">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <DatePickerWithRange
                  value={tempDateRange}
                  onChange={setTempDateRange}
                  className="flex-1"
                />
                <Button
                  variant="default"
                  onClick={() => {
                    setDateRange(tempDateRange);
                    fetchReportData();
                  }}
                  className="shrink-0"
                >
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-2 w-full sm:w-[200px]">
              <label className="text-sm font-medium">Service Category</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full sm:w-[160px]">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={sortBy}
                onValueChange={(value: "amount" | "growth" | "source") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="source">Source</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full sm:w-[120px]">
              <label className="text-sm font-medium">Order</label>
              <Select
                value={sortOrder}
                onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">High to Low</SelectItem>
                  <SelectItem value="asc">Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Income</CardDescription>
            <IconCash className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">All revenue streams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Service Categories</CardDescription>
            <IconCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.sources.length}
            </div>
            <p className="text-xs text-muted-foreground">Business categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <IconFileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.detailedTransactions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Monthly Revenue</CardDescription>
            <IconChartLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.monthlyRevenue.length}
            </div>
            <p className="text-xs text-muted-foreground">Tracked periods</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sources" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sources">Service Categories</TabsTrigger>
          <TabsTrigger value="growth">Revenue Growth</TabsTrigger>
          <TabsTrigger value="detailed-view">Transaction Details</TabsTrigger>
        </TabsList>

        {/* Service Categories Tab */}
        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Service Categories</CardTitle>
              <CardDescription>
                Revenue breakdown by service types and business categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAndSortedSources?.map((source, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <IconCoins className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold">
                            {source.source}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {source.transactionCount} invoice
                            {source.transactionCount !== 1 ? "s" : ""} •
                            Business service
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(source.amount)}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {source.percentage}% of total revenue
                        </Badge>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${source.percentage}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div className="text-lg font-bold text-emerald-600">
                          {formatCurrency(source.amount)}
                        </div>
                        <p className="text-sm text-emerald-700">
                          Total Revenue
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(
                            source.amount / source.transactionCount
                          )}
                        </div>
                        <p className="text-sm text-blue-700">Avg per Invoice</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="text-lg font-bold text-purple-600">
                          {source.transactionCount}
                        </div>
                        <p className="text-sm text-purple-700">
                          Total Invoices
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Growth Tab */}
        <TabsContent value="growth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Invoice Revenue Growth</CardTitle>
              <CardDescription>
                Month-over-month invoice revenue trends and business growth
                analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.monthlyRevenue.length > 0 ? (
                <div className="space-y-4">
                  {reportData.monthlyRevenue.map((month, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <IconCalendar className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold">
                              {month.month}
                            </h4>
                            <div className="flex items-center gap-2 text-sm">
                              {getTrendIcon(month.growth)}
                              <span className={getTrendColor(month.growth)}>
                                {month.growth > 0 ? "+" : ""}
                                {month.growth.toFixed(1)}% growth
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(month.amount)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Monthly revenue
                          </p>
                        </div>
                      </div>

                      {/* Growth indicator */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${month.growth > 0
                              ? "bg-green-600"
                              : month.growth < 0
                                ? "bg-red-600"
                                : "bg-gray-400"
                            }`}
                          style={{
                            width: `${Math.min(
                              Math.abs(month.growth) * 2,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <IconCalendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Growth Data</h3>
                  <p className="text-sm">
                    No monthly revenue data available for the selected period.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Details Tab */}
        <TabsContent value="detailed-view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Transaction Details</CardTitle>
              <CardDescription>
                Complete list of all paid invoices with transaction details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Invoice</th>
                      <th className="text-left p-4 font-semibold">Client</th>
                      <th className="text-left p-4 font-semibold">
                        Service Category
                      </th>
                      <th className="text-center p-4 font-semibold">Amount</th>
                      <th className="text-center p-4 font-semibold">Items</th>
                      <th className="text-center p-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.detailedTransactions?.map(
                      (transaction, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <IconFileText className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {transaction.invoiceNumber}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {transaction.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium">
                              {transaction.clientName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Client
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs">
                              {transaction.category}
                            </Badge>
                          </td>
                          <td className="text-center p-4 font-medium text-emerald-600">
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="text-center p-4 font-medium">
                            {transaction.itemCount}
                          </td>
                          <td className="text-center p-4 text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                {(!reportData.detailedTransactions ||
                  reportData.detailedTransactions.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <IconFileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Transaction Data
                      </h3>
                      <p className="text-sm">
                        No paid invoice transactions found for the selected
                        period.
                      </p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
