"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  User,
  FileText,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Building,
  Calendar as CalendarIcon,
  CreditCard,
  AlertCircle,
  Receipt,
  Package,
  Clock,
  XCircle,
  Edit3,
  Trash2,
  Plus,
  Save,
  X,
  History,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  getServiceBillById,
  getServicesByIds,
  getAdmissionHistoryById,
  updateServiceBilling,
  listServices,
  getServiceBillHistory,
  payServiceBilling,
} from "@/server/actions/service-actions";
import { ServiceBilling, ServiceBillItem } from "@/types/service-billing";
import { Service } from "@/types/data-management";
import dynamic from "next/dynamic";

const PaymentModal = dynamic(() => import("@/components/service/payment-service-bill"), { ssr: false });

interface Receipt {
  id: string;
  admissionId: string;
  createdAt: Date;
  updatedAt: Date;
  courseId: string;
  receiptNumber: string;
  amountCollected: number;
  collectedTowards: string;
  paymentMode: string;
  paymentReference?: string;
  remarks?: string;
  createdById: string;
}

interface ServiceBill {
  id: string;
  admissionId: string;
  billDate: Date;
  updatedAt: Date;
  serviceIds: string[];
  total: number;
  paid: number;
  balance: number;
  status: string;
}

interface Admission {
  id: string;
  admissionNumber: string;
  candidateName: string;
  mobileNumber: string;
  email?: string;
  gender?: string;
  dateOfBirth?: Date;
  address: string;
  leadSource?: string;
  lastQualification?: string;
  yearOfPassing?: number;
  percentageCGPA?: string;
  instituteName?: string;
  additionalNotes?: string;
  balance: number;
  nextDueDate?: Date;
  status: string;
  course: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    description: string | null;
    duration: string | null;
    courseFee: number | null;
    admissionFee: number | null;
    semesterFee: number | null;
    isActive: boolean;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  receipts: Receipt[];
  serviceBills: ServiceBill[];
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceBillDetails {
  serviceBill: ServiceBilling;
  services: Service[];
  admission: Admission;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const AdmissionGenderLabels: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

function ServicePage() {
  const params = useParams();
  const { id } = params as { id: string };

  const [serviceBillDetails, setServiceBillDetails] =
    useState<ServiceBillDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [billHistory, setBillHistory] = useState<ServiceBillItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Edit mode states
  const [editServices, setEditServices] = useState<Service[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>(
    []
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Fetch available services for dropdown
  const fetchAvailableServices = async () => {
    try {
      const result = await listServices();
      if (result?.success && result.data) {
        setAvailableServices(result.data);
      }
    } catch (error) {
      console.error("Error fetching available services:", error);
      toast.error("Failed to fetch available services");
    }
  };

  const handleProcessPayment = async (amount: number, paymentMode?: string) => {
    setIsProcessingPayment(true);

    try {
      const paymentPayload = {
        id: serviceBill.id,
        paid: amount,
        paymentMode: paymentMode,
      };

      const result = await payServiceBilling(paymentPayload);

      if (result.success) {
        toast.success(
          `Payment of ${formatCurrency(amount)} processed successfully!`
        );
        setPaymentDialogOpen(false);

        // Refresh the page data
        const serviceBillResult = await getServiceBillById(id);
        if (serviceBillResult?.success && serviceBillResult.data) {
          setServiceBillDetails({
            ...serviceBillDetails!,
            serviceBill: serviceBillResult.data as ServiceBilling,
          });
        }

        // Refresh bill history
        await fetchBillHistory();
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

  const fetchBillHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const result = await getServiceBillHistory(id);
      if (result?.success && result.data) {
        setBillHistory(result.data);
      }
    } catch (error) {
      console.error("Error fetching bill history:", error);
      toast.error("Failed to fetch bill history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDownloadBill = async () => {
    if (!serviceBillDetails) {
      return;
    }
    const { exportServiceBillPdf } = await import("@/components/service/service-bill-detail-pdf");
    exportServiceBillPdf(serviceBillDetails);
  };
  useEffect(() => {
    fetchAvailableServices();
  }, []);

  useEffect(() => {
    const fetchServiceBillDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch service bill
        const serviceBillResult = await getServiceBillById(id);
        if (!serviceBillResult?.success || !serviceBillResult.data) {
          setError("Service bill not found");
          toast.error("Service bill not found");
          return;
        }

        const serviceBill = serviceBillResult.data as ServiceBilling;

        // Fetch services using the serviceIds from the bill
        const servicesResult = await getServicesByIds(serviceBill.serviceIds);
        if (
          !servicesResult ||
          typeof servicesResult !== "object" ||
          !("success" in servicesResult) ||
          !servicesResult.success
        ) {
          setError("Failed to fetch services");
          toast.error("Failed to fetch services");
          return;
        }

        const services = servicesResult.data as Service[];

        // Fetch admission details
        const admissionResult = await getAdmissionHistoryById(
          serviceBill.admissionId
        );
        if (!admissionResult?.success || !admissionResult.data) {
          setError("Failed to fetch admission details");
          toast.error("Failed to fetch admission details");
          return;
        }

        const admission = admissionResult.data as Admission;

        setServiceBillDetails({
          serviceBill,
          services,
          admission,
        });

        // Initialize edit services with current services
        setEditServices(services);

        await fetchBillHistory();
      } catch (err) {
        console.error("Error fetching service bill details:", err);
        const errorMessage =
          "An error occurred while fetching service bill details";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchServiceBillDetails();
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEditMode = () => {
    setIsEditMode(true);
    setEditServices([...serviceBillDetails!.services]);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditServices([...serviceBillDetails!.services]);
  };

  const handleAddService = () => {
    if (!selectedServiceId) {
      toast.error("Please select a service");
      return;
    }

    const serviceToAdd = availableServices.find(
      (s) => s.id === selectedServiceId
    );
    if (!serviceToAdd) {
      toast.error("Service not found");
      return;
    }

    // Check if service already exists
    if (editServices.find((s) => s.id === selectedServiceId)) {
      toast.error("Service already added");
      return;
    }

    setEditServices([...editServices, serviceToAdd as Service]);
    setSelectedServiceId("");
    setIsAddDialogOpen(false);
    toast.success("Service added");
  };

  const handleRemoveService = (serviceId: string) => {
    if (editServices.length <= 1) {
      toast.error("At least one service must remain");
      return;
    }

    setEditServices(editServices.filter((s) => s.id !== serviceId));
    toast.success("Service removed");
  };

  const calculateTotal = (services: Service[]) => {
    return services.reduce((total, service) => total + service.price, 0);
  };

  const handleSaveChanges = async () => {
    if (editServices.length === 0) {
      toast.error("At least one service is required");
      return;
    }

    setIsSaving(true);
    try {
      const newTotal = calculateTotal(editServices);
      const serviceIds = editServices.map((s) => s.id);

      const result = await updateServiceBilling({
        id: serviceBillDetails!.serviceBill.id,
        serviceIds,
      });

      if (result?.success) {
        // Update the state with new data
        setServiceBillDetails({
          ...serviceBillDetails!,
          services: editServices,
          serviceBill: {
            ...serviceBillDetails!.serviceBill,
            total: newTotal,
            serviceIds,
          },
        });

        setIsEditMode(false);
        toast.success("Service bill updated successfully");
      } else {
        toast.error(result?.message || "Failed to update service bill");
      }
    } catch (error) {
      console.error("Error updating service bill:", error);
      toast.error("Failed to update service bill");
    } finally {
      setIsSaving(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !serviceBillDetails) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Service Bill Not Found
            </h3>
            <p className="text-muted-foreground mb-4">
              {error ||
                "The service bill you're looking for doesn't exist or has been removed."}
            </p>
            <Link href="/service-bills">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Service Bills
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { serviceBill, services, admission } = serviceBillDetails;
  const currentServices = isEditMode ? editServices : services;
  const totalAmount = isEditMode
    ? calculateTotal(editServices)
    : serviceBill.total;

  const totalPaid = billHistory.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = serviceBillDetails
    ? serviceBillDetails.serviceBill.total - totalPaid
    : 0;

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/services">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Service Bill Details
            </h1>
            <p className="text-muted-foreground">
              View service bill details and payment information
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
              <CardDescription>
                Details of the student for this service bill
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Student Name
                  </label>
                  <p className="font-medium">{admission.candidateName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Admission Number
                  </label>
                  <p className="font-medium font-mono text-sm">
                    {admission.admissionNumber}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Mobile Number
                  </label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{admission.mobileNumber}</p>
                  </div>
                </div>
                {admission.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{admission.email}</p>
                    </div>
                  </div>
                )}
                {admission.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Gender
                    </label>
                    <p className="font-medium">
                      {AdmissionGenderLabels[admission.gender] ||
                        admission.gender}
                    </p>
                  </div>
                )}
                {admission.dateOfBirth && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {formatDate(admission.dateOfBirth)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Address
                </label>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="font-medium">{admission.address}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Course
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{admission.course.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Services Included
                  </CardTitle>
                  <CardDescription>
                    List of services included in this bill
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditMode ? (
                    <Button
                      onClick={handleEditMode}
                      size="sm"
                      variant="outline"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Services
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSaveChanges}
                        size="sm"
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {currentServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Service ID: {service.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(service.price)}
                        </p>
                      </div>
                      {isEditMode && (
                        <Button
                          onClick={() => handleRemoveService(service.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          disabled={currentServices.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isEditMode && (
                <>
                  <div className="pt-2">
                    <Dialog
                      open={isAddDialogOpen}
                      onOpenChange={setIsAddDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Service
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Service</DialogTitle>
                          <DialogDescription>
                            Select a service to add to this bill
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="service-select">Service</Label>
                            <Select
                              value={selectedServiceId}
                              onValueChange={setSelectedServiceId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a service" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableServices
                                  .filter(
                                    (service) =>
                                      !currentServices.find(
                                        (s) => s.id === service.id
                                      )
                                  )
                                  .map((service) => (
                                    <SelectItem
                                      key={service.id}
                                      value={service.id}
                                    >
                                      <div className="flex justify-between items-center w-full">
                                        <span>{service.name}</span>
                                        <span className="ml-4 font-semibold">
                                          {formatCurrency(service.price)}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsAddDialogOpen(false);
                              setSelectedServiceId("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleAddService}>
                            Add Service
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              )}

              <Separator />

              {/* Total Summary */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                {isEditMode && totalAmount !== serviceBill.total && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Previous Total:
                    </span>
                    <span className="text-muted-foreground line-through">
                      {formatCurrency(serviceBill.total)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing History  */}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                Track of all payments made towards this bill
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : billHistory.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No payment history available
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Payments will appear here once recorded
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {billHistory.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Payment #{billHistory.length - index}
                            </Badge>
                            {item.paymentMode && (
                              <Badge variant="secondary" className="text-xs">
                                {item.paymentMode}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(item.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {/* Payment Summary */}
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        Total Bill Amount:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(serviceBill.total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        Total Paid:
                      </span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(totalPaid)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-base font-medium">
                        Remaining Balance:
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          remainingBalance > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatCurrency(remainingBalance)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Education Information */}
          {(admission.lastQualification || admission.instituteName) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education Details
                </CardTitle>
                <CardDescription>
                  Academic background and qualifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {admission.lastQualification && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Last Qualification
                      </label>
                      <p className="font-medium">
                        {admission.lastQualification}
                      </p>
                    </div>
                  )}
                  {admission.yearOfPassing && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Year of Passing
                      </label>
                      <p className="font-medium">{admission.yearOfPassing}</p>
                    </div>
                  )}
                  {admission.percentageCGPA && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Percentage/CGPA
                      </label>
                      <p className="font-medium">{admission.percentageCGPA}</p>
                    </div>
                  )}
                  {admission.instituteName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Institute Name
                      </label>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{admission.instituteName}</p>
                      </div>
                    </div>
                  )}
                </div>
                {admission.additionalNotes && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Additional Notes
                      </label>
                      <p className="font-medium mt-1">
                        {admission.additionalNotes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Bill Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Bill Summary
                  </CardTitle>
                  <CardDescription>Service bill overview</CardDescription>
                </div>
                {serviceBill.balance > 0 && (
                  <Button
                    onClick={() => setPaymentDialogOpen(true)}
                    className="cursor-pointer"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Make Payment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      Total Amount
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-semibold text-blue-600"
                  >
                    {formatCurrency(totalAmount)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Services Count
                    </span>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    {currentServices.length} service(s)
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Paid Amount
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-semibold text-green-600"
                  >
                    {formatCurrency(serviceBill.paid)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">
                      Balance Amount
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-semibold text-yellow-600"
                  >
                    {formatCurrency(serviceBill.balance)}
                  </Badge>
                </div>

                {admission.balance > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">
                        Student Balance
                      </span>
                    </div>
                    <Badge variant="destructive" className="font-semibold">
                      {formatCurrency(admission.balance + serviceBill.balance)}
                    </Badge>
                  </div>
                )}

                {admission.nextDueDate && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">
                        Next Due Date
                      </span>
                    </div>
                    <Badge variant="outline" className="font-medium">
                      {formatDate(admission.nextDueDate)}
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />

              <Link href={`/admissions/${admission.id}`}>
                <Button className="w-full" variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  View Student Details
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Bill Information */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Bill Information
                </CardTitle>
                <CardDescription>Service bill record details</CardDescription>
              </div>
              <Badge variant="outline" className="font-semibold">
                {serviceBill.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Bill ID
                  </label>
                  <p className="font-medium font-mono text-sm">
                    {serviceBill.billId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Bill Date
                  </label>
                  <p className="font-medium">
                    {formatDate(serviceBill.billDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <p className="font-medium">
                    {formatDate(serviceBill.updatedAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Billed To
                  </label>
                  <p className="font-medium">{admission.candidateName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Total Amount
                  </label>
                  <p className="font-medium">{formatCurrency(totalAmount)}</p>
                </div>
                <Button
                  onClick={handleDownloadBill}
                  className="w-full"
                  variant="outline"
                >
                  <User className="mr-2 h-4 w-4" />
                  Download Bill as PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Payment Modal */}
      <PaymentModal
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customerName={admission.candidateName}
        totalAmount={serviceBill.total}
        paidAmount={serviceBill.paid}
        balance={serviceBill.balance}
        onProcessPayment={handleProcessPayment}
        isProcessing={isProcessingPayment}
      />
    </div>
  );
}

export default ServicePage;
