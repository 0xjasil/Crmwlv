"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Search,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Wrench,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CreditCard,
  FileDown,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  listStudents,
  listServices,
  listServiceBilling,
  totalListing,
  payServiceBilling,
} from "@/server/actions/service-actions";
import { ServiceBillingWithAdmission } from "@/types/service-billing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { z } from "zod";
import dynamic from "next/dynamic";
import { useDebounce } from "@/hooks/use-debounce";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { exportPdf, PdfColumn } from "./service-bill-pdf";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const CreateServiceBillModal = dynamic(() => import("./create-service-bill"), { ssr: false });
const EditServiceBillModal = dynamic(() => import("./update-service-bill"), { ssr: false });
const DeleteServiceBillModal = dynamic(() => import("./delete-service-bill"), { ssr: false });
const PaymentModal = dynamic(() => import("./payment-service-bill"), { ssr: false });

interface Service {
  id: string;
  name: string;
  price: number;
}

const serviceBillSchema = z.object({
  admissionId: z.string().min(1, "Student selection is required"),
  serviceIds: z
    .array(z.string())
    .min(1, "At least one service must be selected"),
});

type ServiceBillForm = z.infer<typeof serviceBillSchema>;
type SortBy = "billDate" | "total";
type SortOrder = "asc" | "desc";

