'use client';

import { useState, useEffect, useCallback, use, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Briefcase,
  Users,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText
} from 'lucide-react';
import { getJobOrder, updateJobLeadStatus, getJobOrderStats } from '@/server/actions/job-order';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface JobOrder {
  id: string;
  name: string;
  description?: string | null;
  remarks?: string | null;
  jobCode?: string | null;
  managerId: string;
  branchId: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  manager: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  branch: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  jobLeads: Array<{
    id: string;
    status: 'PENDING' | 'CLOSED';
    lead: {
      id: string;
      candidateName: string;
      phone: string;
      contact2: string | null;
      email: string | null;
      status: string;
      address: string | null;
      notes: string | null;
      feedback: string | null;
      lastContactDate: Date | null;
      createdAt: Date;
      preferredCourse: {
        id: string;
        name: string;
      } | null;
      enquirySource: {
        id: string;
        name: string;
      } | null;
      requiredService: {
        id: string;
        name: string;
      } | null;
      assignedTo: {
        id: string;
        name: string;
      } | null;
    };
  }>;
}

export default function JobOrderDetailPage({ params }: { params: Promise<{ jobOrderId: string }> }) {
  const { jobOrderId } = use(params);
  const router = useRouter();
  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [stats, setStats] = useState<{ percentage: number; closed: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchJobOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const [orderResult, statsResult] = await Promise.all([
        getJobOrder(jobOrderId),
        getJobOrderStats(jobOrderId)
      ]);

      if (orderResult.success) {
        setJobOrder(orderResult.data as JobOrder);
      } else {
        toast.error(orderResult.message || 'Failed to fetch job order details');
        router.push('/enquiries/job-orders');
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch {
      toast.error('An error occurred while fetching job order details');
    } finally {
      setIsLoading(false);
    }
  }, [jobOrderId, router]);

  useEffect(() => {
    fetchJobOrder();
  }, [fetchJobOrder]);

  const handleStatusChange = async (leadId: string, currentStatus: 'PENDING' | 'CLOSED') => {
    const newStatus = currentStatus === 'PENDING' ? 'CLOSED' : 'PENDING';
    setUpdatingLeadId(leadId);

    try {
      const result = await updateJobLeadStatus(leadId, newStatus);
      if (result.success) {
        toast.success(`Job lead marked as ${newStatus.toLowerCase()}`);
        setJobOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            jobLeads: prev.jobLeads.map((jl) =>
              jl.id === leadId ? { ...jl, status: newStatus } : jl
            ),
          };
        });

        // Refresh stats
        const statsResult = await getJobOrderStats(jobOrderId);
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const toggleRow = (leadId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId);
    } else {
      newExpanded.add(leadId);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-full min-h-125">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-muted-foreground">Loading job order details...</div>
        </div>
      </div>
    );
  }

  if (!jobOrder) {
    return null;
  }

  const pendingCount = stats ? stats.total - stats.closed : 0;
  const closedCount = stats?.closed || 0;
  const totalLeads = stats?.total || 0;
  const progress = stats?.percentage || 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-400 mx-auto w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between bg-card p-6 rounded-xl border shadow-sm">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" className="mt-1" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{jobOrder.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {jobOrder.jobCode || `ID: ${jobOrder.id}`}
                </p>
              </div>
              <Badge variant={pendingCount > 0 ? "secondary" : "default"} className="text-xs px-2 py-0.5">
                {pendingCount > 0 ? 'In Progress' : 'Completed'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                <span>Managed by <span className="font-medium text-foreground">{jobOrder.manager.name}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{jobOrder.branch.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(jobOrder.startDate), 'MMM dd, yyyy')} - {format(new Date(jobOrder.endDate), 'MMM dd, yyyy')}</span>
              </div>
            </div>
            {(jobOrder.description || jobOrder.remarks) && (
              <div className="mt-3 space-y-1 text-sm">
                {jobOrder.description && (
                  <p className="text-foreground/80">{jobOrder.description}</p>
                )}
                {jobOrder.remarks && (
                  <p className="text-muted-foreground">Remark: {jobOrder.remarks}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-lg border">
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground">Overall Progress</div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{Math.round(progress)}%</div>
          </div>
          <div className="h-12 w-12 rounded-full border-4 border-muted relative flex items-center justify-center overflow-hidden">
            <div
              className="absolute inset-0 border-4 border-primary rounded-full transition-all duration-1000 ease-out"
              style={{ clipPath: `polygon(0 0, 100% 0, 100% ${progress}%, 0 ${progress}%)` }} // Simple visual approximation
            />
            <Target className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">Candidates assigned</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Leads</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedCount}</div>
            <p className="text-xs text-muted-foreground">Successfully processed</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manager Details</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate" title={jobOrder.manager.email}>{jobOrder.manager.email}</div>
            <p className="text-xs text-muted-foreground capitalize">{jobOrder.manager.role.toLowerCase()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="shadow-md border-0">
        <CardHeader className="px-6 py-4 border-b bg-muted/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Leads Directory</CardTitle>
              <CardDescription>Detailed list of all candidates and their current status</CardDescription>
            </div>
            <Badge variant="outline" className="bg-background">{totalLeads} Records</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-12.5"></TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Course & Service</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobOrder.jobLeads.map((jobLead) => (
                <Fragment key={jobLead.id}>
                  <TableRow className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleRow(jobLead.id)}>
                        {expandedRows.has(jobLead.id) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{jobLead.lead.candidateName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{jobLead.lead.status}</Badge>
                        {jobLead.lead.assignedTo && (
                          <span className="text-[10px]" title="Original Assignee">({jobLead.lead.assignedTo.name})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(jobLead.lead.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {jobLead.lead.phone}
                        </div>
                        {jobLead.lead.contact2 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {jobLead.lead.contact2}
                          </div>
                        )}
                        {jobLead.lead.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-37.5" title={jobLead.lead.email}>{jobLead.lead.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {jobLead.lead.preferredCourse ? (
                          <div className="font-medium text-sm">{jobLead.lead.preferredCourse.name}</div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                        {jobLead.lead.requiredService && (
                          <div className="text-xs text-muted-foreground">Service: {jobLead.lead.requiredService.name}</div>
                        )}
                        {jobLead.lead.enquirySource && (
                          <div className="text-xs text-muted-foreground">Via {jobLead.lead.enquirySource.name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {jobLead.lead.lastContactDate ? (
                          format(new Date(jobLead.lead.lastContactDate), 'MMM dd, yyyy')
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Never contacted</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={jobLead.status === 'PENDING'
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
                        }
                        variant="outline"
                      >
                        {jobLead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={updatingLeadId === jobLead.id}>
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {jobLead.status === 'PENDING' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(jobLead.id, 'PENDING')} className="cursor-pointer">
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              <span>Mark as Closed</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => router.push(`/enquiries/job-orders/${jobOrderId}/leads/${jobLead.id}`)} className="cursor-pointer">
                            <FileText className="mr-2 h-4 w-4" />
                            View Lead Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {/* Expanded Row Content */}
                  {expandedRows.has(jobLead.id) && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={7} className="p-0 border-b">
                        <div className="p-4 pl-14 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-200">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                <MessageSquare className="h-3 w-3" />
                                Notes
                              </h4>
                              <div className="bg-background border rounded-md p-3 text-sm shadow-sm min-h-15">
                                {jobLead.lead.notes ? (
                                  <p className="text-foreground/90 whitespace-pre-wrap">{jobLead.lead.notes}</p>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">No notes recorded.</span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                <MessageSquare className="h-3 w-3" />
                                Feedback
                              </h4>
                              <div className="bg-background border rounded-md p-3 text-sm shadow-sm min-h-15">
                                {jobLead.lead.feedback ? (
                                  <p className="text-foreground/90 whitespace-pre-wrap">{jobLead.lead.feedback}</p>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">No feedback recorded.</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              Address & Meta Info
                            </h4>
                            <div className="bg-background border rounded-md p-3 text-sm shadow-sm min-h-20">
                              {jobLead.lead.address ? (
                                <p>{jobLead.lead.address}</p>
                              ) : (
                                <span className="text-muted-foreground italic text-xs">No address provided.</span>
                              )}
                              <Separator className="my-2" />
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Original Assignee: </span>
                                  <span className="font-medium">{jobLead.lead.assignedTo?.name || 'Unassigned'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created On: </span>
                                  <span className="font-medium">{format(new Date(jobLead.lead.createdAt), 'MMM dd, yyyy')}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">System ID: </span>
                                  <span className="font-mono">{jobLead.lead.id}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {jobOrder.jobLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-48 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/30" />
                      <p>No leads assigned to this job order.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
