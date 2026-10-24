import { redirect } from "next/navigation";
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
  IndianRupee,
  CreditCard,
  AlertCircle,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { getAdmissionById } from "@/server/actions/admission-actions";
import { getServiceBillByStudentId } from "@/server/actions/service-actions";
import { toast } from "sonner";
import {
  AdmissionWithRelations,
  AdmissionGenderLabels,
} from "@/types/admission";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getServiceBillHistory } from "@/server/actions/service-actions";
import { Clock } from "lucide-react";
import Link from "next/link";
import { InstallationTimelineCard } from "@/components/installation-timeline-card";

export const dynamic = 'force-dynamic';

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getAdmissionById({ id: id }).catch((error) => {
    console.error("Error fetching admission:", error);
    redirect("/admissions");
  });

  if (!result || !result.data) {
    redirect("/admissions");
  }

  const admission = result.data.data as AdmissionWithRelations;

  // Fetch service billing data
  const serviceBillResult = await getServiceBillByStudentId(id);

  const serviceBill = serviceBillResult.success ? serviceBillResult.data : null;

  const serviceBillHistory = serviceBill
    ? await getServiceBillHistory(serviceBill.id)
    : { success: false, data: [] };

  // Parse documents and residence type from additionalNotes
  let parsedDocuments: {
    residenceType?: "independent" | "flat" | "commercial";
    documents?: Record<string, string>;
    notes?: string;
  } | null = null;

  if (admission.additionalNotes) {
    try {
      const parsed = JSON.parse(admission.additionalNotes);
      if (parsed && typeof parsed === "object") {
        parsedDocuments = parsed;
      }
    } catch {
      // Legacy plain text
    }
  }

  const DOC_METADATA_MAP: Record<string, { label: string; isFlatOnly?: boolean }> = {
    aadhaar: { label: "Aadhaar Card" },
    panCard: { label: "PAN Card" },
    bankPassbook: { label: "Bank Passbook / Cheque" },
    ksebBill: { label: "KSEB Electricity Bill" },
    landTax: { label: "Land Tax Receipt" },
    buildingTax: { label: "Building Tax Receipt" },
    vendorAgreement: { label: "Vendor Agreement" },
    flatNoc: { label: "Flat Association NOC", isFlatOnly: true },
    roofRights: { label: "Terrace / Roof Rights", isFlatOnly: true },
  };

  if (!admission) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Installation Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The solar installation you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Link href="/admissions">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Installations
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admissions">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Pre-Installation Survey: {admission.admissionNumber}
            </h1>
            <p className="text-muted-foreground text-sm">
              Customer site feasibility, KYC documentation, and installation progress timeline
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Installation Progress Timeline & Creation Time */}
          <InstallationTimelineCard
            admissionId={admission.id}
            createdAt={admission.createdAt}
            createdByUserName={admission.createdBy?.name}
            currentStatus={admission.status}
            additionalNotes={admission.additionalNotes}
            isAdmin={true}
          />

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Customer Information
              </CardTitle>
              <CardDescription>
                Customer&apos;s contact details and installation site address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Customer Name
                  </label>
                  <p className="font-semibold text-foreground text-base">{admission.candidateName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Gender
                  </label>
                  <p className="font-medium">
                    {admission.gender &&
                      AdmissionGenderLabels[admission.gender] || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Mobile Number
                  </label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium font-mono">{admission.mobileNumber}</p>
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
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Date of Birth
                  </label>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {admission.dateOfBirth
                        ? formatDate(admission.dateOfBirth)
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Installation Site Address
                </label>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="font-medium">{admission.address}</p>
                </div>
              </div>
              {admission.leadSource && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Lead Source
                  </label>
                  <p className="font-medium">{admission.leadSource}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* KYC & Project Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  KYC & Site Documents
                </CardTitle>
                <CardDescription>
                  Customer identity proofs, tax receipts, and agreement records
                </CardDescription>
              </div>
              {parsedDocuments?.residenceType && (
                <Badge variant="outline" className="capitalize text-xs">
                  Residence: {parsedDocuments.residenceType}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {parsedDocuments && parsedDocuments.documents ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(DOC_METADATA_MAP)
                    .filter(([key, meta]) => {
                      if (meta.isFlatOnly && parsedDocuments?.residenceType !== "flat") {
                        return false;
                      }
                      return true;
                    })
                    .map(([key, meta]) => {
                      const url = parsedDocuments?.documents?.[key];
                      const isLinked = Boolean(url);

                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            isLinked
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-muted/30 border-border/60"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-xs text-foreground">{meta.label}</p>
                            <span className="text-[11px] text-muted-foreground">
                              {isLinked ? "Document uploaded" : "Not uploaded"}
                            </span>
                          </div>
                          {isLinked ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1">
                                <ExternalLink className="h-3 w-3" />
                                View
                              </Button>
                            </a>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Pending
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : admission.additionalNotes ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Site Notes
                  </label>
                  <p className="font-medium mt-1">{admission.additionalNotes}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No documents have been uploaded for this installation yet.
                </p>
              )}

              {parsedDocuments?.notes && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Site / Rooftop Notes
                    </label>
                    <p className="font-medium mt-1 text-sm">{parsedDocuments.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Legacy Education Details if present */}
          {admission.lastQualification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  Additional Profile Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Qualification
                    </label>
                    <p className="font-medium">{admission.lastQualification}</p>
                  </div>
                  {admission.instituteName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Institute Name
                      </label>
                      <p className="font-medium">{admission.instituteName}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Capacity Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-500" />
                Required Solar Capacity & Specifications
              </CardTitle>
              <CardDescription>
                Solar system capacity, inverter specifications, and installation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    System Capacity
                  </label>
                  <p className="font-semibold text-lg text-foreground">{admission.course.name}</p>
                </div>
                {admission.course.duration && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Warranty / Timeline
                    </label>
                    <p className="font-medium">{admission.course.duration}</p>
                  </div>
                )}
              </div>
              {admission.course.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    System Specifications
                  </label>
                  <p className="font-medium mt-1 text-sm">
                    {admission.course.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Histry  */}
          {serviceBill &&
            serviceBillHistory.success &&
            serviceBillHistory.data &&
            serviceBillHistory.data.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Service Payment History
                  </CardTitle>
                  <CardDescription>
                    Transaction history for service billing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {serviceBillHistory.data.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          index === 0
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <IndianRupee className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-lg">
                              {formatCurrency(item.amount)}
                            </span>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Latest
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>{formatDate(item.createdAt)}</span>
                            </div>
                            {item.paymentMode && (
                              <div className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                <span>{item.paymentMode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {serviceBillHistory.data.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No payment history available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
         {/* Course Fees & Receipts */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <FileText className="h-5 w-5" />
      Course Fees & Receipts
    </CardTitle>
    <CardDescription>Payment and receipt details</CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* Fee Summary */}
    <div className="grid grid-cols-1 gap-4">
      {/* Balance */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Balance</span>
        </div>
        <Badge
          variant={admission.balance > 0 ? "destructive" : "secondary"}
          className="font-semibold"
        >
          {formatCurrency(admission.balance)}
        </Badge>
      </div>

      {/* Agent Info (Optional) */}
      {admission?.agentName && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Agent Name
            </span>
          </div>
          <Badge variant="outline" className="font-medium">
            {admission.agentName}
          </Badge>
        </div>
      )}

      {admission?.agentCommission != null && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Agent Commission
            </span>
          </div>
          <Badge variant="secondary" className="font-semibold">
            {formatCurrency(admission.agentCommission)}
          </Badge>
        </div>
      )}

      {/* Next Due Date */}
      {admission?.nextDueDate && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Next Due</span>
          </div>
          <Badge variant="outline" className="font-medium">
            {formatDate(admission.nextDueDate)}
          </Badge>
        </div>
      )}
    </div>

    <Separator />

    <Link href={`/admissions/${admission.id}/payments`}>
      <Button className="w-full">
        <IndianRupee className="mr-2 h-4 w-4" />
        View Payment Details
      </Button>
    </Link>
  </CardContent>
</Card>


          {/* Service Billing */}
          {serviceBill && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Service Billing
                </CardTitle>
                <CardDescription>
                  Additional services and charges
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service Bill Summary */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        Bill ID
                      </span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {serviceBill.billId}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Total Amount
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(serviceBill.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Paid
                      </span>
                    </div>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(serviceBill.paid)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">
                        Balance
                      </span>
                    </div>
                    <Badge
                      variant={
                        serviceBill.balance > 0 ? "destructive" : "secondary"
                      }
                      className="font-semibold"
                    >
                      {formatCurrency(serviceBill.balance)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Status
                      </span>
                    </div>
                    <Badge
                      variant={
                        serviceBill.status === "PAID"
                          ? "default"
                          : serviceBill.status === "PARTIALLY_PAID"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {serviceBill.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Bill Date
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatDate(serviceBill.billDate)}
                    </span>
                  </div>
                </div>

                <Separator />

                <Link href={`/services/${serviceBill.id}`}>
                  <Button className="w-full" variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Service Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Survey & Project Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pre-Installation Record
              </CardTitle>
              <CardDescription>Survey audit & creation details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Survey / Project ID
                  </label>
                  <p className="font-medium font-mono text-sm">
                    {admission.admissionNumber}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created Date
                  </label>
                  <p className="font-medium">
                    {formatDate(admission.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created By
                  </label>
                  <p className="font-medium">{admission.createdBy.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <p className="font-medium">
                    {formatDate(admission.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
