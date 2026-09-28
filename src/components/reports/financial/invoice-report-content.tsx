'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { FinancialReportSkeleton } from '@/components/reports/financial/financial-report-skeleton'
import { IconDownload, IconRefresh, IconSearch, IconFileInvoice, IconCurrencyRupee, IconClock, IconTrendingUp, IconFilter } from '@tabler/icons-react'
import { getInvoiceReport } from '@/server/actions/report-actions'
import { InvoiceReport, ReportFilters, DateRangeFilter } from '@/types/reports'
import { toast } from 'sonner'
import { format } from 'date-fns'

export function InvoiceReportContent() {
  const [reportData, setReportData] = useState<InvoiceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date()
    },
    search: '',
    status: 'all'
  })

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchReport = useCallback(async (customFilters?: ReportFilters) => {
    try {
      setLoading(true)
      const filtersToUse = customFilters || filtersRef.current
      const result = await getInvoiceReport(filtersToUse)
      if (result.data) {
        setReportData(result.data)
      } else {
        toast.error('Failed to fetch invoice report')
      }
    } catch (error) {
      console.error('Error fetching invoice report:', error)
      toast.error('Failed to fetch invoice report')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleFilterChange = useCallback((key: keyof ReportFilters, value: string | DateRangeFilter | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleRefresh = useCallback(() => {
    fetchReport()
  }, [fetchReport])

  const handleApplyFilters = useCallback(() => {
    fetchReport()
  }, [fetchReport])

  const handleDateRangeChange = useCallback((dateRange: DateRangeFilter | undefined) => {
    handleFilterChange('dateRange', dateRange)
  }, [handleFilterChange])

  const handleStatusChange = useCallback((value: string) => {
    handleFilterChange('status', value)
  }, [handleFilterChange])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('search', e.target.value)
  }, [handleFilterChange])

  const handleExportCSV = () => {
    if (!reportData) return

    const csvData = [
      ['Invoice Report', '', '', ''],
      ['Generated At', new Date().toLocaleString(), '', ''],
      ['Date Range', `${format(filters.dateRange?.from || new Date(), 'MMM dd, yyyy')} - ${format(filters.dateRange?.to || new Date(), 'MMM dd, yyyy')}`, '', ''],
      ['', '', '', ''],
      ['Status Breakdown', '', '', ''],
      ['Status', 'Count', 'Amount', 'Percentage'],
      ...reportData.statusBreakdown.map(status => [
        status.status,
        status.count.toString(),
        status.totalAmount,      // numeric
        status.percentage
      ]),
      ['', '', '', ''],
      ['Aging Analysis', '', '', ''],
      ['Range', 'Count', 'Amount', ''],
      ...reportData.agingAnalysis.map(aging => [
        aging.range,
        aging.count.toString(),
        aging.amount,            // numeric
        ''
      ])
    ]

    const csvContent = csvData
      .map(row =>
        row
          .map(cell => {
            if (typeof cell === 'string' && cell.startsWith('₹')) {
              return `"${cell.replace(/₹|,/g, '')}"`
            }
            return `"${cell}"`
          })
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Report exported successfully')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return '✅'
      case 'sent': return '📤'
      case 'overdue': return '⚠️'
      case 'draft': return '📝'
      case 'cancelled': return '❌'
      default: return '📄'
    }
  }

  if (loading) {
    return <FinancialReportSkeleton />
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Failed to load report data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Invoice Analysis Report</h1>
          <p className="text-muted-foreground">
            Invoice status tracking, payment timelines, and revenue insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExportCSV}>
            <IconDownload className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <IconFilter className="h-5 w-5" />
            <CardTitle className="text-lg">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 w-full sm:w-[240px]">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Invoice number, client..."
                  value={filters.search || ''}
                  onChange={handleSearchChange}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2 w-full sm:w-[200px]">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-auto flex-1 min-w-[300px]">
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange
                value={filters.dateRange}
                onChange={handleDateRangeChange}
              />
            </div>
            <div className="flex items-end w-full sm:w-auto">
              <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">₹{reportData.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <IconCurrencyRupee className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding Amount</p>
                <p className="text-2xl font-bold text-orange-600">₹{reportData.outstandingAmount.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <IconFileInvoice className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Collection Time</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.averageCollectionTime} days</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <IconClock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold text-purple-600">
                  {reportData.statusBreakdown.reduce((sum, status) => sum + status.count, 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <IconTrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">Status Tracking</TabsTrigger>
          <TabsTrigger value="timeline">Payment Timeline</TabsTrigger>
          <TabsTrigger value="aging">Aging Analysis</TabsTrigger>
          <TabsTrigger value="insights">Revenue Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Distribution</CardTitle>
              <CardDescription>
                Track invoice statuses and monitor payment progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.statusBreakdown.map((status) => (
                  <div key={status.status} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getStatusIcon(status.status)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status.status)}>
                            {status.status}
                          </Badge>
                          <span className="font-medium">{status.count} invoices</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ₹{status.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{status.percentage}%</div>
                      <Progress value={status.percentage} className="w-20 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Timeline</CardTitle>
              <CardDescription>
                Monthly collection trends and pending amounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.paymentTimeline.length > 0 ? (
                <div className="space-y-4">
                  {reportData.paymentTimeline.map((period) => (
                    <div key={period.period} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{period.period}</div>
                        <div className="text-sm text-muted-foreground">
                          Collections & Outstanding
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-green-600 font-medium">
                          Collected: ₹{period.collected.toLocaleString()}
                        </div>
                        <div className="text-orange-600 font-medium">
                          Pending: ₹{period.pending.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payment timeline data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Aging Analysis</CardTitle>
              <CardDescription>
                Track overdue invoices by age brackets for better collection management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.agingAnalysis.map((aging) => (
                  <div key={aging.range} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{aging.range}</div>
                        <div className="text-sm text-muted-foreground">
                          {aging.count} invoices
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{aging.amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {reportData.outstandingAmount > 0
                          ? Math.round((aging.amount / reportData.outstandingAmount) * 100)
                          : 0}% of outstanding
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Collection Performance</CardTitle>
                <CardDescription>
                  Key metrics for invoice collection efficiency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Collection Rate</span>
                  <span className="font-semibold">
                    {reportData.totalRevenue + reportData.outstandingAmount > 0
                      ? Math.round((reportData.totalRevenue / (reportData.totalRevenue + reportData.outstandingAmount)) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress
                  value={reportData.totalRevenue + reportData.outstandingAmount > 0
                    ? (reportData.totalRevenue / (reportData.totalRevenue + reportData.outstandingAmount)) * 100
                    : 0}
                  className="w-full"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Collection Time</span>
                  <span className="font-semibold">{reportData.averageCollectionTime} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Outstanding Ratio</span>
                  <span className="font-semibold text-orange-600">
                    {reportData.totalRevenue + reportData.outstandingAmount > 0
                      ? Math.round((reportData.outstandingAmount / (reportData.totalRevenue + reportData.outstandingAmount)) * 100)
                      : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Recommendations</CardTitle>
                <CardDescription>
                  Actionable insights for improving invoice management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportData.averageCollectionTime > 30 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Collection time is high. Consider implementing automated payment reminders.
                    </p>
                  </div>
                )}
                {reportData.outstandingAmount > reportData.totalRevenue * 0.3 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      🚨 High outstanding amount. Focus on overdue invoice collection.
                    </p>
                  </div>
                )}
                {(reportData.statusBreakdown.find(s => s.status === 'draft')?.count || 0) > 5 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 Multiple draft invoices detected. Consider bulk sending to improve cash flow.
                    </p>
                  </div>
                )}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Regular monitoring of invoice aging helps maintain healthy cash flow.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}