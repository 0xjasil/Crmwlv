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
  IconAlertTriangle,
  IconDownload,
  IconRefresh,
  IconFilter,
  IconSearch,
  IconCash,
  IconCalendar,
  IconUsers,
  IconTrendingUp,
  IconClock,
  IconExclamationMark,
  IconArrowDown,
  IconTarget,
} from "@tabler/icons-react";
import {
  getPendingPaymentReport,
  exportFinancialReportCSV,
} from "@/server/actions/report-actions";
import { PendingPaymentReport, DateRangeFilter } from "@/types/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FinancialReportSkeleton } from "./financial-report-skeleton";

export function PendingPaymentReportContent() {
  const [reportData, setReportData] = useState<PendingPaymentReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter | undefined>();
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "amount" | "daysOverdue" | "name" | "course"
  >("amount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [tempDateRange, setTempDateRange] = useState<
    DateRangeFilter | undefined
  >();

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {
        dateRange,
        search: searchTerm || undefined,
      }

      const result = await getPendingPaymentReport(filters)

      if (result?.data) {
        setReportData(result.data)
      } else {
        setError('Failed to load pending payment report data')
      }
    } catch (err) {
      setError('An error occurred while loading the report')
      console.error('Error fetching pending payment report:', err)
    } finally {
      setLoading(false)
    }
  }, [dateRange, searchTerm])


  const handleExportCSV = async () => {
    try {
      const filters = {
        dateRange,
        search: searchTerm || undefined,
      };

      const result = await exportFinancialReportCSV({
        reportType: "pending-payment",
        filters,
      });

      if (result?.data) {
        console.log("CSV DATA:", result.data);

        const csvContent = [
          // quote headers
          result.data.headers.map((h) => `"${h}"`).join(","),

          // process each row
          ...result.data.rows.map((row) =>
            row
              .map((cell) => {
                if (typeof cell === "string") {
                  // if formatted currency → strip ₹ and commas
                  if (cell.startsWith("₹")) {
                    return `"${cell.replace(/₹|,/g, "")}"`;
                  }
                  // quote all strings
                  return `"${cell}"`;
                }
                // quote numeric or other values too
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
  }, [searchTerm]);


  // Filter and sort students
  const filteredAndSortedStudents = reportData?.students
    .filter((student) => {
      if (selectedPriority !== "all" && student.priority !== selectedPriority)
        return false;
      return true;
    })
    .sort((a, b) => {
      let valueA: number | string, valueB: number | string;

      switch (sortBy) {
        case "amount":
          valueA = a.outstandingAmount;
          valueB = b.outstandingAmount;
          break;
        case "daysOverdue":
          valueA = a.daysOverdue;
          valueB = b.daysOverdue;
          break;
        case "name":
          valueA = a.studentName.toLowerCase();
          valueB = b.studentName.toLowerCase();
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        case "course":
          valueA = a.course.toLowerCase();
          valueB = b.course.toLowerCase();
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        default:
          valueA = a.outstandingAmount;
          valueB = b.outstandingAmount;
      }

      return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
    });

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityIcon = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return <IconExclamationMark className="h-3 w-3" />;
      case "medium":
        return <IconClock className="h-3 w-3" />;
      case "low":
        return <IconArrowDown className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <FinancialReportSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <IconAlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
            <IconAlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">
              No pending payment data found for the selected period.
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
            Pending Payment Report
          </h1>
          <p className="text-muted-foreground">
            Outstanding dues tracking, aging analysis, and collection management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchReportData}>
            <IconRefresh className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExportCSV}>
            <IconDownload className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFilter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
          <CardDescription>
            Filter and customize your pending payment analysis report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 w-full sm:w-[240px]">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
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
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={selectedPriority}
                onValueChange={setSelectedPriority}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full sm:w-[160px]">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={sortBy}
                onValueChange={(
                  value: "amount" | "daysOverdue" | "name" | "course"
                ) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Outstanding Amount</SelectItem>
                  <SelectItem value="daysOverdue">Days Overdue</SelectItem>
                  <SelectItem value="name">Student Name</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
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
            <CardDescription>Total Outstanding</CardDescription>
            <IconCash className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount pending collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Pending Students</CardDescription>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Students with outstanding dues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>High Priority</CardDescription>
            <IconExclamationMark className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reportData.students.filter((s) => s.priority === "high").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Urgent collections needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Average Outstanding</CardDescription>
            <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                reportData.totalStudents > 0
                  ? reportData.totalOutstanding / reportData.totalStudents
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Per student average</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="outstanding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="outstanding">Outstanding Tracking</TabsTrigger>
          <TabsTrigger value="aging">Aging Analysis</TabsTrigger>
          <TabsTrigger value="targets">Collection Targets</TabsTrigger>
          <TabsTrigger value="detailed-view">Student Details</TabsTrigger>
        </TabsList>

        {/* Outstanding Tracking Tab */}
        <TabsContent value="outstanding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Payment Tracking</CardTitle>
              <CardDescription>
                Real-time tracking of students with pending payments and
                priority management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAndSortedStudents
                  ?.slice(0, 10)
                  .map((student, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                            <IconUsers className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold">
                              {student.studentName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {student.course} • {student.daysOverdue} days
                              overdue
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(student.outstandingAmount)}
                          </div>
                          <Badge
                            variant="outline"
                            className={`mt-1 ${getPriorityColor(
                              student.priority
                            )}`}
                          >
                            {getPriorityIcon(student.priority)}
                            <span className="ml-1 capitalize">
                              {student.priority} Priority
                            </span>
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="text-lg font-bold text-red-600">
                            {formatCurrency(student.outstandingAmount)}
                          </div>
                          <p className="text-sm text-red-700">Outstanding</p>
                        </div>
                        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                          <div className="text-lg font-bold text-yellow-600">
                            {formatCurrency(student.agentDiscount)}
                          </div>
                          <p className="text-sm text-yellow-700">
                            Agent Discount
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="text-lg font-bold text-orange-600">
                            {student.daysOverdue}
                          </div>
                          <p className="text-sm text-orange-700">
                            Days Overdue
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="text-lg font-bold text-blue-600">
                            {student.lastPaymentDate
                              ? formatDate(student.lastPaymentDate)
                              : "No Payment"}
                          </div>
                          <p className="text-sm text-blue-700">Last Payment</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aging Analysis Tab */}
        <TabsContent value="aging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Aging Analysis</CardTitle>
              <CardDescription>
                Breakdown of outstanding payments by age categories for
                collection prioritization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.agingAnalysis.map((aging, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                          <IconCalendar className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold">
                            {aging.range}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {aging.count} student{aging.count !== 1 ? "s" : ""}{" "}
                            in this category
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(aging.amount)}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {(
                            (aging.amount / reportData.totalOutstanding) *
                            100
                          ).toFixed(1)}
                          % of total
                        </Badge>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(aging.amount / reportData.totalOutstanding) * 100
                            }%`,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <div className="text-lg font-bold text-orange-600">
                          {formatCurrency(aging.amount)}
                        </div>
                        <p className="text-sm text-orange-700">Total Amount</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-lg font-bold text-blue-600">
                          {aging.count}
                        </div>
                        <p className="text-sm text-blue-700">Students</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="text-lg font-bold text-purple-600">
                          {aging.count > 0
                            ? formatCurrency(aging.amount / aging.count)
                            : formatCurrency(0)}
                        </div>
                        <p className="text-sm text-purple-700">
                          Avg per Student
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collection Targets Tab */}
        <TabsContent value="targets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Targets & Goals</CardTitle>
              <CardDescription>
                Strategic collection targets to improve cash flow and reduce
                outstanding dues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <IconTarget className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">
                          This Week Target
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          10% of total outstanding • Immediate priority
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.collectionTargets.thisWeek)}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        Weekly Goal
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <IconTarget className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">
                          This Month Target
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          30% of total outstanding • Monthly objective
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(reportData.collectionTargets.thisMonth)}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        Monthly Goal
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <IconTarget className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">
                          This Quarter Target
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          60% of total outstanding • Quarterly milestone
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(
                          reportData.collectionTargets.thisQuarter
                        )}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        Quarterly Goal
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Details Tab */}
        <TabsContent value="detailed-view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Student Payment Records</CardTitle>
              <CardDescription>
                Complete list of all students with outstanding payments and
                detailed information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Student</th>
                      <th className="text-left p-4 font-semibold">Course</th>
                      <th className="text-center p-4 font-semibold">
                        Outstanding
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Agent Discount
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Days Overdue
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Priority
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Last Payment
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Next Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedStudents?.map((student, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                              <IconUsers className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {student.studentName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.contactNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{student.course}</div>
                          <div className="text-sm text-muted-foreground">
                            Course enrollment
                          </div>
                        </td>
                        <td className="text-center p-4 font-medium text-red-600">
                          {formatCurrency(student.outstandingAmount)}
                        </td>
                        <td className="text-center p-4 font-medium text-yellow-600">
                          {formatCurrency(student.agentDiscount)}
                        </td>
                        <td className="text-center p-4">
                          <Badge
                            variant="outline"
                            className={
                              student.daysOverdue > 30
                                ? "border-red-200 text-red-800"
                                : student.daysOverdue > 7
                                  ? "border-yellow-200 text-yellow-800"
                                  : "border-green-200 text-green-800"
                            }
                          >
                            {student.daysOverdue} days
                          </Badge>
                        </td>
                        <td className="text-center p-4">
                          <Badge className={getPriorityColor(student.priority)}>
                            {getPriorityIcon(student.priority)}
                            <span className="ml-1 capitalize">
                              {student.priority}
                            </span>
                          </Badge>
                        </td>
                        <td className="text-center p-4 text-sm text-muted-foreground">
                          {student.lastPaymentDate
                            ? formatDate(student.lastPaymentDate)
                            : "No payment"}
                        </td>
                        <td className="text-center p-4 text-sm text-muted-foreground">
                          {formatDate(student.nextDueDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {(!filteredAndSortedStudents ||
                  filteredAndSortedStudents.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <IconUsers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Pending Payments
                      </h3>
                      <p className="text-sm">
                        No students with outstanding payments found for the
                        selected criteria.
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