export default function ServiceTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortBy>("billDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [services, setServices] = useState<Service[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [deletingServiceBill, setDeletingServiceBill] =
    useState<ServiceBillingWithAdmission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [editingServiceBill, setEditingServiceBill] =
    useState<ServiceBillingWithAdmission | null>(null);
  const [serviceBills, setServiceBills] = useState<
    ServiceBillingWithAdmission[]
  >([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedService, sortBy, sortOrder, pageSize]);

  // Payment modal states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payingServiceBill, setPayingServiceBill] =
    useState<ServiceBillingWithAdmission | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const serviceBillForm = useForm<ServiceBillForm>({
    resolver: zodResolver(serviceBillSchema),
    defaultValues: {
      admissionId: "",
      serviceIds: [],
    },
  });

  const fetchServiceBillsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listServiceBilling(
        currentPage,
        pageSize,
        debouncedSearch,
        sortBy,
        sortOrder,
        selectedService
      );

      if (result.success && result.data) {
        setServiceBills(result.data.data);
        setPagination({
          page: result.data.pagination.page,
          limit: result.data.pagination.pageSize,
          total: result.data.pagination.total,
          pages: result.data.pagination.pages,
        });
      } else {
        setServiceBills([]);
        setPagination(null);
      }
    } catch (error) {
      console.error("Error fetching service bills:", error);
      setServiceBills([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, sortBy, sortOrder, selectedService]);

  const exportServiceBillsPdf = () => {
    if (!serviceBills || serviceBills.length === 0) {
      toast.error("No data to export");
      return;
    }

    const columns: PdfColumn<ServiceBillingWithAdmission>[] = [
      { header: "Bill ID", key: "id" },
      { header: "Candidate Name", key: (row) => row.admission.candidateName },
      {
        header: "Services",
        key: (row) =>
          row.services?.map((s) => s.name).join(", ") ||
          `${row.serviceIds.length} services`,
      },
      {
        header: "Bill Date",
        key: (row) => new Date(row.billDate).toLocaleDateString("en-US"),
      },
      { header: "Status", key: "status" },
      { header: "Total Amount", key: (row) => row.total.toFixed(2) },
      { header: "Balance", key: (row) => row.balance.toFixed(2) },
    ];

    exportPdf(
      serviceBills,
      columns,
      "service-bills.pdf",
      "Service Bills Report"
    );
  };

  const fetchTotalAmount = async () => {
    try {
      const result = await totalListing();
      if (result.success && result.data) {
        setTotalAmount(result.data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching total amount:", error);
    }
  };

  useEffect(() => {
    fetchTotalAmount();
  }, []);

  const loadFormData = async () => {
    try {
      const [studentsResult, servicesResult] = await Promise.all([
        listStudents(),
        listServices(),
      ]);

      if (studentsResult.success) {
      }
      if (servicesResult.success && servicesResult.data) {
        setServices(servicesResult.data);
      }
    } catch (error) {
      console.error("Failed to load form data", error);
      toast.error("Failed to load form data");
    }
  };

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: SortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/60" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
    );
  };

  useEffect(() => {
    fetchServiceBillsData();
  }, [fetchServiceBillsData]);

  const refreshServiceBills = useCallback(() => {
    fetchServiceBillsData();
    fetchTotalAmount();
  }, [fetchServiceBillsData]);

  const handleViewServiceBill = (serviceBillId: string) => {
    router.push(`/services/${serviceBillId}`);
  };

  const handleEditServiceBill = (serviceBill: ServiceBillingWithAdmission) => {
    setEditingServiceBill(serviceBill);
    serviceBillForm.reset({
      admissionId: serviceBill.admissionId,
      serviceIds: serviceBill.serviceIds,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteServiceBill = (
    serviceBill: ServiceBillingWithAdmission
  ) => {
    setDeletingServiceBill(serviceBill);
    setDeleteDialogOpen(true);
  };

  const handlePayServiceBill = (serviceBill: ServiceBillingWithAdmission) => {
    setPayingServiceBill(serviceBill);
    setPaymentDialogOpen(true);
  };

  const handleProcessPayment = async (amount: number, paymentMode?: string) => {
    if (!payingServiceBill) return;

    setIsProcessingPayment(true);

    try {
      const paymentPayload = {
        id: payingServiceBill.id,
        paid: amount,
        paymentMode: paymentMode,
      };

      const result = await payServiceBilling(paymentPayload);

      if (result.success) {
        toast.success(
          `Payment of ${formatCurrency(amount)} processed successfully!`
        );
        setPaymentDialogOpen(false);
        setPayingServiceBill(null);
        refreshServiceBills();
      } else {
        toast.error(result.message || "Failed to process payment");
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      toast.error("Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    const loadServices = async () => {
      try {
        const servicesResult = await listServices();
        if (servicesResult.success && servicesResult.data) {
          setServices(servicesResult.data);
        }
      } catch (error) {
        toast.error("Failed to load services for filter");
        console.error("Failed to load services for filter", error);
      }
    };

    loadServices();
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleClearFilter = () => {
    setSearch("");
    setSelectedService("");
    setCurrentPage(1);
  };

  const formatServiceTypes = (services?: Array<{ name: string }>) => {
    if (!services || services.length === 0)
      return { names: "No services", originalNames: "No services" };

    const originalserviceNames = services.map((s) => s.name).join(", ");
    const serviceNames = services.map((s) => s.name).join(", ");

    if (serviceNames.length > 30) {
      return {
        names: serviceNames.slice(0, 30) + "...",
        originalNames: originalserviceNames,
      };
    }

    return {
      names: serviceNames,
      originalNames: originalserviceNames,
    };
  };

  return (
    <PageContainer>
      <PageHeader
        title="Service Billing"
        description={`Track service orders, invoices, and collected payments • Billed Volume: ${formatCurrency(totalAmount)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={refreshServiceBills}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportServiceBillsPdf}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export PDF
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
              onClick={() => {
                setDialogOpen(true);
                loadFormData();
              }}
            >
              <Wrench className="h-3.5 w-3.5" />
              Create Service Bill
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate name or bill ID..."
            className="pl-9 h-9 text-xs bg-background"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select
            value={selectedService}
            onValueChange={(value) => {
              setSelectedService(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || (selectedService && selectedService !== "all")) && (
            <Button
              onClick={handleClearFilter}
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Service Bills Table Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Billing Records {pagination?.total ? `(${pagination.total})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && serviceBills.length === 0 ? (
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Bill ID</TableHead>
                    <TableHead>Candidate Name</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead className="w-[110px]">Bill Date</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Total Amount</TableHead>
                    <TableHead className="w-[110px] text-right">Balance</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableSkeletonRows rowCount={5} columnCount={8} />
                </TableBody>
              </Table>
            </div>
          ) : serviceBills.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No service bills found"
              description="Create a service bill for an enrolled candidate to start tracking payments."
              action={
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setDialogOpen(true);
                    loadFormData();
                  }}
                >
                  Create Service Bill
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
                    <TableHead className="w-[120px]">Bill ID</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("billDate")}
                    >
                      <div className="flex items-center">
                        Date
                        {getSortIcon("billDate")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead
                      className="w-[120px] text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("total")}
                    >
                      <div className="flex items-center justify-end">
                        Total
                        {getSortIcon("total")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[110px] text-right">
                      Balance
                    </TableHead>
                    <TableHead className="w-[60px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceBills.map((serviceBill) => (
                    <TableRow
                      key={serviceBill.billId}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => handleViewServiceBill(serviceBill.id)}
                    >
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {serviceBill.billId}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-xs text-foreground">
                          {serviceBill.admission.candidateName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs text-muted-foreground max-w-[200px] truncate block"
                          title={
                            serviceBill.services
                              ? formatServiceTypes(serviceBill.services).originalNames
                              : `${serviceBill.serviceIds.length} services`
                          }
                        >
                          {serviceBill.services
                            ? formatServiceTypes(serviceBill.services).names
                            : `${serviceBill.serviceIds.length} services`}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(serviceBill.billDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={serviceBill.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                        {formatCurrency(serviceBill.total)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        <span
                          className={
                            serviceBill.balance > 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {formatCurrency(serviceBill.balance)}
                        </span>
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
                              onClick={() =>
                                handleViewServiceBill(serviceBill.id)
                              }
                              className="text-xs"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditServiceBill(serviceBill)}
                              className="text-xs"
                            >
                              <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Edit Bill
                            </DropdownMenuItem>
                            {serviceBill.balance > 0 && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handlePayServiceBill(serviceBill)
                                }
                                className="text-xs text-emerald-600 font-medium"
                              >
                                <CreditCard className="mr-2 h-3.5 w-3.5" />
                                Record Payment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteServiceBill(serviceBill)
                              }
                              className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
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

      {payingServiceBill && (
        <PaymentModal
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          customerName={payingServiceBill.admission.candidateName}
          totalAmount={payingServiceBill.total}
          paidAmount={payingServiceBill.paid}
          balance={payingServiceBill.balance}
          onProcessPayment={handleProcessPayment}
          isProcessing={isProcessingPayment}
        />
      )}

      <CreateServiceBillModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refreshServiceBills}
      />
      <EditServiceBillModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        serviceBill={editingServiceBill}
        onSuccess={refreshServiceBills}
      />
      <DeleteServiceBillModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        serviceBill={deletingServiceBill}
        onSuccess={refreshServiceBills}
      />
    </PageContainer>
  );
}
