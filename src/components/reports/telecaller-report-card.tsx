'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconUsers,
  IconPhone,
  IconTrendingUp, IconDownload,
  IconRefresh
} from '@tabler/icons-react'
import { getTelecallerPerformanceReport } from '@/server/actions/report-actions'
import { TelecallerReport } from '@/types/reports'

export function TelecallerReportCard() {
  const [reportData, setReportData] = useState<TelecallerReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReportData = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await getTelecallerPerformanceReport({})

      if (result?.data) {
        setReportData(result.data)
      } else {
        setError('Failed to load telecaller report data')
      }
    } catch (err) {
      setError('An error occurred while loading the report')
      console.error('Error fetching telecaller report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <IconUsers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2 text-destructive">Error Loading Report</h3>
            <p className="text-sm mb-4">{error}</p>
            <Button onClick={fetchReportData} variant="outline" size="sm">
              <IconRefresh className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <IconUsers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">No telecaller performance data found for the selected period.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Telecallers</CardDescription>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalTelecallers}</div>
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
              {reportData.performance.reduce((sum, p) => sum + p.totalEnquiries, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all telecallers</p>
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
                ? Math.round(reportData.performance.reduce((sum, p) => sum + p.conversionRate, 0) / reportData.performance.length * 10) / 10
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Top Performer</CardDescription>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{reportData.topPerformer}</div>
            <p className="text-xs text-muted-foreground">Highest conversion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Individual Performance</CardTitle>
              <CardDescription>Detailed metrics for each telecaller</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <IconDownload className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.performance.map((telecaller, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{telecaller.telecallerName}</h4>
                    <p className="text-sm text-muted-foreground">ID: {telecaller.telecallerId}</p>
                  </div>
                  <Badge variant={telecaller.conversionRate >= 20 ? "default" : telecaller.conversionRate >= 10 ? "secondary" : "outline"}>
                    {telecaller.conversionRate}% conversion
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Enquiries</p>
                    <p className="font-medium">{telecaller.totalEnquiries}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Calls Made</p>
                    <p className="font-medium">{telecaller.callsMade}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conversions</p>
                    <p className="font-medium">{telecaller.conversions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Follow-up Rate</p>
                    <p className="font-medium">{telecaller.followUpCompletion}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enquiry Stats */}
      {reportData.enquiryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enquiry Status Distribution</CardTitle>
            <CardDescription>Breakdown of enquiry statuses by telecaller</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.enquiryStats.map((stats, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">{stats.telecallerName}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">New</p>
                      <p className="font-medium text-blue-600">{stats.newEnquiries}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Contacted</p>
                      <p className="font-medium text-orange-600">{stats.contactedEnquiries}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interested</p>
                      <p className="font-medium text-green-600">{stats.interestedEnquiries}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Enrolled</p>
                      <p className="font-medium text-emerald-600">{stats.enrolledEnquiries}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dropped</p>
                      <p className="font-medium text-red-600">{stats.droppedEnquiries}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}