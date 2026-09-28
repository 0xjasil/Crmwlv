'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Phone, 
  PhoneCall, 
  PhoneMissed, 
  PhoneIncoming, 
  PhoneOutgoing, 
  RotateCw, 
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { getCallLogs } from '@/server/actions/call-log';
import { CALL_OUTCOME_OPTIONS } from '@/constants/enquiry';
import Link from 'next/link';
import { toast } from 'sonner';
import { CallLog } from '@/types/enquiry';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

export default function CallRegisterPage() {
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');

  // Reset page to 1 when filters, search, or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, outcomeFilter, dateRange, pageSize]);

  // Fetch call logs
  const loadCallLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: {
        page: number;
        limit: number;
        search?: string;
        outcome?: string;
        dateFrom?: Date;
      } = {
        page: currentPage,
        limit: pageSize,
      };

      if (debouncedSearch.trim()) {
        filters.search = debouncedSearch.trim();
      }

      if (outcomeFilter !== 'all') {
        filters.outcome = outcomeFilter;
      }

      if (dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filters.dateFrom = today;
      } else if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filters.dateFrom = weekAgo;
      } else if (dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filters.dateFrom = monthAgo;
      }

      const result = await getCallLogs(filters);
      if (result.success) {
        setCallLogs((result.data as CallLog[]) || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        toast.error(result.message || 'Failed to fetch call logs');
      }
    } catch {
      toast.error('Failed to fetch call logs');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, outcomeFilter, dateRange]);

  useEffect(() => {
    loadCallLogs();
  }, [loadCallLogs]);

  const getTotalCalls = () => pagination?.total ?? callLogs.length;
  const getAnsweredCalls = () =>
    callLogs.filter((call) => call.outcome === 'ANSWERED').length;
  const getTotalDuration = () =>
    callLogs.reduce((total, call) => total + (call.duration || 0), 0);

  const getCallTypeIcon = (outcome: string) => {
    switch (outcome) {
      case 'ANSWERED':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
      case 'NOT_ANSWERED':
        return <XCircle className="h-3.5 w-3.5 text-rose-600" />;
      case 'BUSY':
        return <AlertCircle className="h-3.5 w-3.5 text-amber-600" />;
      case 'SWITCHED_OFF':
        return <PhoneOutgoing className="h-3.5 w-3.5 text-slate-500" />;
      case 'INVALID_NUMBER':
        return <PhoneIncoming className="h-3.5 w-3.5 text-rose-600" />;
      default:
        return <Phone className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const formatDuration = (duration: number) => {
    if (!duration) return '0s';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Call Register"
        description="Comprehensive log and analytics of telecaller and admissions phone interactions."
        actions={
          <Button
            onClick={loadCallLogs}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Calls</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Phone className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{getTotalCalls()}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Total records logged</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Answered Calls</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{getAnsweredCalls()}</div>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {callLogs.length > 0
              ? `${Math.round((getAnsweredCalls() / callLogs.length) * 100)}% page connection rate`
              : 'No calls on this page'}
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Duration</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{formatDuration(getTotalDuration())}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Current view duration</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Avg Talk Time</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <PhoneIncoming className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {callLogs.length > 0
              ? formatDuration(Math.round(getTotalDuration() / callLogs.length))
              : '0s'}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Per call average</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate name, phone number, or telecaller..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
              <SelectValue placeholder="Call Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              {CALL_OUTCOME_OPTIONS.map((outcome) => (
                <SelectItem key={outcome.value} value={outcome.value}>
                  {outcome.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Call Logs Table */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Call History {pagination?.total ? `(${pagination.total})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && callLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-xs font-medium text-muted-foreground">Loading call log entries...</p>
            </div>
          ) : callLogs.length === 0 ? (
            <EmptyState
              icon={PhoneMissed}
              title="No call logs found"
              description="No phone interactions match your active search or filters."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setOutcomeFilter('all');
                    setDateRange('all');
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <div className="relative overflow-x-auto">
              {isLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Telecaller</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="w-[100px]">Duration</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callLogs.map((callLog) => (
                    <TableRow key={callLog.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">
                            {new Date(callLog.callDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {new Date(callLog.callDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/enquiries/${callLog.enquiry.id}`}
                          className="font-medium text-xs text-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {callLog.enquiry.candidateName}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {callLog.enquiry.phone}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {callLog.createdBy.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getCallTypeIcon(callLog.outcome || '')}
                          <StatusBadge status={callLog.outcome || 'DEFAULT'} />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-foreground">
                        {formatDuration(callLog.duration || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[280px] truncate text-xs text-muted-foreground" title={callLog.notes || ''}>
                          {callLog.notes || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 text-xs">
                          <Link href={`/enquiries/${callLog.enquiry.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && (
                <div className="p-3 border-t border-border/60 bg-muted/10">
                  <DataTablePagination
                    currentPage={pagination.page}
                    totalPages={pagination.pages || 1}
                    pageSize={pageSize}
                    totalRecords={pagination.total}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
