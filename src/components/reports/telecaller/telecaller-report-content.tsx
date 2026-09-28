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
  IconUsers,
  IconPhone,
  IconTrendingUp,
  IconDownload,
  IconRefresh,
  IconFilter,
  IconSearch,
  IconTarget,
  IconArrowUp,
  IconArrowDown,
  IconMinus,
} from "@tabler/icons-react";
import {
  getTelecallerPerformanceReport,
  exportTelecallerReportCSV,
} from "@/server/actions/report-actions";
import { TelecallerReport, DateRangeFilter } from "@/types/reports";
import { TelecallerReportSkeleton } from "./telecaller-report-skeleton";

interface TelecallerReportContentProps {
  userId: string;
  userRole: string;
}

export function TelecallerReportContent({
  userId,
  userRole,
}: TelecallerReportContentProps) {
  const [reportData, setReportData] = useState<TelecallerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter | undefined>();
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedStatus] = useState<string>("");
  const [tempDateRange, setTempDateRange] = useState<DateRangeFilter | undefined>();


  const [sortBy, setSortBy] = useState<"name" | "enquiries" | "conversion">(
    "conversion"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filtersRef = useRef({
    dateRange,
    selectedBranch,
    selectedStatus,
    searchTerm,
    userRole,
    userId,
  });

  const fetchReportData = useCallback(async () => {
    filtersRef.current = {
      dateRange,
      selectedBranch,
      selectedStatus,
      searchTerm,
      userRole,
      userId,
    };

    console.log("fetch using filters:", filtersRef.current);

    try {
      setLoading(true);
      setError(null);

      const result = await getTelecallerPerformanceReport(filtersRef.current);

      if (result?.data) {
        setReportData(result.data);
      } else {
        setError("Failed to load telecaller report data");
      }
    } catch (err) {
      setError("An error occurred while loading the report");
      console.error("Error fetching telecaller report:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedBranch, selectedStatus, searchTerm, userRole, userId]);


  const handleExportCSV = async () => {
    try {
      const filters = {
        dateRange,
        branchId: selectedBranch !== "all" ? selectedBranch : undefined,
        status: selectedStatus || undefined,
        search: searchTerm || undefined,
        userId: userRole === "telecaller" ? userId : undefined,
      };

      const result = await exportTelecallerReportCSV(filters);

      if (result?.data) {
        // Create and download CSV file
        const csvContent = [
          result.data.headers.join(","),
          ...result.data.rows.map((row) => row.join(",")),
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

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!searchTerm) return;

    const timeout = setTimeout(() => {
      fetchReportData();
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  // Sort performance data
  const sortedPerformance = reportData?.performance.sort((a, b) => {
    let valueA: number, valueB: number;

    switch (sortBy) {
      case "name":
        return sortOrder === "asc"
          ? a.telecallerName.localeCompare(b.telecallerName)
          : b.telecallerName.localeCompare(a.telecallerName);
      case "enquiries":
        valueA = a.totalEnquiries;
        valueB = b.totalEnquiries;
        break;
      case "conversion":
        valueA = a.conversionRate;
        valueB = b.conversionRate;
        break;
      default:
        valueA = a.conversionRate;
        valueB = b.conversionRate;
    }

    return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
  });

  if (loading) {
    return <TelecallerReportSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <IconUsers className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
            <IconUsers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">
              No telecaller performance data found for the selected period.
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
            Telecaller Performance Report
          </h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for telecaller performance and
            productivity
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
            Filter and customize your telecaller performance report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 w-full sm:w-[240px]">
              <label className="text-sm font-medium">Search Telecaller</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
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
              <label className="text-sm font-medium">Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  <SelectItem value="branch1">Main Branch</SelectItem>
                  <SelectItem value="branch2">North Branch</SelectItem>
                  <SelectItem value="branch3">South Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full sm:w-[160px]">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={sortBy}
                onValueChange={(value: "name" | "enquiries" | "conversion") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversion">Conversion Rate</SelectItem>
                  <SelectItem value="enquiries">Total Enquiries</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
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
            <CardDescription>Total Telecallers</CardDescription>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.totalTelecallers}
            </div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Enquiries</CardDescription>
            <IconPhone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.performance.reduce(
                (sum, p) => sum + p.totalEnquiries,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all telecallers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Avg Conversion Rate</CardDescription>
            <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.performance.length > 0
                ? Math.round(
                  (reportData.performance.reduce(
                    (sum, p) => sum + p.conversionRate,
                    0
                  ) /
                    reportData.performance.length) *
                  10
                ) / 10
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Top Performer</CardDescription>
            <IconTarget className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {reportData.topPerformer}
            </div>
            <p className="text-xs text-muted-foreground">
              Highest conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="enquiry-stats">Enquiry Analysis</TabsTrigger>
          <TabsTrigger value="detailed-view">Detailed View</TabsTrigger>
        </TabsList>

        {/* Performance Metrics Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Performance Metrics</CardTitle>
              <CardDescription>
                Detailed performance analysis for each telecaller
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedPerformance?.map((telecaller, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <IconUsers className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold">
                            {telecaller.telecallerName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            ID: {telecaller.telecallerId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            telecaller.conversionRate >= 20
                              ? "default"
                              : telecaller.conversionRate >= 10
                                ? "secondary"
                                : "outline"
                          }
                          className="text-sm"
                        >
                          {telecaller.conversionRate}% conversion
                        </Badge>
                        {index === 0 &&
                          sortBy === "conversion" &&
                          sortOrder === "desc" &&
                          telecaller.conversionRate > 0 && (
                            <Badge variant="default" className="bg-yellow-500">
                              🏆 Top Performer
                            </Badge>
                          )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {telecaller.totalEnquiries}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total Enquiries
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {telecaller.callsMade}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Calls Made
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {telecaller.conversions}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Conversions
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {telecaller.averageCallDuration}m
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Avg Call Duration
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {telecaller.followUpCompletion}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Follow-up Rate
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {telecaller.responseTime}h
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Response Time
                        </p>
                      </div>
                    </div>

                    {/* Performance Indicators */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Performance Rating:
                        </span>
                        <div className="flex items-center gap-2">
                          {telecaller.conversionRate >= 20 ? (
                            <>
                              <IconArrowUp className="h-4 w-4 text-green-600" />
                              <span className="text-green-600 font-medium">
                                Excellent
                              </span>
                            </>
                          ) : telecaller.conversionRate >= 10 ? (
                            <>
                              <IconMinus className="h-4 w-4 text-yellow-600" />
                              <span className="text-yellow-600 font-medium">
                                Good
                              </span>
                            </>
                          ) : (
                            <>
                              <IconArrowDown className="h-4 w-4 text-red-600" />
                              <span className="text-red-600 font-medium">
                                Needs Improvement
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enquiry Stats Tab */}
        <TabsContent value="enquiry-stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enquiry Status Distribution</CardTitle>
              <CardDescription>
                Breakdown of enquiry statuses by telecaller
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {reportData.enquiryStats.map((stats, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">
                        {stats.telecallerName}
                      </h4>
                      <Badge variant="outline">
                        {stats.newEnquiries +
                          stats.contactedEnquiries +
                          stats.interestedEnquiries +
                          stats.enrolledEnquiries +
                          stats.droppedEnquiries}{" "}
                        total
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.newEnquiries}
                        </div>
                        <p className="text-sm text-blue-700">New</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">
                          {stats.contactedEnquiries}
                        </div>
                        <p className="text-sm text-orange-700">Contacted</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.interestedEnquiries}
                        </div>
                        <p className="text-sm text-green-700">Interested</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-600">
                          {stats.enrolledEnquiries}
                        </div>
                        <p className="text-sm text-emerald-700">Enrolled</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                        <div className="text-2xl font-bold text-red-600">
                          {stats.droppedEnquiries}
                        </div>
                        <p className="text-sm text-red-700">Dropped</p>
                      </div>
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
              <CardTitle>Detailed Performance Table</CardTitle>
              <CardDescription>
                Comprehensive view of all telecaller metrics in tabular format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">
                        Telecaller
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Enquiries
                      </th>
                      <th className="text-center p-4 font-semibold">Calls</th>
                      <th className="text-center p-4 font-semibold">
                        Conversions
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Conv. Rate
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Avg Call Duration
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Follow-up Rate
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Response Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPerformance?.map((telecaller, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <IconUsers className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {telecaller.telecallerName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {telecaller.telecallerId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-4 font-medium">
                          {telecaller.totalEnquiries}
                        </td>
                        <td className="text-center p-4 font-medium">
                          {telecaller.callsMade}
                        </td>
                        <td className="text-center p-4 font-medium">
                          {telecaller.conversions}
                        </td>
                        <td className="text-center p-4">
                          <Badge
                            variant={
                              telecaller.conversionRate >= 20
                                ? "default"
                                : telecaller.conversionRate >= 10
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {telecaller.conversionRate}%
                          </Badge>
                        </td>
                        <td className="text-center p-4 font-medium">
                          {telecaller.averageCallDuration}m
                        </td>
                        <td className="text-center p-4 font-medium">
                          {telecaller.followUpCompletion}%
                        </td>
                        <td className="text-center p-4 font-medium">
                          {telecaller.responseTime}h
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
