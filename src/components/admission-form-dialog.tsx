"use client";

import { useState, useEffect } from "react";
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
  GraduationCap,
  Eye,
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

// Comprehensive validation schema using Zod
const admissionFormSchema = z.object({
  // Basic Details (Step 1)
  candidateName: z
    .string()
    .min(1, "Candidate name is required")
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
  dateOfBirth: z
    .date({
      required_error: "Date of birth is required",
      invalid_type_error: "Please select a valid date",
    })
    .refine((date) => {
      if (!date) return true;
      const today = new Date();
      const minAge = new Date(
        today.getFullYear() - 100,
        today.getMonth(),
        today.getDate()
      );
      const maxAge = new Date(
        today.getFullYear() - 15,
        today.getMonth(),
        today.getDate()
      );
      return date >= minAge && date <= maxAge;
    }, "Candidate must be between 15 and 100 years old")
    .optional(),
  address: z
    .string()
    .min(10, "Address must be at least 10 characters")
    .max(500, "Address must be less than 500 characters"),
  leadSource: z
    .string()
    .min(1, "Lead source is required")
    .optional()
    .or(z.literal("")),
  createdAt: z.date().optional(),

  // Education Details (Step 2)
  lastQualification: z
    .string()
    .max(100, "Qualification must be less than 100 characters")
    .optional(),
  yearOfPassing: z
    .number()
    .min(1950, "Year must be after 1950")
    .max(
      new Date().getFullYear(),
      `Year cannot be more than ${new Date().getFullYear()}`
    )
    .optional(),
  percentageCGPA: z
    .string()
    .max(20, "Value must be less than 20 characters")
    .optional(),
  instituteName: z
    .string()
    .max(200, "Institute name must be less than 200 characters")
    .optional(),
  additionalNotes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),

  // Course Details (Step 3)
  courseId: z.string().min(1, "Please select a course"),
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

  const isRoleMatch = async () => {
    const { data } = await authClient.getSession();
    const role = data?.user?.role || null;
    const roles = ["admin", "manager", "counsellor"];

    return roles.includes(role?.toLowerCase() || "");
  };

  // determine if current user can see/edit agent fields
  useEffect(() => {
    let mounted = true;
    isRoleMatch().then((res) => {
      if (mounted) setRoleMatch(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Use external open prop if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Reset current step when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const totalSteps = 4;
  const stepTitles = [
    "Basic Details",
    "Education Details",
    "Course Selection",
    "Review & Confirm",
  ];
  const stepIcons = [User, GraduationCap, GraduationCap, Eye];

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
      yearOfPassing: admission?.yearOfPassing || new Date().getFullYear(),
      percentageCGPA: admission?.percentageCGPA || "",
      instituteName: admission?.instituteName || "",
      additionalNotes: admission?.additionalNotes || "",
      courseId: admission?.courseId || enquiryData?.preferredCourse?.id || "",
      createdAt: admission?.createdAt
        ? new Date(admission.createdAt)
        : undefined,
      agentName: admission?.agentName || "",
      agentCommission: admission?.agentCommission || 0,
    },
    mode: "onChange",
  });

  // Use next-safe-action hooks - separate for create and update due to different schemas
  const { execute: executeCreate, isExecuting: isExecutingCreate } = useAction(
    createAdmission,
    {
      onSuccess: async ({ data }) => {
        if (data?.success) {
          toast.success(data.message || "Admission created successfully!");

          // Update enquiry status to ENROLLED if this admission was created from an enquiry
          if (enquiryData && enquiryData.id) {
            try {
              const enquiryUpdateResult = await updateEnquiryStatus(
                enquiryData.id,
                EnquiryStatus.ENROLLED
              );
              if (enquiryUpdateResult.success) {
                toast.success("Enquiry status updated to Enrolled");
              } else {
                toast.error("Failed to update enquiry status");
              }
            } catch (error) {
              console.error("Error updating enquiry status:", error);
              toast.error("Failed to update enquiry status");
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
          error.serverError || "Failed to create admission. Please try again."
        );
      },
      onSettled: ({ result }) => {
        if (result?.validationErrors) {
          // Handle validation errors from server action
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
          toast.success(data.message || "Admission updated successfully!");
          setIsOpen(false);
          setCurrentStep(0);
          form.reset();
          onSuccess?.();
        }
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Failed to update admission. Please try again."
        );
      },
      onSettled: ({ result }) => {
        if (result?.validationErrors) {
          // Handle validation errors from server action
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
        yearOfPassing: new Date().getFullYear(),
        percentageCGPA: "",
        instituteName: "",
        additionalNotes: enquiryData.notes
          ? `Notes from enquiry: ${enquiryData.notes}`
          : "",
        courseId: enquiryData.preferredCourse?.id || "",
      });
    }
  }, [enquiryData, isOpen, form]);

  // Watch form values for dynamic behavior
  const watchedCourseId = form.watch("courseId");

  // Get selected course details
  const selectedCourse = courses.find(
    (course) => course.id === watchedCourseId
  );

  // Calculate progress
  const progress = ((currentStep + 1) / totalSteps) * 100;

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
      1: [
        "lastQualification",
        "yearOfPassing",
        "percentageCGPA",
        "instituteName",
      ],
      2: ["courseId"],
    };

    const fields = fieldsToValidate[stepIndex];
    if (!fields) return true;

    const result = await form.trigger(fields);
    return result;
  };

  // Navigation functions
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
    // Allow going back to previous steps
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      return;
    }

    // For moving forward, validate all previous steps
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
    console.log("called");
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
      toast.error("Commission should be less than or equal to total fee.");
      return;
    }
    if (mode === "create") {
      // Build a properly typed create payload from form values
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
        additionalNotes: data.additionalNotes || undefined,
        createdAt: data.createdAt || undefined,
        agentName: undefined,
        agentCommission: undefined,
        enquiryId: enquiryData?.id || undefined,
      };

      // include agent fields only if user has permission
      if (roleMatch) {
        if (data.agentName) createData.agentName = data.agentName;
        if (data.agentCommission !== undefined)
          createData.agentCommission = data.agentCommission;
      }

      executeCreate(createData);
    } else {
      // Convert form data to match the update admission schema
      if (!admission?.id) {
        toast.error("No admission ID found for update");
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
        additionalNotes: data.additionalNotes,
        createdAt: data.createdAt,
        courseId: data.courseId,
      };

      // include agent fields for update only when permitted
      if (roleMatch) {
        if (data.agentName !== undefined)
          updateData.agentName = data.agentName ?? undefined;
        if (data.agentCommission !== undefined)
          updateData.agentCommission = data.agentCommission;
      }
      executeUpdate(updateData);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isExecuting) {
      setCurrentStep(0);
      form.reset();
    }
    setIsOpen(newOpen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {mode === "edit" ? "Edit Admission" : "Create Admission"}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-screen-sm max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">
            {mode === "edit" ? "Edit Admission" : "Create New Admission"}
            {enquiryData && (
              <span className="text-lg font-normal text-blue-600 ml-2">
                (from enquiry)
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {enquiryData
              ? `Creating admission for ${enquiryData.candidateName} from enquiry. Some fields have been pre-filled.`
              : `Fill in the details to ${
                  mode === "edit" ? "update the" : "create a new"
                } admission record.`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="px-1 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm font-medium">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-between mb-6 px-1">
          {stepTitles.map((title, index) => {
            const StepIcon = stepIcons[index];
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                className="flex flex-col items-center space-y-2 transition-all duration-200 cursor-pointer focus:outline-none"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                    isCompleted && "bg-green-500 text-white",
                    isCurrent &&
                      !isCompleted &&
                      "bg-primary text-primary-foreground",
                    !isCurrent &&
                      !isCompleted &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-200 hidden sm:block",
                    isCurrent && "text-primary",
                    isCompleted && "text-green-600"
                  )}
                >
                  {title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Basic Details */}
              {currentStep === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Basic Details
                    </CardTitle>
                    <CardDescription>
                      Please provide the candidate&apos;s basic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="createdAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Chose Date</FormLabel>
                          <FormControl>
                            <DateOfBirthPicker
                              value={field.value}
                              onChange={field.onChange}
                              disabled={(date) => date < new Date("1900-01-01")}
                              captionLayout="dropdown"
                              startMonth={new Date(1940, 0, 1)}
                              className={cn(
                                "w-full",
                                !field.value && "text-muted-foreground"
                              )}
                              autoFocus
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="candidateName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Candidate Name *
                              {enquiryData?.candidateName && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs"
                                >
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mobileNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Mobile Number *
                              {enquiryData?.phone && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs"
                                >
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="+91 9876543210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Email Address
                              {enquiryData?.email && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs"
                                >
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="example@email.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={AdmissionGender.MALE}>
                                  Male
                                </SelectItem>
                                <SelectItem value={AdmissionGender.FEMALE}>
                                  Female
                                </SelectItem>
                                <SelectItem value={AdmissionGender.OTHER}>
                                  Other
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <DateOfBirthPicker
                                value={field.value}
                                onChange={field.onChange}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                captionLayout="dropdown"
                                startMonth={new Date(1940, 0, 1)}
                                endMonth={new Date()}
                                className={cn(
                                  "w-full",
                                  !field.value && "text-muted-foreground"
                                )}
                                autoFocus
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="leadSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Lead Source
                              {enquiryData?.enquirySource?.name && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs"
                                >
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select lead source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {enquirySources.map((source) => (
                                  <SelectItem
                                    key={source.id}
                                    value={source.name}
                                  >
                                    {source.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Address *
                            {enquiryData?.address && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                From enquiry
                              </Badge>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter complete address"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Education Details */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Education Details
                    </CardTitle>
                    <CardDescription>
                      Please provide educational background information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="lastQualification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Qualification</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., B.Tech, BCA, 12th Grade"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="yearOfPassing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year of Passing</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1950"
                                max={new Date().getFullYear()}
                                placeholder={`Year of Passing (1950 - ${new Date().getFullYear()})`}
                                {...field}
                                onChange={({ target }) =>
                                  field.onChange(parseInt(target.value, 0))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="percentageCGPA"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Percentage/CGPA</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 85%, 8.5 CGPA"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instituteName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Institute/College Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter institute name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="additionalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional educational information, achievements, or special notes"
                              className="min-h-20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Course Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Course Details
                      </CardTitle>
                      <CardDescription>
                        Select the course for admission
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="courseId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Select Course *
                              {enquiryData?.preferredCourse && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs"
                                >
                                  From enquiry
                                </Badge>
                              )}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Choose a course" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {courses.map((course) => (
                                  <SelectItem key={course.id} value={course.id}>
                                    {course.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedCourse && (
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="font-semibold text-base mb-1">
                            {selectedCourse.name}
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            {selectedCourse.description || "No description available"}
                          </div>

                          {selectedCourse.courseFee !== null &&
                          selectedCourse.admissionFee !== null &&
                          selectedCourse.semesterFee !== null ? (
                            <div className="text-sm">
                              <div className="grid grid-cols-2 gap-2 mb-1">
                                <div className="text-muted-foreground">Admission Fee</div>
                                <div className="text-right">{formatCurrency(selectedCourse.admissionFee || 0)}</div>
                                <div className="text-muted-foreground">Course Fee</div>
                                <div className="text-right">{formatCurrency(selectedCourse.courseFee || 0)}</div>
                                <div className="text-muted-foreground">Semester Fee</div>
                                <div className="text-right">{formatCurrency(selectedCourse.semesterFee || 0)}</div>
                              </div>

                              <div className="border-t pt-2 mt-2 grid grid-cols-2 gap-2 font-semibold text-sm">
                                <div>Total</div>
                                <div className="text-right">
                                  {formatCurrency(
                                    (selectedCourse.admissionFee || 0) +
                                      (selectedCourse.courseFee || 0) +
                                      (selectedCourse.semesterFee || 0)
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No fee details available
                            </div>
                          )}
                        </div>
                      )}

                      {/* Agent fields shown only to permitted roles */}
                      {roleMatch && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="agentName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Agent Name (optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Agent name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="agentCommission"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Agent Discount (optional)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="0"
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
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Inline commission error shown in Course Details when commission exceeds total fee */}
                      {roleMatch && selectedCourse && !isCommissionValid() && (
                        <div className="text-sm text-red-600 mt-2">
                          Commission exceeds total fee for selected course
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 4: Review & Confirm */}
              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Review & Confirm
                    </CardTitle>
                    <CardDescription>
                      Please review all information before submitting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Details Review */}
                    <div>
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Basic Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Name:</span>{" "}
                          {form.getValues("candidateName") || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Mobile:</span>{" "}
                          {form.getValues("mobileNumber") || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span>{" "}
                          {form.getValues("email") || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Gender:</span>{" "}
                          {form.getValues("gender") || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Date of Birth:</span>{" "}
                          {form.getValues("dateOfBirth")
                            ? format(
                                form.getValues("dateOfBirth") as Date,
                                "PPP"
                              )
                            : "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Lead Source:</span>{" "}
                          {form.getValues("leadSource") || "N/A"}
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium">Address:</span>{" "}
                          {form.getValues("address") || "N/A"}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Education Details Review */}
                    <div>
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Education Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">
                            Last Qualification:
                          </span>{" "}
                          {form.getValues("lastQualification") || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Year of Passing:</span>{" "}
                          {form.getValues("yearOfPassing") || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Percentage/CGPA:</span>{" "}
                          {form.getValues("percentageCGPA") || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Institute:</span>{" "}
                          {form.getValues("instituteName") || "N/A"}
                        </div>
                        {form.getValues("additionalNotes") && (
                          <div className="md:col-span-2">
                            <span className="font-medium">
                              Additional Notes:
                            </span>{" "}
                            {form.getValues("additionalNotes")}
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Course Details Review */}
                    <div>
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Course Details
                      </h4>
                      <div className="space-y-4">
                        {selectedCourse && (
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="font-semibold text-lg mb-2">
                              {selectedCourse.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selectedCourse.description ||
                                "No description available"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selectedCourse.courseFee !== null &&
                              selectedCourse.admissionFee !== null &&
                              selectedCourse.semesterFee !== null ? (
                                <>
                                  Admission Fee: {selectedCourse.admissionFee},
                                  Course Fee: {selectedCourse.courseFee},
                                  Semester Fee: {selectedCourse.semesterFee}
                                </>
                              ) : (
                                "No fee details available"
                              )}
                            </div>
                            {/* total fee with deducted commission if any */}
                            <div className="text-sm text-muted-foreground">
                              {selectedCourse.admissionFee &&
                              selectedCourse.courseFee &&
                              selectedCourse.semesterFee ? (
                                <>
                                  Total Fee:{" "}
                                  {(
                                    selectedCourse?.admissionFee +
                                    selectedCourse?.courseFee +
                                    selectedCourse?.semesterFee -
                                    (form.getValues("agentCommission") || 0)
                                  ).toFixed(2)}
                                </>
                              ) : (
                                "No total fee available"
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Fees Breakdown Review */}
                    <div>
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Fees Summary
                      </h4>
                      <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                        {(() => {
                          // Safely read numeric fee fields from selectedCourse
                          const s = selectedCourse as SimpleCourse;
                          const admissionFee =
                            Number(s?.admissionFee ?? 0) || 0;
                          const courseFee = Number(s?.courseFee ?? 0) || 0;
                          const semesterFee = Number(s?.semesterFee ?? 0) || 0;
                          const totalBeforeCommission =
                            admissionFee + courseFee + semesterFee;
                          const agentCommission =
                            Number(form.getValues("agentCommission") ?? 0) || 0;
                          const agentName = form.getValues("agentName") || "";
                          const totalAfterCommission = Math.max(
                            0,
                            totalBeforeCommission - agentCommission
                          );

                          const fmt = (v: number) =>
                            v.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            });

                          return (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-muted-foreground">
                                  Admission Fee
                                </div>
                                <div className="text-right">
                                  {fmt(admissionFee)}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-muted-foreground">
                                  Course Fee
                                </div>
                                <div className="text-right">
                                  {fmt(courseFee)}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-muted-foreground">
                                  Semester Fee
                                </div>
                                <div className="text-right">
                                  {fmt(semesterFee)}
                                </div>
                              </div>

                              <div className="border-t pt-2 mt-2 grid grid-cols-2 gap-2 font-semibold">
                                <div>Total</div>
                                <div className="text-right">
                                  {fmt(totalBeforeCommission)}
                                </div>
                              </div>

                              {agentCommission > 0 && (
                                <>
                                  <div className="grid grid-cols-2 gap-2 text-sm text-rose-600">
                                    <div>
                                      Agent Commission
                                      {agentName ? ` — ${agentName}` : ""}
                                    </div>
                                    <div className="text-right">
                                      -{fmt(agentCommission)}
                                    </div>
                                  </div>

                                  <div className="border-t pt-2 mt-2 grid grid-cols-2 gap-2 font-semibold">
                                    <div>Payable after commission</div>
                                    <div className="text-right">
                                      {fmt(totalAfterCommission)}
                                    </div>
                                  </div>
                                  {/* error message if commission exceeds total fee */}
                                  {!isCommissionValid() && (
                                  <div className="text-red-500">
                                    Commission exceeds total fee
                                  </div>
                                  )} 
                                </>
                              )}

                              {agentCommission === 0 && (
                                <div className="text-sm text-muted-foreground">
                                  No agent commission applied
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>
          </Form>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isExecuting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isExecuting}
            >
              Cancel
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button type="button" onClick={handleNext} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isExecuting}
                className="gap-2"
              >
                {isExecuting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {mode === "edit" ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {mode === "edit" ? "Update Admission" : "Create Admission"}
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
