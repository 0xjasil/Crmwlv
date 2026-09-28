'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Eye, Edit, Trash2, MoreVertical, UserPlus, ListTodo, Briefcase, FileText } from 'lucide-react';
import { getEnquiries } from '@/server/actions/enquiry';
import { getAllBranches } from '@/server/actions/data-management';
import { ENQUIRY_STATUS_OPTIONS } from '@/constants/enquiry';
import { toast } from 'sonner';
import { EnquiryMobileCard } from '@/components/enquiry/enquiry-mobile-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Enquiry } from '@/types/enquiry';
import { authClient } from '@/lib/auth-client';

import { EnquiryFormDialog } from '@/components/enquiry/enquiry-form-dialog';
import { ImportLeadsDialog } from '@/components/enquiry/import-leads-dialog';
import { DeleteEnquiryDialog } from '@/components/enquiry/delete-enquiry-dialog';
import { AssignEnquiryDialog } from '@/components/enquiry/assign-enquiry-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Branch } from '@/types/data-management';

export default function EnquiriesPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role?.toLowerCase();
  const canAssign = userRole === 'admin' || userRole === 'manager';

  // Debug: Log role for troubleshooting (remove in production)
  useEffect(() => {
    if (session?.user?.role) {
      console.log('User role:', session.user.role, 'canAssign:', canAssign);
    }
  }, [session?.user?.role, canAssign]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = useState<{
    id: string;
    candidateName: string;
  } | null>(null);

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [enquiryToAssign, setEnquiryToAssign] = useState<{
    id: string;
    candidateName: string;
    assignedToId?: string | null;
    branchId?: string | null;
    branchName?: string | null;
  } | null>(null);

  // Bulk assign state
  const [isBulkSelectionEnabled, setIsBulkSelectionEnabled] = useState(false);
  const [selectedEnquiryIds, setSelectedEnquiryIds] = useState<string[]>([]);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [bulkAssignBranchId, setBulkAssignBranchId] = useState<string | null>(null);

  // Filter states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [prevFilterAssigned, setPrevFilterAssigned] = useState<string>('all');

  // Reset page to 1 when filters or debounced search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterBranchId, filterAssigned, pageSize]);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      const result = await getAllBranches();
      if (result.success) {
        setBranches(result.data as Branch[]);
      }
    };
    fetchBranches();
  }, []);

  // Fetch enquiries
  const fetchEnquiriesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getEnquiries({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        branchId: filterBranchId !== 'all' ? filterBranchId : undefined,
        isAssigned: filterAssigned === 'all' ? undefined : filterAssigned === 'assigned',
      });

      if (result.success) {
        setEnquiries((result.data as Enquiry[]) || []);
        setPagination(result.pagination || null);
      } else {
        toast.error(result.message || 'Failed to fetch enquiries');
      }
    } catch {
      toast.error('Failed to fetch enquiries');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, filterBranchId, filterAssigned]);

  // Fetch enquiries on component mount and when filters change
  useEffect(() => {
    fetchEnquiriesData();
  }, [fetchEnquiriesData]);

  // Refresh function to be called after successful enquiry creation
  const refreshEnquiries = useCallback(() => {
    fetchEnquiriesData();
    setSelectedEnquiryIds([]); // Clear selection on refresh
    setBulkAssignBranchId(null);
    if (isBulkSelectionEnabled) {
      setIsBulkSelectionEnabled(false);
      setFilterAssigned(prevFilterAssigned);
    }
  }, [fetchEnquiriesData, isBulkSelectionEnabled, prevFilterAssigned]);

  // Bulk Action Handlers
  const toggleBulkSelection = () => {
    if (isBulkSelectionEnabled) {
      // Cancel selection
      setIsBulkSelectionEnabled(false);
      setSelectedEnquiryIds([]);
      setBulkAssignBranchId(null);
      setFilterAssigned(prevFilterAssigned);
    } else {
      setPrevFilterAssigned(filterAssigned);
      setFilterAssigned('unassigned');
      setIsBulkSelectionEnabled(true);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEnquiryIds(enquiries.map((e) => e.id));
    } else {
      setSelectedEnquiryIds([]);
    }
  };

  const handleSelectEnquiry = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedEnquiryIds((prev) => [...prev, id]);
    } else {
      setSelectedEnquiryIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkAssign = () => {
    setIsBulkAssignDialogOpen(true);
  };

  // Action handlers for dropdown menu
  const handleViewEnquiry = (enquiryId: string) => {
    router.push(`/enquiries/${enquiryId}`);
  };

  const handleEditEnquiry = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setEditDialogOpen(true);
  };

  const handleDeleteEnquiry = (enquiryId: string, candidateName: string) => {
    setEnquiryToDelete({ id: enquiryId, candidateName });
    setDeleteDialogOpen(true);
  };

  const handleAssignEnquiry = (enquiry: Enquiry) => {
    setEnquiryToAssign({
      id: enquiry.id,
      candidateName: enquiry.candidateName,
      assignedToId: enquiry.assignedTo?.id,
      branchId: enquiry.branchId,
      branchName: enquiry.branch?.name
    });
    setAssignDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const statusOption = ENQUIRY_STATUS_OPTIONS.find((option) => option.value === status);
    return statusOption
      ? `bg-${statusOption.color}-100 text-${statusOption.color}-800`
      : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Enquiries"
        description="Manage, assign, and track all incoming lead enquiries"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/enquiries/job-orders')}
            >
              <Briefcase className="mr-1.5 h-4 w-4" />
              Job Orders
            </Button>
            <ImportLeadsDialog branches={branches} onSuccess={refreshEnquiries} />
            <EnquiryFormDialog branches={branches} mode="create" onSuccess={refreshEnquiries} />
          </div>
        }
      />

      {/* Filters and Search Bar */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidate name, phone, or email..."
                className="pl-8.5 h-9 text-sm"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Branch Filter (Admin Only) */}
            {userRole === 'admin' && (
              <div className="w-full md:w-48">
                <Select
                  value={filterBranchId}
                  onValueChange={(value) => {
                    setFilterBranchId(value);
                    setCurrentPage(1);
                  }}
                  disabled={isBulkSelectionEnabled}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assigned Status Filter */}
            <div className="w-full md:w-40">
              <Select
                value={filterAssigned}
                onValueChange={(value) => {
                  setFilterAssigned(value);
                  setCurrentPage(1);
                }}
                disabled={isBulkSelectionEnabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canAssign && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isBulkSelectionEnabled ? "secondary" : "outline"}
                  onClick={toggleBulkSelection}
                >
                  <ListTodo className="mr-1.5 h-4 w-4" />
                  {isBulkSelectionEnabled ? 'Cancel' : 'Bulk Assign'}
                </Button>

                {isBulkSelectionEnabled && selectedEnquiryIds.length > 0 && (
                  <Button size="sm" onClick={handleBulkAssign}>
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Assign ({selectedEnquiryIds.length})
                  </Button>
                )}
              </div>
            )}
            <Button size="sm" variant="outline">Export</Button>
          </div>
        </CardContent>
      </Card>

      {/* Enquiries Table Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Enquiry List</CardTitle>
              <CardDescription className="text-xs">
                {pagination ? `Showing page ${pagination.page} of ${pagination.pages} (${pagination.total} total)` : 'All customer leads'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && enquiries.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <div className="text-sm text-muted-foreground">Loading enquiries...</div>
              </div>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Search className="size-6" />}
                title="No enquiries found"
                description={search ? 'No enquiries match your current search or filter criteria.' : 'No enquiries available in this view yet.'}
              />
            </div>
          ) : (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              {isMobile ? (
                // Mobile Card View
                <div className="p-4 space-y-3">
                  {enquiries.map((enquiry) => (
                    <EnquiryMobileCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      onView={handleViewEnquiry}
                      onEdit={handleEditEnquiry}
                      onDelete={handleDeleteEnquiry}
                    />
                  ))}
                </div>
              ) : (
                // Desktop Table View
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isBulkSelectionEnabled && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              enquiries.length > 0 &&
                              selectedEnquiryIds.length === enquiries.length
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>Candidate</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Preferred Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enquiries.map((enquiry) => (
                      <TableRow key={enquiry.id}>
                        {isBulkSelectionEnabled && (
                          <TableCell>
                            <Checkbox
                              checked={selectedEnquiryIds.includes(enquiry.id)}
                              onCheckedChange={(checked) =>
                                handleSelectEnquiry(checked as boolean, enquiry.id)
                              }
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <div className="font-semibold text-foreground">{enquiry.candidateName}</div>
                            {enquiry.email && (
                              <div className="text-xs text-muted-foreground">{enquiry.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-foreground">{enquiry.phone}</div>
                          {enquiry.contact2 && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {enquiry.contact2}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {enquiry.preferredCourse?.name || (
                              <span className="text-muted-foreground font-normal italic">Not specified</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={enquiry.status} />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {enquiry.assignedTo?.id === session?.user?.id ? (
                              <span className="font-semibold text-primary">Yourself</span>
                            ) : (
                              enquiry.assignedTo?.name || (
                                <span className="text-muted-foreground italic">Unassigned</span>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {enquiry.assignedBy?.id === session?.user?.id ? (
                              <span className="font-medium text-foreground">Yourself</span>
                            ) : (
                              enquiry.assignedBy?.name || (
                                <span className="italic">N/A</span>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">{formatDate(enquiry.createdAt)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => handleViewEnquiry(enquiry.id)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleEditEnquiry(enquiry)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => router.push(`/proposals/create?enquiryId=${enquiry.id}`)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Create Proposal
                              </DropdownMenuItem>
                              {canAssign && (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => handleAssignEnquiry(enquiry)}
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Assign
                                </DropdownMenuItem>
                              )}
                              {canAssign && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                onClick={() => handleDeleteEnquiry(enquiry.id, enquiry.candidateName)}
                                className="cursor-pointer text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {pagination && (
                <DataTablePagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages || 1}
                  pageSize={pageSize}
                  totalRecords={pagination.total}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - Outside of dropdown to prevent unmounting */}
      {selectedEnquiry && (
        <EnquiryFormDialog
          branches={branches}
          mode="edit"
          enquiry={selectedEnquiry}
          onSuccess={refreshEnquiries}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Delete Dialog - Outside of dropdown to prevent unmounting */}
      {enquiryToDelete && (
        <DeleteEnquiryDialog
          enquiryId={enquiryToDelete.id}
          candidateName={enquiryToDelete.candidateName}
          onSuccess={() => {
            refreshEnquiries();
            setEnquiryToDelete(null);
          }}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        />
      )}

      {/* Assign Dialog */}
      {enquiryToAssign && (
        <AssignEnquiryDialog
          branches={branches}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          enquiryId={enquiryToAssign.id}
          currentAssigneeId={enquiryToAssign.assignedToId}
          candidateName={enquiryToAssign.candidateName}
          fixedBranchId={enquiryToAssign.branchId || undefined}
          fixedBranchName={enquiryToAssign.branchName || undefined}
          onSuccess={refreshEnquiries}
        />
      )}

      {/* Bulk Assign Dialog */}
      {isBulkSelectionEnabled && (
        <AssignEnquiryDialog
          branches={branches}
          open={isBulkAssignDialogOpen}
          onOpenChange={setIsBulkAssignDialogOpen}
          enquiryIds={selectedEnquiryIds}
          fixedBranchId={bulkAssignBranchId || undefined}
          fixedBranchName={branches.find(b => b.id === bulkAssignBranchId)?.name}
          onSuccess={() => {
            refreshEnquiries();
            setIsBulkSelectionEnabled(false);
            setBulkAssignBranchId(null);
          }}
        />
      )}
    </PageContainer>
  );
}
