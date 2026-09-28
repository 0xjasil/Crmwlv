'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { BranchReportSkeleton } from '@/components/reports/branch/branch-report-skeleton'
import { IconDownload, IconRefresh, IconSearch, IconBuilding, IconTrendingUp, IconUsers, IconTarget, IconFilter } from '@tabler/icons-react'
import { getBranchReport } from '@/server/actions/report-actions'
import { BranchReport, ReportFilters, DateRangeFilter } from '@/types/reports'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface BranchReportContentProps {
  userId: string
  userRole: string
}

export function BranchReportContent({ }: BranchReportContentProps) {
  const [reportData, setReportData] = useState<BranchReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date()
    },
    search: ''
  })

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchReport = useCallback(async (customFilters?: ReportFilters) => {
    try {
      setLoading(true)
      const filtersToUse = customFilters || filtersRef.current
      const result = await getBranchReport(filtersToUse)
      if (result.data) {
        setReportData(result.data)
      } else {
        toast.error('Failed to fetch branch report')
      }
    } catch (error) {
      console.error('Error fetching branch report:', error)
      toast.error('Failed to fetch branch report')
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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('search', e.target.value)
  }, [handleFilterChange])

  const handleExportCSV = () => {
    if (!reportData) return

    const csvData = [
      ['Branch Performance Report', '', '', '', '', ''],
      ['Generated At', new Date().toLocaleString(), '', '', '', ''],
      ['Date Range', `${format(filters.dateRange?.from || new Date(), 'MMM dd, yyyy')} - ${format(filters.dateRange?.to || new Date(), 'MMM dd, yyyy')}`, '', '', '', ''],
      ['', '', '', '', '', ''],
      ['Branch Performance', '', '', '', '', ''],
      ['Branch Name', 'Total Enquiries', 'Total Admissions', 'Conversion Rate', 'Total Revenue', 'Active Students'],
      ...reportData.performance.map(branch => [
        branch.branchName,
        branch.totalEnquiries.toString(),
        branch.totalAdmissions.toString(),
        `${branch.conversionRate}%`,
        `₹${branch.totalRevenue.toLocaleString()}`,
        branch.activeStudents.toString()
      ]),
      ['', '', '', '', '', ''],
      ['Enquiry Distribution', '', '', '', '', ''],
      ['Branch Name', 'Enquiry Count', 'Percentage', '', '', ''],
      ...reportData.enquiryDistribution.map(dist => [
        dist.branchName,
        dist.enquiryCount.toString(),
        `${dist.percentage}%`,
        '',
        '',
        ''
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `branch-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Report exported successfully')
  }

  const getBranchPerformanceColor = (conversionRate: number) => {
    if (conversionRate >= 20) return 'bg-green-100 text-green-800'
    if (conversionRate >= 10) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (loading) {
    return <BranchReportSkeleton />
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Failed to load report data</p>
      </div>
    )
  }

  const totalEnquiries = reportData.performance.reduce((sum, branch) => sum + branch.totalEnquiries, 0)
  const totalRevenue = reportData.performance.reduce((sum, branch) => sum + branch.totalRevenue, 0)
  const averageConversion = reportData.performance.length > 0
    ? reportData.performance.reduce((sum, branch) => sum + branch.conversionRate, 0) / reportData.performance.length
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Branch Analytics Report</h1>
          <p className="text-muted-foreground">
            Branch-wise performance comparison and regional insights
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
            <div className="space-y-2 w-full sm:w-[300px]">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Branch name, enquiry..."
                  value={filters.search || ''}
                  onChange={handleSearchChange}
                  className="pl-9"
                />
              </div>
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
                <p className="text-sm font-medium text-muted-foreground">Total Branches</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.totalBranches}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <IconBuilding className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Enquiries</p>
                <p className="text-2xl font-bold text-green-600">{totalEnquiries}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <IconUsers className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <IconTrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Conversion</p>
                <p className="text-2xl font-bold text-orange-600">{averageConversion.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <IconTarget className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparison">Branch Comparison</TabsTrigger>
          <TabsTrigger value="performance">Regional Performance</TabsTrigger>
          <TabsTrigger value="distribution">Enquiry Distribution</TabsTrigger>
          <TabsTrigger value="insights">Revenue Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branch Performance Comparison</CardTitle>
              <CardDescription>
                Compare performance metrics across all branches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.performance.map((branch) => (
                  <div key={branch.branchId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <IconBuilding className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{branch.branchName}</div>
                        <div className="text-sm text-muted-foreground">
                          {branch.totalEnquiries} enquiries • {branch.totalAdmissions} admissions
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getBranchPerformanceColor(branch.conversionRate)}>
                          {branch.conversionRate}% conversion
                        </Badge>
                      </div>
                      <div className="text-sm font-medium">₹{branch.totalRevenue.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional Performance Metrics</CardTitle>
              <CardDescription>
                Detailed performance analysis for each branch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportData.performance.map((branch) => (
                  <Card key={branch.branchId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{branch.branchName}</CardTitle>
                      <CardDescription>Performance overview</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{branch.totalEnquiries}</div>
                          <div className="text-sm text-muted-foreground">Enquiries</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{branch.totalAdmissions}</div>
                          <div className="text-sm text-muted-foreground">Admissions</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Conversion Rate</span>
                          <span className="text-sm font-bold">{branch.conversionRate}%</span>
                        </div>
                        <Progress value={branch.conversionRate} className="w-full" />
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Revenue</span>
                          <span className="font-medium">₹{branch.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Active Students</span>
                          <span className="font-medium">{branch.activeStudents}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Avg Enquiry Value</span>
                          <span className="font-medium">₹{branch.averageEnquiryValue.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enquiry Distribution Analysis</CardTitle>
              <CardDescription>
                Enquiry volume distribution across branches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.enquiryDistribution.map((dist) => (
                  <div key={dist.branchId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{dist.branchName}</div>
                        <div className="text-sm text-muted-foreground">
                          {dist.enquiryCount} enquiries
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{dist.percentage}%</div>
                      <Progress value={dist.percentage} className="w-20 mt-1" />
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
                <CardTitle>Top Performing Branch</CardTitle>
                <CardDescription>
                  Branch with highest revenue generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{reportData.topPerformingBranch}</div>
                  <div className="text-sm text-muted-foreground">Leading revenue generator</div>
                </div>
                {reportData.performance.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Revenue Share</span>
                      <span className="font-semibold">
                        {totalRevenue > 0
                          ? Math.round((reportData.performance.find(b => b.branchName === reportData.topPerformingBranch)?.totalRevenue || 0) / totalRevenue * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Conversion Rate</span>
                      <span className="font-semibold">
                        {reportData.performance.find(b => b.branchName === reportData.topPerformingBranch)?.conversionRate || 0}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branch Insights</CardTitle>
                <CardDescription>
                  Strategic recommendations for branch optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {averageConversion < 10 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Low average conversion rate. Consider reviewing enquiry quality and follow-up processes.
                    </p>
                  </div>
                )}
                {reportData.performance.some(b => b.totalEnquiries === 0) && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      🚨 Some branches have no enquiries. Focus on marketing and lead generation.
                    </p>
                  </div>
                )}
                {reportData.performance.length > 1 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 Share best practices from top-performing branches with underperforming ones.
                    </p>
                  </div>
                )}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Regular branch performance monitoring helps identify growth opportunities.
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