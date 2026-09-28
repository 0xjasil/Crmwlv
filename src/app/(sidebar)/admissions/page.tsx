"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  GraduationCap,
  RotateCw,
  BookOpen,
  UserCheck,
} from "lucide-react";
import {
  getAdmissions,
  getCoursesForAdmission,
  getEnquirySourcesForAdmission,
  deleteAdmission,
} from "@/server/actions/admission-actions";
import { getEnquiry } from "@/server/actions/enquiry";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { AdmissionWithRelations, AdmissionStatus } from "@/types/admission";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const AdmissionFormDialog = dynamic(
  () => import("@/components/admission-form-dialog").then((mod) => mod.AdmissionFormDialog),
  { ssr: false }
);

import { EnquirySource } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Enquiry } from "@/types/enquiry";

interface SimpleCourse {
  id: string;
  name: string;
  description?: string | null;
  duration?: string | null;
}

type AdmissionListItem = {
  id: string;
  admissionNumber: string;
  candidateName: string;
  mobileNumber: string;
  email: string | null;
  status: AdmissionStatus;
  createdAt: Date;
  course: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  [key: string]: any;
};

export default function AdmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enquiryId = searchParams.get("enquiryId");

  // Get current user session for role-based access control
  const { data: session } = authClient.useSession();

  // Check if current user is admin
  const isAdmin = session?.user?.role === "admin";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | "ALL">(
    "ALL"
  );
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [admissions, setAdmissions] = useState<AdmissionListItem[]>([]);
  const [courses, setCourses] = useState<SimpleCourse[]>([]);
  const [enquirySources, setEnquirySources] = useState<EnquirySource[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset page to 1 when filters or debounced search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, courseFilter, pageSize]);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] =
    useState<AdmissionWithRelations | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [admissionToDelete, setAdmissionToDelete] =
    useState<AdmissionListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Enquiry pre-fill state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [enquiryData, setEnquiryData] = useState<Enquiry | null>(null);
  const [isLoadingEnquiry, setIsLoadingEnquiry] = useState(false);

  // Fetch enquiry data when enquiryId is present
  useEffect(() => {
    const fetchEnquiryData = async () => {
      if (!enquiryId) return;

      setIsLoadingEnquiry(true);
      try {
        const result = await getEnquiry(enquiryId);
        if (result.success) {
          setEnquiryData(result.data as Enquiry);
          setCreateDialogOpen(true);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("enquiryId");
          router.replace(newUrl.pathname, { scroll: false });
        } else {
          toast.error(result.message || "Failed to fetch enquiry data");
        }
      } catch (error) {
        console.error("Error fetching enquiry:", error);
        toast.error("Failed to fetch enquiry data");
      } finally {
        setIsLoadingEnquiry(false);
      }
    };

    fetchEnquiryData();
  }, [enquiryId, router]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const coursesResult = await getCoursesForAdmission();
        if (coursesResult.data?.success) {
          setCourses(coursesResult.data.data || []);
        }

        const enquirySourcesResult = await getEnquirySourcesForAdmission();
        if (enquirySourcesResult.data?.success) {
          setEnquirySources(enquirySourcesResult.data.data || []);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setCourses([]);
        setEnquirySources([]);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch admissions
  const fetchAdmissionsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: {
        page: number;
        limit: number;
        search?: string;
        status?: AdmissionStatus;
        courseId?: string;
      } = {
        page: currentPage,
        limit: pageSize,
      };

      if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (courseFilter !== "ALL") filters.courseId = courseFilter;

      const result = await getAdmissions(filters);

      if (result.data?.success) {
        const data = result.data.data;
        setAdmissions(data.admissions || []);
        setPagination({
          page: data.currentPage,
          limit: pageSize,
          total: data.totalCount,
          pages: data.totalPages,
        });
      } else {
        toast.error(result.serverError || "Failed to fetch admissions");
      }
    } catch (error) {
      console.error("Error fetching admissions:", error);
      toast.error("Failed to fetch admissions");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, courseFilter]);

  useEffect(() => {
    fetchAdmissionsData();
  }, [fetchAdmissionsData]);

  const refreshAdmissions = useCallback(() => {
    fetchAdmissionsData();
  }, [fetchAdmissionsData]);

  const handleViewAdmission = (admissionId: string) => {
    router.push(`/admissions/${admissionId}`);
  };

  const handleEditAdmission = (admission: AdmissionListItem) => {
    if (!isAdmin) {
      toast.error("Access denied. Only administrators can edit admissions.");
      return;
    }
    setSelectedAdmission(admission as unknown as AdmissionWithRelations);
    setEditDialogOpen(true);
  };

  const handleDeleteAdmission = (admission: AdmissionListItem) => {
    if (!isAdmin) {
      toast.error("Access denied. Only administrators can delete admissions.");
      return;
    }
    setAdmissionToDelete(admission);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!admissionToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteAdmission({ id: admissionToDelete.id });

      if (result.data?.success) {
        toast.success(result.data.message || "Admission deleted successfully");
        refreshAdmissions();
        setDeleteDialogOpen(false);
        setAdmissionToDelete(null);
      } else {
        toast.error(result.serverError || "Failed to delete admission");
      }
    } catch (error) {
      console.error("Error deleting admission:", error);
      toast.error("Failed to delete admission");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setCourseFilter("ALL");
    setCurrentPage(1);
  };

  const handleCreateSuccess = () => {
    refreshAdmissions();
    setCreateDialogOpen(false);
    if (enquiryData) {
      toast.success(
        `Admission created successfully for ${enquiryData.candidateName}! Enquiry status updated to Enrolled.`
      );
    }
    setEnquiryData(null);
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Admissions"
        description="Manage enrolled students, academic course assignments, and admission profiles."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={refreshAdmissions}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <AdmissionFormDialog
              courses={courses}
              enquirySources={enquirySources}
              onSuccess={refreshAdmissions}
            />
          </div>
        }
      />

      {/* Enquiry Banner if prefilled */}
      {enquiryData && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
          <UserCheck className="h-4 w-4 shrink-0" />
          <span>
            Converting candidate enquiry: <strong>{enquiryData.candidateName}</strong> ({enquiryData.phone}) into an admission profile.
          </span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate name, mobile number, or admission no..."
            className="pl-9 h-9 text-xs bg-background"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select
            value={courseFilter}
            onValueChange={(value) => {
              setCourseFilter(value);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value: AdmissionStatus | "ALL") => {
              setStatusFilter(value);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {(search || statusFilter !== "ALL" || courseFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Admissions Table */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admission Records {pagination?.total ? `(${pagination.total})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && admissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-xs font-medium text-muted-foreground">Loading admissions...</p>
            </div>
          ) : admissions.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No admissions found"
              description="Create a new student admission or adjust your filter query."
              action={
                <AdmissionFormDialog
                  courses={courses}
                  enquirySources={enquirySources}
                  onSuccess={refreshAdmissions}
                />
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
                    <TableHead className="w-[140px]">Admission No.</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[130px]">Enrolled Date</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admissions.map((admission) => (
                    <TableRow
                      key={admission.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => handleViewAdmission(admission.id)}
                    >
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {admission.admissionNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-foreground">
                            {admission.candidateName}
                          </span>
                          {admission.email && (
                            <span className="text-[11px] text-muted-foreground">
                              {admission.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {admission.mobileNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium text-foreground">
                            {admission.course.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={admission.status || "CONFIRMED"} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(admission.createdAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewAdmission(admission.id)}
                              className="text-xs"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              View Profile
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => handleEditAdmission(admission)}
                                className="text-xs"
                              >
                                <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Edit Admission
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteAdmission(admission)}
                                  className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete Admission
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Create Dialog for Enquiry Pre-fill */}
      {enquiryData && (
        <AdmissionFormDialog
          mode="create"
          courses={courses}
          enquirySources={enquirySources}
          enquiryData={enquiryData}
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setEnquiryData(null);
            }
          }}
          onSuccess={handleCreateSuccess}
          trigger={null}
        />
      )}

      {/* Edit Dialog */}
      {selectedAdmission && (
        <AdmissionFormDialog
          mode="edit"
          admission={selectedAdmission}
          courses={courses}
          enquirySources={enquirySources}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setSelectedAdmission(null);
            }
          }}
          onSuccess={() => {
            refreshAdmissions();
            setEditDialogOpen(false);
            setSelectedAdmission(null);
          }}
          trigger={null}
        />
      )}

      {/* Delete Dialog */}
      {deleteDialogOpen && admissionToDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete Admission Record?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                admission record for{" "}
                <span className="font-semibold text-foreground">
                  {admissionToDelete.candidateName}
                </span>
                .
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600 text-xs text-white"
              >
                {isDeleting ? (
                  <>
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  "Delete Admission"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageContainer>
  );
}
