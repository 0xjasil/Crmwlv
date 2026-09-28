"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  IconReceipt,
  IconDownload,
  IconRefresh,
  IconFilter,
  IconSearch,
  IconCash,
  IconUser,
  IconCategory,
  IconChartBar,
} from "@tabler/icons-react";
import {
  getExpenseReport,
  exportFinancialReportCSV,
} from "@/server/actions/report-actions";
import { ExpenseReport, DateRangeFilter } from "@/types/reports";
import { formatCurrency } from "@/lib/utils";
import { FinancialReportSkeleton } from "./financial-report-skeleton";

export function ExpenseReportContent() {
  const [reportData, setReportData] = useState<ExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"amount" | "date" | "category">(
    "amount"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const filtersRef = useRef({
    dateRange,
    searchTerm,
    selectedUser,
  });
  const [tempDateRange, setTempDateRange] = useState<
    DateRangeFilter | undefined
  >();

  const fetchReportData = useCallback(async () => {
    filtersRef.current = {
      dateRange,
      searchTerm,
      selectedUser,
    };

    console.log("fetch using filters:", filtersRef.current);

    try {
      setLoading(true);
      setError(null);

      const result = await getExpenseReport(filtersRef.current);

      if (result?.data) {
        setReportData(result.data);
      } else {
        setError("Failed to load expense report data");
      }
    } catch (err) {
      setError("An error occurred while loading the report");
      console.error("Error fetching expense report:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, searchTerm, selectedUser]);

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchReportData();
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleExportCSV = async () => {
    try {
      const filters = {
        dateRange,
        search: searchTerm || undefined,
        userId: selectedUser !== "all" ? selectedUser : undefined,
      };

      const result = await exportFinancialReportCSV({
        reportType: "expense",
        filters,
      });

      if (result?.data) {
        console.log("EXPORT CSV DATA:", result.data);

        const csvContent = [
          result.data.headers.map((h) => `"${h}"`).join(","),
          ...result.data.rows.map((row) =>
            row
              .map((cell) => {
                // strip currency formatting if present
                if (typeof cell === "string" && cell.startsWith("₹")) {
                  return `"${cell.replace(/₹|,/g, "")}"`;
                }
                // otherwise just wrap value
                return `"${cell}"`;
              })
              .join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error exporting CSV:", err);
    }
  };

  // Get unique categories for filtering
  const categories = reportData?.breakdown.map((b) => b.categoryName) || [];
  const uniqueCategories = Array.from(new Set(categories));

  // Filter and sort categories
  const filteredAndSortedCategories = reportData?.breakdown
    .filter((category) => {
      if (
        selectedCategory !== "all" &&
        category.categoryName !== selectedCategory
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      let valueA: number | string, valueB: number | string;

      switch (sortBy) {
        case "amount":
          valueA = a.totalAmount;
          valueB = b.totalAmount;
          break;
        case "category":
          valueA = a.categoryName.toLowerCase();
          valueB = b.categoryName.toLowerCase();
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        default:
          valueA = a.totalAmount;
          valueB = b.totalAmount;
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
            <IconReceipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
            <IconReceipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">
              No expense data found for the selected period.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Expense Analysis Report
          </h1>
          <p className="text-muted-foreground">
            Comprehensive expense tracking and cost optimization insights
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
            Filter and customize your expense analysis report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 w-full sm:w-[240px]">
              <label className="text-sm font-medium">Search Expenses</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search description..."
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
              <label className="text-sm font-medium">Category</label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full sm:w-[200px]">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {reportData.userWiseExpenses.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full sm:w-[160px]">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={sortBy}
                onValueChange={(value: "amount" | "date" | "category") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
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
            <CardDescription>Total Expenses</CardDescription>
            <IconCash className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              All categories combined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Top Category</CardDescription>
            <IconCategory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.topCategory}</div>
            <p className="text-xs text-muted-foreground">
              Highest spending category
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Categories</CardDescription>
            <IconChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.breakdown.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active expense categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Contributors</CardDescription>
            <IconUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.userWiseExpenses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Team members with expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
          <TabsTrigger value="users">User Analysis</TabsTrigger>
          <TabsTrigger value="detailed-view">Detailed View</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>
                Breakdown of expenses by category with spending analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAndSortedCategories?.map((category, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <IconCategory className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold">
                            {category.categoryName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {category.transactionCount} transaction
                            {category.transactionCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(category.totalAmount)}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {category.percentage}% of total
                        </Badge>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>

                    {/* Monthly trend if available */}
                    {category.monthlyTrend &&
                      category.monthlyTrend.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="text-sm font-semibold mb-2">
                            Monthly Trend
                          </h5>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {category.monthlyTrend
                              .slice(-6)
                              .map((trend, trendIndex) => (
                                <div key={trendIndex} className="text-center">
                                  <div className="text-xs text-muted-foreground">
                                    {trend.month}
                                  </div>
                                  <div className="text-sm font-medium">
                                    {formatCurrency(trend.amount)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User-wise Expense Analysis</CardTitle>
              <CardDescription>
                Individual team member expense contributions and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.userWiseExpenses
                  .sort((a, b) =>
                    sortOrder === "desc"
                      ? b.totalAmount - a.totalAmount
                      : a.totalAmount - b.totalAmount
                  )
                  .map((user, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <IconUser className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold">
                              {user.userName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {user.transactionCount} expense
                              {user.transactionCount !== 1 ? "s" : ""} submitted
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(user.totalAmount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {reportData.totalExpenses > 0
                              ? Math.round(
                                (user.totalAmount /
                                  reportData.totalExpenses) *
                                100
                              )
                              : 0}
                            % of total
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${reportData.totalExpenses > 0
                                ? (user.totalAmount /
                                  reportData.totalExpenses) *
                                100
                                : 0
                              }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed View Tab */}
        <TabsContent value="detailed-view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Expense Table</CardTitle>
              <CardDescription>
                Comprehensive view of all expense categories in tabular format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Category</th>
                      <th className="text-center p-4 font-semibold">
                        Total Amount
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Transactions
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Percentage
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Avg per Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedCategories?.map((category, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <IconCategory className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {category.categoryName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ID: {category.categoryId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-4 font-medium text-red-600">
                          {formatCurrency(category.totalAmount)}
                        </td>
                        <td className="text-center p-4 font-medium">
                          {category.transactionCount}
                        </td>
                        <td className="text-center p-4">
                          <Badge variant="outline">
                            {category.percentage}%
                          </Badge>
                        </td>
                        <td className="text-center p-4 font-medium">
                          {formatCurrency(
                            category.totalAmount / category.transactionCount
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
