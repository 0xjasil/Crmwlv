'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { 
  Search,
  Filter,
  Eye,
  Trash2,
  MoreHorizontal,
  Briefcase,
  UserPlus
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getJobOrders, deleteJobOrder, reassignJobOrder } from '@/server/actions/job-order';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from '@/components/ui/progress';
import { JobOrderMobileCard } from '@/components/enquiry/job-order-mobile-card';

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
  createadAt: Date;
  manager: {
    id: string;
    name: string;
    email: string;
  };
  branch: {
    id: string;
    name: string;
  };
  progress: number;
  assigner?: {
    id: string;
    name: string;
  };
  _count?: {
    jobLeads: number;
  };
}

interface CompletedJobOrdersClientProps {
  userRole: string;
  userId: string;
  branches?: { id: string; name: string }[];
  availableManagers?: { id: string; name: string; email: string }[];
}

export default function CompletedJobOrdersClient({ 
  userRole, 
  userId, 
  branches = [],
  availableManagers = []
}: CompletedJobOrdersClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // States for Re-assign Dialog
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [jobToReassign, setJobToReassign] = useState<string | null>(null);
  const [newManagerId, setNewManagerId] = useState<string>('');

  // Fetch job orders
  const fetchJobOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getJobOrders({
        page: currentPage,
        limit: 10,
        completedOnly: true, // Fetch only completed jobs
        pendingOnly: false,
        branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
        search: search,
      });

      if (result.success) {
        const data = (result.data as JobOrder[]) || [];
        setJobOrders(data);
        setPagination(result.pagination || null);
      } else {
        toast.error(result.message || 'Failed to fetch job orders');
      }
    } catch {
      toast.error('Failed to fetch job orders');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedBranch, search]);

  useEffect(() => {
    fetchJobOrders();
  }, [fetchJobOrders]);

  const handleViewJobOrder = (jobOrderId: string) => {
    router.push(`/enquiries/job-orders/${jobOrderId}`);
  };

  const handleDeleteJobOrder = async (jobOrderId: string) => {
    if (!confirm('Are you sure you want to delete this job order?')) return;
    
    try {
      const result = await deleteJobOrder(jobOrderId);
      if (result.success) {
        toast.success('Job order deleted successfully');
        fetchJobOrders();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Failed to delete job order');
    }
  };

  const openReassignDialog = (jobOrderId: string) => {
    setJobToReassign(jobOrderId);
    setNewManagerId('');
    setIsReassignOpen(true);
  }

  const handleReassign = async () => {
    if (!jobToReassign || !newManagerId) {
       toast.error('Please select a manager');
       return;
    }

    try {
       const result = await reassignJobOrder(jobToReassign, newManagerId);
       if (result.success) {
           toast.success('Job order re-assigned successfully');
           setIsReassignOpen(false);
           fetchJobOrders();
       } else {
           toast.error(result.message);
       }
    } catch {
       toast.error('Failed to re-assign job order');
    }
  };


  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Permission Checks
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager' || userRole === 'executive';
  
  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Completed Jobs List</h1>
          <p className="text-gray-600">View and Manage Completed Jobs</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
          {/* Branch Filter (Admin Only) */}
          {isAdmin && (
             <div className="flex flex-col gap-2">
                 <span className="text-sm font-medium">Branch</span>
                 <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                   <SelectTrigger>
                     <SelectValue placeholder="All Branch" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Branch</SelectItem>
                     {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
             </div>
          )}
          {/* Search */}
          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
             <span className="text-sm font-medium">Search</span>
             <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>
      </div>

      {/* Job Orders Table */}
      <Card>
        <CardContent className="p-0">
          {filteredJobOrdersTable(isLoading, jobOrders, isMobile, pagination, isAdmin, isManager, handleViewJobOrder, handleDeleteJobOrder, formatDate)}
        </CardContent>
      </Card>
    </div>
  );
}

function filteredJobOrdersTable(
    isLoading: boolean,
    jobOrders: JobOrder[],
    isMobile: boolean,
    pagination: any,
    isAdmin: boolean,
    isManager: boolean,
    handleViewJobOrder: (id: string) => void,
    handleDeleteJobOrder: (id: string) => void,
    formatDate: (d: any) => string
) {

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
    }

    if (jobOrders.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No records found</div>;
    }
  
    return (
        <>
            {isMobile ? (
                 <div className="space-y-4 p-4">
                    {jobOrders.map((job) => (
                        <JobOrderMobileCard
                            key={job.id}
                            jobOrder={job}
                            onView={handleViewJobOrder}
                            onDelete={handleDeleteJobOrder}
                            isAdmin={isAdmin}
                        />
                    ))}
                 </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job ID</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Job Name</TableHead>
                                <TableHead>Leads</TableHead>
                                <TableHead>Counselor</TableHead>
                                <TableHead>Assigned By</TableHead>
                                <TableHead>Date Period</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobOrders.map((job) => (
                                <TableRow key={job.id}>
                                    <TableCell>{job.id.slice(-6)}</TableCell>
                                    <TableCell>{job.branch.name}</TableCell>
                                    <TableCell className="font-medium">{job.name}</TableCell>
                                    <TableCell>{job._count?.jobLeads || 0}</TableCell>
                                    <TableCell>{job.manager.name}</TableCell>
                                    <TableCell>{job.assigner?.name || '-'}</TableCell>
                                    <TableCell>
                                        {formatDate(job.startDate)} To {formatDate(job.endDate)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={job.progress} className="w-[60px]" />
                                            <span className="text-xs">{job.progress}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{job.remarks || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewJobOrder(job.id)}>
                                                <Eye className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            
                                            {(isAdmin) && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the job order
                                                                and remove all associated data.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteJobOrder(job.id)} className="bg-red-600 hover:bg-red-700">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </>
    );
}

