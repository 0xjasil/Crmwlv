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
  IconCash,
  IconDownload,
  IconRefresh,
  IconFilter,
  IconSearch,
  IconUsers,
  IconTrendingUp,
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconMinus,
} from "@tabler/icons-react";
import {
  getAdmissionPaymentReport,
  exportFinancialReportCSV,
} from "@/server/actions/report-actions";
import { AdmissionPaymentReport, DateRangeFilter } from "@/types/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FinancialReportSkeleton } from "./financial-report-skeleton";

export function AdmissionPaymentReportContent() {
  const [reportData, setReportData] = useState<AdmissionPaymentReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateRange: undefined as DateRangeFilter | undefined,
    search: "",
  });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const handleDateRangeChange = useCallback(
    (dateRange: DateRangeFilter | undefined) => {
      setFilters((prev) => ({ ...prev, dateRange }));
    },
    []
  );

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "totalFees" | "outstanding">(
    "outstanding"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getAdmissionPaymentReport(filtersRef.current);

      if (result?.data) {
        setReportData(result.data);
      } else {
        setError("Failed to load admission payment report data");
      }
    } catch (err) {
      setError("An error occurred while loading the report");
      console.error("Error fetching admission payment report:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExportCSV = async () => {
    try {
      const exportFilters = {
        dateRange: filters.dateRange,
        search: filters.search || undefined,
      };

      const result = await exportFinancialReportCSV({
        reportType: "admission-payment",
        filters: exportFilters,
      });

      if (result?.data) {
        console.log("report", result.data);
        // Create and download CSV file
        const csvContent = [
          result.data.headers.map((h) => `"${h}"`).join(","),
          ...result.data.rows.map((row) =>
            row
              .map((cell) => {
                // remove currency formatting if present
                if (typeof cell === "string" && cell.startsWith("₹")) {
                  return `"${cell.replace(/₹|,/g, "")}"`; // becomes: 56000
                }
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

  // Filter and sort students
  const filteredAndSortedStudents = reportData?.students
    .filter((student) => {
      if (selectedStatus !== "all" && student.status !== selectedStatus)
        return false;
      return true;
    })
    .sort((a, b) => {
      let valueA: number | string, valueB: number | string;

      switch (sortBy) {
        case "name":
          valueA = a.studentName.toLowerCase();
          valueB = b.studentName.toLowerCase();
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        case "totalFees":
          valueA = a.totalFees;
          valueB = b.totalFees;
          break;
        case "outstanding":
          valueA = a.outstandingAmount;
          valueB = b.outstandingAmount;
          break;
        default:
          valueA = a.outstandingAmount;
          valueB = b.outstandingAmount;
      }

      return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
    });

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchReportData();
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  if (loading) {
    return <FinancialReportSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <IconCash className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2 text-destructive">
              Error Loading Report
            </h3>
            <p className="text-sm mb-4">{error}</p>
            <Button
              onClick={() => fetchReportData()}
              variant="outline"
              size="sm"
            >
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
            <IconCash className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">
              No admission payment data found for the selected period.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "fully_paid":
        return <IconCircleCheck className="h-4 w-4 text-green-600" />;
      case "partially_paid":
        return <IconClock className="h-4 w-4 text-yellow-600" />;
      case "overdue":
        return <IconAlertTriangle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <IconMinus className="h-4 w-4 text-gray-600" />;
      default:
        return <IconMinus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "default";
      case "partially_paid":
        return "secondary";
      case "overdue":
        return "destructive";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Admission Payment Report
          </h1>
          <p className="text-muted-foreground">
            Comprehensive payment tracking and fee collection analysis
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
            Filter and customize your admission payment report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 w-full sm:w-[240px]">
              <label className="text-sm font-medium">Search Student</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2 w-full sm:w-auto flex-1 min-w-[300px]">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <DatePickerWithRange
                  value={filters.dateRange}
                  onChange={handleDateRangeChange}
                  className="flex-1"
                />
                <Button
                  variant="default"
                  onClick={fetchReportData}
                  disabled={loading}
                  className="shrink-0"
                >
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-2 w-full sm:w-[200px]">
              <label className="text-sm font-medium">Payment Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="fully_paid">Fully Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full sm:w-[160px]">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={sortBy}
                onValueChange={(value: "name" | "totalFees" | "outstanding") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outstanding">
                    Outstanding Amount
                  </SelectItem>
                  <SelectItem value="totalFees">Total Fees</SelectItem>
                  <SelectItem value="name">Student Name</SelectItem>
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
            <CardDescription>Total Collected</CardDescription>
            <IconTrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData.totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Outstanding</CardDescription>
            <IconAlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(reportData.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">Pending collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Overdue Amount</CardDescription>
            <IconAlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Students</CardDescription>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.students.length}
            </div>
            <p className="text-xs text-muted-foreground">Active admissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="students" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students">Student Payments</TabsTrigger>
          <TabsTrigger value="payment-modes">Payment Methods</TabsTrigger>
          <TabsTrigger value="detailed-view">Detailed View</TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Payment Status</CardTitle>
              <CardDescription>
                Individual student payment tracking and outstanding balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAndSortedStudents?.map((student, index) => (
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
                            {student.studentName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            ID: {student.admissionId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getStatusBadgeVariant(student.status)}
                          className="flex items-center gap-1"
                        >
                          {getStatusIcon(student.status)}
                          {formatStatus(student.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(student.totalFees)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total Fees
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(student.paidAmount)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Paid Amount
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(student.outstandingAmount)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Outstanding
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(student.agentDiscount)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Agent Discount
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {student.nextDueDate
                            ? formatDate(student.nextDueDate)
                            : "N/A"}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Next Due Date
                        </p>
                      </div>
                    </div>

                    {/* Payment History */}
                    {student.paymentHistory.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="text-sm font-semibold mb-2">
                          Recent Payments
                        </h5>
                        <div className="space-y-2">
                          {student.paymentHistory
                            .slice(0, 3)
                            .map((payment, paymentIndex) => (
                              <div
                                key={paymentIndex}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {formatDate(payment.paymentDate)} -{" "}
                                  {payment.receiptNumber}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {formatCurrency(payment.amount)}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {payment.paymentMode}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          {student.paymentHistory.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{student.paymentHistory.length - 3} more payments
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-modes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
              <CardDescription>
                Analysis of payment methods used by students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {reportData.paymentModeBreakdown.map((mode, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">{mode.mode}</h4>
                      <Badge variant="outline">
                        {mode.count} transaction{mode.count !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(mode.amount)}
                        </div>
                        <p className="text-sm text-blue-700">Total Amount</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {mode.count}
                        </div>
                        <p className="text-sm text-green-700">Transactions</p>
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
              <CardTitle>Detailed Payment Table</CardTitle>
              <CardDescription>
                Comprehensive view of all student payments in tabular format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Student</th>
                      <th className="text-center p-4 font-semibold">
                        Total Fees
                      </th>
                      <th className="text-center p-4 font-semibold">Paid</th>
                      <th className="text-center p-4 font-semibold">
                        Outstanding
                      </th>
                      <th className="text-center p-4 font-semibold">
                        Agent Discount
                      </th>
                      <th className="text-center p-4 font-semibold">Status</th>
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
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <IconUsers className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {student.studentName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.admissionId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-4 font-medium">
                          {formatCurrency(student.totalFees)}
                        </td>
                        <td className="text-center p-4 font-medium text-green-600">
                          {formatCurrency(student.paidAmount)}
                        </td>
                        <td className="text-center p-4 font-medium text-orange-600">
                          {formatCurrency(student.outstandingAmount)}
                        </td>
                        <td className="text-center p-4 font-medium text-blue-600">
                          {formatCurrency(student.agentDiscount)}
                        </td>
                        <td className="text-center p-4">
                          <Badge
                            variant={getStatusBadgeVariant(student.status)}
                            className="flex items-center gap-1 w-fit mx-auto"
                          >
                            {getStatusIcon(student.status)}
                            {formatStatus(student.status)}
                          </Badge>
                        </td>
                        <td className="text-center p-4 font-medium">
                          {student.nextDueDate
                            ? formatDate(student.nextDueDate)
                            : "N/A"}
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
