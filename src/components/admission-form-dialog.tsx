"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "next-safe-action/hooks";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Plus,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  User,
  Eye,
  Camera,
  Upload,
  ExternalLink,
  X,
  FileText,
  Building,
  Home,
  Building2,
  Zap,
  Loader2,
  Paperclip,
  Check,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { format } from "date-fns";
import { DateOfBirthPicker } from "./dob-picker";
import { Textarea } from "./ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";
import { EnquirySource } from "@prisma/client";
import { AdmissionWithRelations, AdmissionGender } from "@/types/admission";
import {
  createAdmission,
  updateAdmission,
} from "@/server/actions/admission-actions";
import { uploadDocumentFile } from "@/server/actions/upload-actions";
import { CameraCaptureDialog } from "@/components/camera-capture-dialog";
import { updateEnquiryStatus } from "@/server/actions/enquiry";
import { EnquiryStatus } from "@/types/enquiry";
import { toast } from "sonner";
import { Enquiry } from "@/types/enquiry";
import { authClient } from "@/lib/auth-client";

interface SimpleCourse {
  id: string;
  name: string;
  description?: string | null;
  duration?: string | null;
  courseFee?: number | null;
  admissionFee?: number | null;
  semesterFee?: number | null;
}

interface AdmissionFormDialogProps {
  courses: SimpleCourse[];
  enquirySources: EnquirySource[];
  mode?: "create" | "edit";
  admission?: AdmissionWithRelations;
  enquiryData?: Enquiry;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export type DocumentKey =
  | "aadhaar"
  | "panCard"
  | "bankPassbook"
  | "ksebBill"
  | "landTax"
  | "buildingTax"
  | "vendorAgreement"
  | "flatNoc"
  | "roofRights";

export interface InstallationDocuments {
  aadhaar?: string;
  panCard?: string;
  bankPassbook?: string;
  ksebBill?: string;
  landTax?: string;
  buildingTax?: string;
  vendorAgreement?: string;
  flatNoc?: string;
  roofRights?: string;
}

const DOCUMENT_FIELDS: {
  key: DocumentKey;
  label: string;
  description: string;
  isFlatOnly?: boolean;
}[] = [
  {
    key: "aadhaar",
    label: "Aadhaar Card",
    description: "Customer Aadhaar front/back identity proof",
  },
  {
    key: "panCard",
    label: "PAN Card",
    description: "Customer PAN card for tax & project documentation",
  },
  {
    key: "bankPassbook",
    label: "Bank Passbook / Cheque",
    description: "Bank details with IFSC code for solar DBT subsidy transfer",
  },
  {
    key: "ksebBill",
    label: "KSEB Electricity Bill",
    description: "Latest electricity bill showing consumer number & connected load",
  },
  {
    key: "landTax",
    label: "Land Tax Receipt",
    description: "Latest Land Tax Receipt / Thandapper record",
  },
  {
    key: "buildingTax",
    label: "Building Tax Receipt",
    description: "Latest Municipal / Panchayat property tax receipt",
  },
  {
    key: "vendorAgreement",
    label: "Vendor Agreement",
    description: "Signed solar project agreement between customer and vendor",
  },
  {
    key: "flatNoc",
    label: "Flat Association NOC",
    description: "NOC from Flat Owners / Residents Association for rooftop solar installation",
    isFlatOnly: true,
  },
  {
    key: "roofRights",
    label: "Terrace / Roof Rights Document",
    description: "Document / deed proving roof ownership or common roof rights",
    isFlatOnly: true,
  },
];

// Comprehensive validation schema using Zod
const admissionFormSchema = z.object({
  // Customer Details (Step 1)
  candidateName: z
    .string()
    .min(1, "Customer name is required")
    .max(100, "Name must be less than 100 characters"),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(15, "Mobile number must be less than 15 digits")
    .regex(/^[+]?[\d\s-()]+$/, "Please enter a valid mobile number"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  gender: z
    .nativeEnum(AdmissionGender, {
      errorMap: () => ({ message: "Please select a gender" }),
    })
    .optional(),
  agentName: z.string().optional(),
  agentCommission: z.number().min(0).optional(),
  dateOfBirth: z.date().optional(),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be less than 500 characters"),
  leadSource: z
    .string()
    .optional()
    .or(z.literal("")),
  createdAt: z.date().optional(),

  // Legacy fields kept optional for backward compatibility
  lastQualification: z.string().optional(),
  yearOfPassing: z.number().optional(),
  percentageCGPA: z.string().optional(),
  instituteName: z.string().optional(),
  additionalNotes: z.string().optional(),

  // Capacity Details (Step 3)
  courseId: z.string().min(1, "Please select a required capacity"),
});

type AdmissionFormValues = z.infer<typeof admissionFormSchema>;

export function AdmissionFormDialog({
  courses,
  enquirySources,
  mode = "create",
  admission,
  enquiryData,
  onSuccess,
  trigger,
  open,
  onOpenChange,
}: AdmissionFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [roleMatch, setRoleMatch] = useState(false);

  // Document upload & residence states
  const [residenceType, setResidenceType] = useState<"independent" | "flat" | "commercial">("independent");
  const [documents, setDocuments] = useState<InstallationDocuments>({});
  const [documentNotes, setDocumentNotes] = useState<string>("");
  const [uploadingDoc, setUploadingDoc] = useState<DocumentKey | null>(null);
  const [activeCameraField, setActiveCameraField] = useState<{
    key: DocumentKey;
    label: string;
  } | null>(null);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const cameraInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const isRoleMatch = async () => {
    const { data } = await authClient.getSession();
    const role = data?.user?.role || null;
    const roles = ["admin", "manager", "counsellor"];
    return roles.includes(role?.toLowerCase() || "");
  };

  useEffect(() => {
    let mounted = true;
    isRoleMatch().then((res) => {
      if (mounted) setRoleMatch(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const totalSteps = 4;
  const stepTitles = [
    "Customer Details",
    "Upload Documents",
    "Required Capacity",
    "Review & Confirm",
  ];
  const stepIcons = [User, FileText, Zap, Eye];

  // Parse existing documents from additionalNotes if available
  useEffect(() => {
    if (isOpen) {
      const sourceNotes = admission?.additionalNotes || enquiryData?.notes || "";
      if (sourceNotes) {
        try {
          const parsed = JSON.parse(sourceNotes);
          if (parsed && typeof parsed === "object") {
            setResidenceType(parsed.residenceType || "independent");
            setDocuments(parsed.documents || {});
            setDocumentNotes(parsed.notes || "");
            return;
          }
        } catch {
          // Plain string legacy notes
          setDocumentNotes(sourceNotes);
        }
      } else {
        setResidenceType("independent");
        setDocuments({});
        setDocumentNotes("");
      }
    }
  }, [isOpen, admission, enquiryData]);

  // Form setup with Zod validation
  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      candidateName:
        admission?.candidateName || enquiryData?.candidateName || "",
      mobileNumber: admission?.mobileNumber || enquiryData?.phone || "",
      email: admission?.email || enquiryData?.email || "",
      gender: admission?.gender || undefined,
      dateOfBirth: admission?.dateOfBirth
        ? new Date(admission.dateOfBirth)
        : undefined,
      address: admission?.address || enquiryData?.address || "",
      leadSource:
        admission?.leadSource || enquiryData?.enquirySource?.name || "",
      lastQualification: admission?.lastQualification || "",
      yearOfPassing: admission?.yearOfPassing || undefined,
      percentageCGPA: admission?.percentageCGPA || "",
      instituteName: admission?.instituteName || "",
      additionalNotes: admission?.additionalNotes || "",
      courseId: admission?.courseId || enquiryData?.preferredCourse?.id || "",
      createdAt: admission?.createdAt
        ? new Date(admission.createdAt)
        : new Date(),
      agentName: admission?.agentName || "",
      agentCommission: admission?.agentCommission || 0,
    },
    mode: "onChange",
  });

  // Use next-safe-action hooks
  const { execute: executeCreate, isExecuting: isExecutingCreate } = useAction(
    createAdmission,
    {
      onSuccess: async ({ data }) => {
        if (data?.success) {
          toast.success(data.message || "Pre-installation survey saved successfully!");

          if (enquiryData && enquiryData.id) {
            try {
              const enquiryUpdateResult = await updateEnquiryStatus(
                enquiryData.id,
                EnquiryStatus.ENROLLED
              );
              if (enquiryUpdateResult.success) {
                toast.success("Enquiry status updated to Enrolled / Converted");
              }
            } catch (error) {
              console.error("Error updating enquiry status:", error);
            }
          }

          setIsOpen(false);
          setCurrentStep(0);
          form.reset();
          onSuccess?.();
        }
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Failed to create installation. Please try again."
        );
      },
      onSettled: ({ result }) => {
        if (result?.validationErrors) {
          Object.entries(result.validationErrors).forEach(([field, errors]) => {
            if (
              errors &&
              typeof errors === "object" &&
              "_errors" in errors &&
              Array.isArray(errors._errors) &&
              errors._errors[0]
            ) {
              form.setError(field as keyof AdmissionFormValues, {
                message: errors._errors[0],
              });
            }
          });
        }
      },
    }
  );

  const { execute: executeUpdate, isExecuting: isExecutingUpdate } = useAction(
    updateAdmission,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success(data.message || "Pre-installation survey updated successfully!");
          setIsOpen(false);
          setCurrentStep(0);
          form.reset();
          onSuccess?.();
        }
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Failed to update pre-installation survey. Please try again."
        );
      },
      onSettled: ({ result }) => {
        if (result?.validationErrors) {
          Object.entries(result.validationErrors).forEach(([field, errors]) => {
            if (
              errors &&
              typeof errors === "object" &&
              "_errors" in errors &&
              Array.isArray(errors._errors) &&
              errors._errors[0]
            ) {
              form.setError(field as keyof AdmissionFormValues, {
                message: errors._errors[0],
              });
            }
          });
        }
      },
    }
  );

  const isExecuting = mode === "create" ? isExecutingCreate : isExecutingUpdate;

  // Reset form with enquiry data when enquiry data changes
  useEffect(() => {
    if (enquiryData && isOpen) {
      form.reset({
        candidateName: enquiryData.candidateName || "",
        mobileNumber: enquiryData.phone || "",
        email: enquiryData.email || "",
        gender: undefined,
        dateOfBirth: undefined,
        address: enquiryData.address || "",
        leadSource: enquiryData.enquirySource?.name || "",
        lastQualification: "",
        yearOfPassing: undefined,
        percentageCGPA: "",
        instituteName: "",
        additionalNotes: "",
        courseId: enquiryData.preferredCourse?.id || "",
        createdAt: new Date(),
        agentName: "",
        agentCommission: 0,
      });
    }
  }, [enquiryData, isOpen, form]);

  const watchedCourseId = form.watch("courseId");
  const selectedCourse = courses.find((course) => course.id === watchedCourseId);
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Document upload handler
  const handleUploadFile = async (docKey: DocumentKey, file: File) => {
    try {
      setUploadingDoc(docKey);
      const formData = new FormData();
      formData.append("file", file);

      const data = await uploadDocumentFile(formData);

      if (data.success && data.url) {
        const finalUrl = data.url.startsWith("http")
          ? data.url
          : `${window.location.origin}${data.url}`;
        setDocuments((prev) => ({ ...prev, [docKey]: finalUrl }));
        const docInfo = DOCUMENT_FIELDS.find((d) => d.key === docKey);
        toast.success(`${docInfo?.label || "Document"} uploaded successfully!`);
      } else {
        toast.error(data.error || "Failed to upload document");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed. You can also paste an external link.");
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDocumentUrlChange = (docKey: DocumentKey, url: string) => {
    setDocuments((prev) => ({
      ...prev,
      [docKey]: url,
    }));
  };

  const handleClearDocument = (docKey: DocumentKey) => {
    setDocuments((prev) => {
      const updated = { ...prev };
      delete updated[docKey];
      return updated;
    });
  };

  // Step validation functions
  const validateStep = async (stepIndex: number): Promise<boolean> => {
    const fieldsToValidate: { [key: number]: (keyof AdmissionFormValues)[] } = {
      0: [
        "candidateName",
        "mobileNumber",
        "email",
        "gender",
        "dateOfBirth",
        "address",
        "leadSource",
      ],
      1: [], // Document upload step is non-blocking
      2: ["courseId"],
    };

    const fields = fieldsToValidate[stepIndex];
    if (!fields || fields.length === 0) return true;

    const result = await form.trigger(fields);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      return;
    }

    let canProceed = true;
    for (let i = currentStep; i < stepIndex; i++) {
      const isStepValid = await validateStep(i);
      if (!isStepValid) {
        canProceed = false;
        break;
      }
    }

    if (canProceed) {
      setCurrentStep(stepIndex);
    }
  };

  const isCommissionValid = () => {
    if (!selectedCourse || !roleMatch) return true;
    const commission = form.getValues("agentCommission") || 0;
    if (commission === 0 || !commission) return true;
    const totalFee =
      (selectedCourse?.admissionFee || 0) +
      (selectedCourse?.courseFee || 0) +
      (selectedCourse?.semesterFee || 0);
    return commission <= totalFee;
  };

  // Form submission
  const onSubmit = async (data: AdmissionFormValues) => {
    if (!isCommissionValid()) {
      toast.error("Agent discount should be less than or equal to total price.");
      return;
    }

    let existingTimelineStep = "SURVEY_COMPLETED";
    if (mode === "edit" && admission?.additionalNotes) {
      try {
        const parsed = JSON.parse(admission.additionalNotes);
        if (parsed?.timelineStep) existingTimelineStep = parsed.timelineStep;
      } catch {
        // legacy
      }
    }

    // Serialize documents & residence type into additionalNotes
    const serializedDocuments = JSON.stringify({
      residenceType,
      documents,
      notes: documentNotes || "",
      timelineStep: existingTimelineStep,
      surveyDate: new Date().toISOString(),
    });

    if (mode === "create") {
      const createData: {
        candidateName: string;
        mobileNumber: string;
        address: string;
        courseId: string;
        email?: string;
        gender?: AdmissionGender;
        dateOfBirth?: Date;
        leadSource?: string;
        lastQualification?: string;
        yearOfPassing?: number;
        percentageCGPA?: string;
        instituteName?: string;
        additionalNotes?: string;
        createdAt?: Date;
        agentName?: string;
        agentCommission?: number;
        enquiryId?: string;
      } = {
        candidateName: data.candidateName,
        mobileNumber: data.mobileNumber,
        address: data.address,
        courseId: data.courseId,
        email: data.email || undefined,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        leadSource: data.leadSource,
        lastQualification: data.lastQualification || undefined,
        yearOfPassing: data.yearOfPassing || undefined,
        percentageCGPA: data.percentageCGPA || undefined,
        instituteName: data.instituteName || undefined,
        additionalNotes: serializedDocuments,
        createdAt: data.createdAt || new Date(),
        agentName: undefined,
        agentCommission: undefined,
        enquiryId: enquiryData?.id || undefined,
      };

      if (roleMatch) {
        if (data.agentName) createData.agentName = data.agentName;
        if (data.agentCommission !== undefined)
          createData.agentCommission = data.agentCommission;
      }

      executeCreate(createData);
    } else {
      if (!admission?.id) {
        toast.error("No installation record ID found for update");
        return;
      }

      const updateData: {
        id: string;
        candidateName?: string;
        mobileNumber?: string;
        email?: string | undefined;
        gender?: AdmissionGender | undefined;
        dateOfBirth?: Date | undefined;
        address?: string;
        leadSource?: string | undefined;
        lastQualification?: string | undefined;
        yearOfPassing?: number | undefined;
        percentageCGPA?: string | undefined;
        instituteName?: string | undefined;
        additionalNotes?: string | undefined;
        createdAt?: Date | undefined;
        courseId?: string | undefined;
        agentName?: string | undefined;
        agentCommission?: number | undefined;
      } = {
        id: admission.id,
        candidateName: data.candidateName,
        mobileNumber: data.mobileNumber,
        email: data.email || undefined,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        leadSource: data.leadSource,
        lastQualification: data.lastQualification,
        yearOfPassing: data.yearOfPassing,
        percentageCGPA: data.percentageCGPA,
        instituteName: data.instituteName,
        additionalNotes: serializedDocuments,
        createdAt: data.createdAt,
        courseId: data.courseId,
      };

      if (roleMatch) {
        if (data.agentName !== undefined)
          updateData.agentName = data.agentName ?? undefined;
        if (data.agentCommission !== undefined)
          updateData.agentCommission = data.agentCommission;
      }
      executeUpdate(updateData);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isExecuting) {
      setCurrentStep(0);
      form.reset();
    }
    setIsOpen(newOpen);
  };

  // Filtered documents list based on residence type
  const activeDocumentFields = DOCUMENT_FIELDS.filter((doc) => {
    if (doc.isFlatOnly && residenceType !== "flat") {
      return false;
    }
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {mode === "edit" ? "Edit Survey" : "New Site Survey"}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {mode === "edit" ? "Edit Pre-Installation Survey" : "Pre-Installation Site Survey"}
            {enquiryData && (
              <Badge variant="secondary" className="font-normal text-xs ml-2">
                from enquiry
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {enquiryData
              ? `Site survey and pre-installation KYC verification for ${enquiryData.candidateName}.`
              : "Complete site feasibility, customer details, and KYC documents before solar installation."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="pt-3 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}: {stepTitles[currentStep]}
            </span>
            <span className="text-xs font-semibold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Step Navigation Pill Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {stepTitles.map((title, index) => {
            const StepIcon = stepIcons[index];
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleStepClick(index)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-left transition-all text-xs font-medium border",
                  isCurrent &&
                    "bg-primary/10 border-primary text-primary font-semibold shadow-xs",
                  isCompleted &&
                    "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                  !isCurrent && !isCompleted && "bg-muted/40 border-border text-muted-foreground hover:bg-muted/70"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs",
                    isCompleted && "bg-emerald-600 text-white",
                    isCurrent && "bg-primary text-primary-foreground",
                    !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                </div>
                <span className="truncate hidden sm:inline">{title}</span>
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Step 1: Customer Details */}
              {currentStep === 0 && (
                <Card className="border-border/70 shadow-xs">
                  <CardHeader className="py-3 px-4 border-b bg-muted/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Customer Information
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enter the customer details and installation site address
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="createdAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-medium">Installation / Registration Date</FormLabel>
                          <FormControl>
                            <DateOfBirthPicker
                              id="registration-date"
                              placeholder="Select registration date"
                              value={field.value}
                              onChange={field.onChange}
                              captionLayout="dropdown"
                              className={cn(
                                "w-full h-9 text-xs",
                                !field.value && "text-muted-foreground"
                              )}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="candidateName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">
                              Customer Name *
                              {enquiryData?.candidateName && (
                                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter customer full name"
                                className="h-9 text-xs"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mobileNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">
                              Mobile Number *
                              {enquiryData?.phone && (
                                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+91 9876543210"
                                className="h-9 text-xs"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">
                              Email Address
                              {enquiryData?.email && (
                                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="customer@example.com"
                                className="h-9 text-xs"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Gender (Optional)</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full h-9 text-xs">
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={AdmissionGender.MALE}>Male</SelectItem>
                                <SelectItem value={AdmissionGender.FEMALE}>Female</SelectItem>
                                <SelectItem value={AdmissionGender.OTHER}>Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-medium">Date of Birth (Optional)</FormLabel>
                            <FormControl>
                              <DateOfBirthPicker
                                id="customer-dob"
                                placeholder="Select date of birth (optional)"
                                value={field.value}
                                onChange={field.onChange}
                                captionLayout="dropdown"
                                startMonth={new Date(1930, 0, 1)}
                                endMonth={new Date(2050, 11, 31)}
                                className={cn(
                                  "w-full h-9 text-xs",
                                  !field.value && "text-muted-foreground"
                                )}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="leadSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">
                              Lead Source
                              {enquiryData?.enquirySource?.name && (
                                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full h-9 text-xs">
                                  <SelectValue placeholder="Select lead source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {enquirySources.map((source) => (
                                  <SelectItem key={source.id} value={source.name}>
                                    {source.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">
                            Installation Site Address *
                            {enquiryData?.address && (
                              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                                From enquiry
                              </Badge>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter complete building address, house/flat name, street, pincode"
                              className="resize-none text-xs min-h-[70px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Upload Documents (KYC & Site Documents) */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Residence Type Selector */}
                  <Card className="border-border/70 shadow-xs">
                    <CardHeader className="py-2.5 px-4 border-b bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-semibold">Residence / Property Type</CardTitle>
                          <CardDescription className="text-[11px]">
                            Select property type to adjust required rooftop documentation
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {residenceType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setResidenceType("independent")}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer",
                            residenceType === "independent"
                              ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                              : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                          )}
                        >
                          <Home className="h-5 w-5 mb-1 text-primary" />
                          <span className="text-xs">Individual House</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Villa / Residential</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setResidenceType("flat")}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer",
                            residenceType === "flat"
                              ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                              : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                          )}
                        >
                          <Building2 className="h-5 w-5 mb-1 text-primary" />
                          <span className="text-xs">Apartment / Flat</span>
                          <span className="text-[10px] text-muted-foreground font-normal">NOC & Roof Rights</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setResidenceType("commercial")}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer",
                            residenceType === "commercial"
                              ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                              : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                          )}
                        >
                          <Building className="h-5 w-5 mb-1 text-primary" />
                          <span className="text-xs">Commercial</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Business / Factory</span>
                        </button>
                      </div>

                      {residenceType === "flat" && (
                        <div className="mt-2.5 p-2 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span>
                            <strong>Apartment / Flat mode active:</strong> Flat Association NOC & Terrace/Roof Rights documents are enabled below.
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Document Uploads Grid */}
                  <Card className="border-border/70 shadow-xs">
                    <CardHeader className="py-2.5 px-4 border-b bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                            <Upload className="h-3.5 w-3.5 text-primary" />
                            KYC & Project Documents
                          </CardTitle>
                          <CardDescription className="text-[11px]">
                            Upload photos/files or store as link format (Google Drive, Cloud storage, etc.)
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {Object.keys(documents).filter((k) => !!documents[k as DocumentKey]).length} / {activeDocumentFields.length} linked
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      {activeDocumentFields.map((field) => {
                        const currentUrl = documents[field.key] || "";
                        const isUploading = uploadingDoc === field.key;
                        const hasDocument = Boolean(currentUrl.trim());

                        return (
                          <div
                            key={field.key}
                            className={cn(
                              "p-3 rounded-lg border transition-all text-xs",
                              hasDocument
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-border/70 bg-card hover:border-border"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground text-xs">{field.label}</span>
                                {field.isFlatOnly && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-blue-600 border-blue-400">
                                    Flat Required
                                  </Badge>
                                )}
                              </div>
                              {hasDocument ? (
                                <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0 gap-1 border-0">
                                  <Check className="h-3 w-3" />
                                  Linked
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">Optional</span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mb-2">{field.description}</p>

                            {/* Dual action upload & link controls */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              {/* Direct Link Input */}
                              <div className="relative flex-1">
                                <Input
                                  placeholder="Document link (or file URL)..."
                                  value={currentUrl}
                                  onChange={(e) => handleDocumentUrlChange(field.key, e.target.value)}
                                  className="h-8 text-xs font-mono pr-7"
                                />
                                {hasDocument && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearDocument(field.key)}
                                    title="Remove document link"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500 transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Action Buttons: Camera, File, and Preview */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isUploading}
                                  onClick={() => setActiveCameraField({ key: field.key, label: field.label })}
                                  className="h-8 px-2.5 text-xs gap-1.5 font-medium"
                                  title="Take photo using camera"
                                >
                                  <Camera className="h-3.5 w-3.5 text-primary" />
                                  <span>Camera</span>
                                </Button>

                                {/* Hidden File Input */}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  ref={(el) => {
                                    fileInputRefs.current[field.key] = el;
                                  }}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadFile(field.key, file);
                                    e.target.value = "";
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isUploading}
                                  onClick={() => fileInputRefs.current[field.key]?.click()}
                                  className="h-8 px-2.5 text-xs gap-1.5"
                                  title="Browse and upload document file (image or PDF)"
                                >
                                  {isUploading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <span>Upload</span>
                                </Button>

                                {/* View Link Button */}
                                {hasDocument && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => window.open(currentUrl, "_blank", "noopener,noreferrer")}
                                    className="h-8 px-2 text-xs gap-1"
                                    title="Open document in new tab"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>View</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Extra site/roof notes */}
                      <div className="pt-2">
                        <label className="text-xs font-medium text-foreground block mb-1">
                          Site & Document Notes (Optional)
                        </label>
                        <Textarea
                          placeholder="Special rooftop notes, electricity connection type, sanction load notes, etc."
                          value={documentNotes}
                          onChange={(e) => setDocumentNotes(e.target.value)}
                          className="text-xs min-h-[60px]"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* WhatsApp-Style In-App Camera Viewfinder Dialog */}
                  {activeCameraField && (
                    <CameraCaptureDialog
                      open={Boolean(activeCameraField)}
                      onOpenChange={(isOpen) => {
                        if (!isOpen) setActiveCameraField(null);
                      }}
                      title={`Capture ${activeCameraField.label}`}
                      docKey={activeCameraField.key}
                      onCaptureSuccess={(url) => {
                        handleDocumentUrlChange(activeCameraField.key, url);
                      }}
                    />
                  )}
                </div>
              )}

              {/* Step 3: Capacity Selection */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <Card className="border-border/70 shadow-xs">
                    <CardHeader className="py-3 px-4 border-b bg-muted/20">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Required Capacity & Pricing
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Select the solar system capacity and view equipment & pricing details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="courseId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">
                              Select Required Capacity *
                              {enquiryData?.preferredCourse && (
                                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full h-9 text-xs">
                                  <SelectValue placeholder="Choose required capacity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {courses.map((course) => (
                                  <SelectItem key={course.id} value={course.id} className="text-xs">
                                    {course.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {selectedCourse && (
                        <div className="bg-muted/40 border border-border/70 p-3.5 rounded-lg text-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-foreground">
                              {selectedCourse.name}
                            </span>
                            {selectedCourse.duration && (
                              <Badge variant="outline" className="text-[10px]">
                                {selectedCourse.duration}
                              </Badge>
                            )}
                          </div>
                          {selectedCourse.description && (
                            <p className="text-xs text-muted-foreground">
                              {selectedCourse.description}
                            </p>
                          )}

                          <Separator />

                          <div className="space-y-1.5">
                            <div className="grid grid-cols-2 text-xs">
                              <span className="text-muted-foreground">System / Installation Fee</span>
                              <span className="text-right font-mono font-medium">
                                {formatCurrency(selectedCourse.courseFee || 0)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 text-xs">
                              <span className="text-muted-foreground">KSEB Fee</span>
                              <span className="text-right font-mono font-medium">
                                {formatCurrency(selectedCourse.admissionFee || 0)}
                              </span>
                            </div>
                            {Number(selectedCourse.semesterFee || 0) > 0 && (
                              <div className="grid grid-cols-2 text-xs">
                                <span className="text-muted-foreground">Subsidy / Support Fee</span>
                                <span className="text-right font-mono font-medium">
                                  {formatCurrency(selectedCourse.semesterFee || 0)}
                                </span>
                              </div>
                            )}

                            <div className="border-t pt-2 grid grid-cols-2 font-bold text-sm text-foreground">
                              <span>Total System Value</span>
                              <span className="text-right font-mono text-primary">
                                {formatCurrency(
                                  (selectedCourse.admissionFee || 0) +
                                    (selectedCourse.courseFee || 0) +
                                    (selectedCourse.semesterFee || 0)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Agent discount section if permitted */}
                      {roleMatch && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <FormField
                            control={form.control}
                            name="agentName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">Executive / Agent Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Sales agent name" className="h-9 text-xs" {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="agentCommission"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">Agent Discount / Incentive (₹)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="0"
                                    className="h-9 text-xs font-mono"
                                    {...field}
                                    onChange={({ target }) =>
                                      field.onChange(
                                        target.value === ""
                                          ? undefined
                                          : parseFloat(target.value)
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {roleMatch && selectedCourse && !isCommissionValid() && (
                        <div className="text-xs text-red-600 font-medium">
                          Agent discount exceeds total fee for selected system capacity
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 4: Review & Confirm */}
              {currentStep === 3 && (
                <Card className="border-border/70 shadow-xs">
                  <CardHeader className="py-3 px-4 border-b bg-muted/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      Pre-Installation Survey Summary
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Verify all customer, site document, and capacity parameters before confirming
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Customer Review */}
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Customer Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-lg border border-border/60">
                        <div>
                          <span className="text-muted-foreground">Name:</span>{" "}
                          <span className="font-semibold text-foreground">{form.getValues("candidateName") || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Mobile:</span>{" "}
                          <span className="font-mono font-medium">{form.getValues("mobileNumber") || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>{" "}
                          <span>{form.getValues("email") || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date of Birth:</span>{" "}
                          <span>
                            {form.getValues("dateOfBirth")
                              ? format(form.getValues("dateOfBirth") as Date, "PPP")
                              : "Not provided"}
                          </span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Site Address:</span>{" "}
                          <span className="font-medium">{form.getValues("address") || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Documents Review */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          KYC & Site Documents
                        </h4>
                        <Badge variant="outline" className="text-[10px]">
                          Residence: {residenceType}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-lg border border-border/60">
                        {activeDocumentFields.map((doc) => {
                          const url = documents[doc.key];
                          return (
                            <div key={doc.key} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                              <span className="text-muted-foreground">{doc.label}:</span>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 font-medium truncate max-w-[160px]"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="truncate">View Link</span>
                                </a>
                              ) : (
                                <span className="text-muted-foreground italic text-[11px]">Not linked</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Capacity & Price Review */}
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Selected Capacity & Pricing
                      </h4>
                      {selectedCourse && (
                        <div className="bg-muted/30 p-3 rounded-lg border border-border/60 text-xs space-y-2">
                          <div className="flex items-center justify-between font-bold text-sm">
                            <span>{selectedCourse.name}</span>
                            <span className="text-primary font-mono">
                              {formatCurrency(
                                (selectedCourse.admissionFee || 0) +
                                  (selectedCourse.courseFee || 0) +
                                  (selectedCourse.semesterFee || 0) -
                                  (form.getValues("agentCommission") || 0)
                              )}
                            </span>
                          </div>
                          {Number(form.getValues("agentCommission") || 0) > 0 && (
                            <div className="flex items-center justify-between text-rose-600">
                              <span>Applied Discount:</span>
                              <span className="font-mono">
                                -{formatCurrency(form.getValues("agentCommission") || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>
          </Form>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isExecuting}
            className="gap-1.5 text-xs h-9"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isExecuting}
              className="text-xs h-9"
            >
              Cancel
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="gap-1.5 text-xs h-9"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isExecuting}
                className="gap-1.5 text-xs h-9"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {mode === "edit" ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    {mode === "edit" ? "Update Survey" : "Submit Pre-Installation Survey"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
