"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "next-safe-action/hooks";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, Plus } from "lucide-react";

import {
  createEnquiry,
  updateEnquiry,
  getBranches,
  getCourses,
  getRequiredServices,
  getUsers,
} from "@/server/actions/enquiry-action";
import { EnquiryStatus, Enquiry } from "@/types/enquiry";
import {
  Branch,
  Course,
  RequiredService,
} from "@/types/data-management";
import { authClient } from "@/lib/auth-client";

// Form schema for client-side validation - make branchId optional when user has branch
const createEnquiryFormSchema = (userHasBranch: boolean) =>
  z.object({
    candidateName: z.string().min(1, "Candidate name is required").max(100),
    phone: z.string().min(10, "Valid phone number is required").max(15),
    contact2: z.string().optional(),
    email: z
      .string()
      .email("Valid email is required")
      .optional()
      .or(z.literal("")),
    address: z.string().optional(),
    status: z.nativeEnum(EnquiryStatus).optional(),
    notes: z.string().optional(),
    feedback: z.string().optional(),
    enquirySourceId: z.string().optional(),
    branchId: userHasBranch ? z.string().optional() : z.string().min(1, "Please select a branch"),

    preferredCourseId: z.string().optional(),
    requiredServiceId: z.string().optional(),
    assignedToUserId: z.string().optional(),
    createdByUserId: z.string().optional(),
  });

type EnquiryFormData = z.infer<ReturnType<typeof createEnquiryFormSchema>>;

interface EnquiryFormDialogProps {
  enquiry?: Enquiry; // For editing - pass enquiry data to pre-fill form
  mode?: "create" | "edit";
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  branches?: Branch[];
}

export function EnquiryFormDialog({
  enquiry,
  mode = "create",
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  branches: passedBranches,
}: EnquiryFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id?: string | null;
    role?: string | null;
    branch?: string | null;
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const isEditMode = mode === "edit" && enquiry;
  const userBranch = currentUser?.branch;
  const userHasBranch = Boolean(userBranch);
  const roleLower = (currentUser?.role || '').toLowerCase();
  const isBranchScoped =
    roleLower === "telecaller" ||
    roleLower === "executive" ||
    roleLower === "manager" ||
    roleLower === "branch manager";

  // Get current user session only when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchCurrentUser = async () => {
      try {
        setIsLoadingUser(true);
        const session = await authClient.getSession();
        setCurrentUser(session.data?.user || null);
      } catch (error) {
        console.error("Failed to get user session:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchCurrentUser();
  }, [open]);

  // Actions
  const {
    executeAsync: createEnquiryAction,
    result: createResult,
    isExecuting: isCreating,
  } = useAction(createEnquiry);

  const {
    executeAsync: updateEnquiryAction,
    result: updateResult,
    isExecuting: isUpdating,
  } = useAction(updateEnquiry);

  const { execute: fetchBranches, result: branchesResult } =
    useAction(getBranches);
  const { execute: fetchCourses, result: coursesResult } =
    useAction(getCourses);
  const { execute: fetchServices, result: servicesResult } =
    useAction(getRequiredServices);
  const { execute: fetchUsers, result: usersResult } =
    useAction(getUsers);

  const hasFetchedRef = useRef(false);

  const isExecuting = isCreating || isUpdating;
  const actionResult = isEditMode ? updateResult : createResult;

  // Form - use dynamic schema based on whether user has branch
  const form = useForm<EnquiryFormData>({
    resolver: zodResolver(createEnquiryFormSchema(userHasBranch)),
    defaultValues: {
      candidateName: enquiry?.candidateName || "",
      phone: enquiry?.phone || "",
      contact2: enquiry?.contact2 || "",
      email: enquiry?.email || "",
      address: enquiry?.address || "",
      status: enquiry?.status || EnquiryStatus.NEW,
      notes: enquiry?.notes || "",
      feedback: enquiry?.feedback || "",
      enquirySourceId: enquiry?.enquirySourceId || "",
      branchId: enquiry?.branchId || undefined,

      preferredCourseId: enquiry?.preferredCourseId || "",
      requiredServiceId: enquiry?.requiredServiceId || "",
      assignedToUserId: enquiry?.assignedToUserId || currentUser?.id || "",
      createdByUserId: enquiry?.createdByUserId || currentUser?.id || "",
    },
  });

  // Update form values when enquiry changes (for edit mode) or when user data loads
  useEffect(() => {
    const shouldReset = enquiry && isEditMode;
    const defaultBranchId = enquiry?.branchId || userBranch || "";

    if (shouldReset || (!enquiry && userBranch)) {
      form.reset({
        candidateName: enquiry?.candidateName || "",
        phone: enquiry?.phone || "",
        contact2: enquiry?.contact2 || "",
        email: enquiry?.email || "",
        address: enquiry?.address || "",
        status: enquiry?.status || EnquiryStatus.NEW,
        notes: enquiry?.notes || "",
        feedback: enquiry?.feedback || "",
        enquirySourceId: enquiry?.enquirySourceId || "",
        branchId: defaultBranchId,
        preferredCourseId: enquiry?.preferredCourseId || "",
        requiredServiceId: enquiry?.requiredServiceId || "",
        assignedToUserId: enquiry?.assignedToUserId || currentUser?.id || "",
        createdByUserId: enquiry?.createdByUserId || currentUser?.id || "",
      });
    }
  }, [enquiry, isEditMode, form, userBranch, currentUser]);

  // Monitor action results - only when actively processing
  useEffect(() => {
    if (!isProcessingAction) return;

    if (actionResult?.data?.success) {
      const message =
        actionResult.data.message ||
        (isEditMode
          ? "Enquiry updated successfully"
          : "Enquiry created successfully");
      toast.success(message);
      setOpen(false);
      form.reset();
      setIsProcessingAction(false);
      onSuccess?.();
    } else if (actionResult?.serverError) {
      toast.error(
        `Error ${isEditMode ? "updating" : "creating"} enquiry: ${
          actionResult.serverError
        }`
      );
      setIsProcessingAction(false);
    } else if (actionResult?.validationErrors) {
      const errorMessages = Object.entries(actionResult.validationErrors)
        .map(
          ([field, errors]) =>
            `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`
        )
        .join("\n");

      toast.error(`Validation errors:\n${errorMessages}`);
      setIsProcessingAction(false);
    }
  }, [actionResult, isEditMode, form, onSuccess, setOpen, isProcessingAction]);

  // Fetch dropdown data ONLY when dialog actually opens
  useEffect(() => {
    if (open && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      if (!passedBranches || passedBranches.length === 0) {
        fetchBranches({});
      }
      fetchCourses({});
      fetchServices({});
      fetchUsers({});
    } else if (!open) {
      hasFetchedRef.current = false;
    }
  }, [open, passedBranches]);

  const onSubmit = async (data: EnquiryFormData) => {
    setIsProcessingAction(true);

    // Use user's branch if they have one and no branch is selected
    const finalBranchId = data.branchId || userBranch || undefined;

    // Ensure branchId is always a string for create action
    if (isEditMode && !finalBranchId) {
      // For edit mode, branchId can be undefined
    } else if (!isEditMode && !finalBranchId) {
      // For create mode, branchId is required
      toast.error("Branch selection is required");
      setIsProcessingAction(false);
      return;
    }

    try {
      if (isEditMode) {
        // Update existing enquiry
        const payload = {
          id: enquiry.id,
          candidateName: data.candidateName,
          phone: data.phone,
          status: data.status || EnquiryStatus.NEW,
          enquirySourceId: data.enquirySourceId || undefined,
          branchId: finalBranchId,
          contact2: data.contact2 || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          notes: data.notes || undefined,
          feedback: data.feedback || undefined,
          preferredCourseId: data.preferredCourseId || undefined,
          requiredServiceId: data.requiredServiceId || undefined,
        };
        const res = await updateEnquiryAction(payload);
        if (res?.data?.success) {
          toast.success(res.data.message || "Enquiry updated successfully");
          setOpen(false);
          form.reset();
          setIsProcessingAction(false);
          onSuccess?.();
        } else if (res?.serverError) {
          toast.error(`Error updating enquiry: ${res.serverError}`);
          setIsProcessingAction(false);
        }
      } else {
        // Create new enquiry
        const payload = {
          candidateName: data.candidateName,
          phone: data.phone,
          enquirySourceId: data.enquirySourceId || undefined,
          branchId: finalBranchId!,
          contact2: data.contact2 || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          preferredCourseId: data.preferredCourseId || undefined,
          requiredServiceId: data.requiredServiceId || undefined,
          notes: data.notes || undefined,
          assignedToUserId: data.assignedToUserId || undefined,
          createdByUserId: data.createdByUserId || undefined,
        };
        const res = await createEnquiryAction(payload);
        if (res?.data?.success) {
          toast.success(res.data.message || "Enquiry created successfully");
          setOpen(false);
          form.reset();
          setIsProcessingAction(false);
          onSuccess?.();
        } else if (res?.serverError) {
          toast.error(`Error creating enquiry: ${res.serverError}`);
          setIsProcessingAction(false);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
      setIsProcessingAction(false);
    }
  };

  const branches = passedBranches && passedBranches.length > 0 ? passedBranches : ((branchesResult?.data?.data as Branch[]) || []);
  const courses = (coursesResult?.data?.data as Course[]) || [];
  const services = (servicesResult?.data?.data as RequiredService[]) || [];
  const users = (usersResult?.data?.data as any[]) || [];

  // Find user's branch name for display
  const userBranchName = userBranch
    ? branches.find((b) => b.id === userBranch)?.name
    : "";

  // Loading component similar to loading.tsx
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
      <div role="status">
        <svg
          aria-hidden="true"
          className="size-8 text-gray-200 animate-spin fill-primary"
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C0 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span className="sr-only">Loading user data...</span>
      </div>
    </div>
  );

  // Handle click events for custom triggers
  const handleTriggerClick = () => {
    setOpen(true);
  };

  // Clone the trigger and add click handler if it's a custom trigger
  const triggerElement = trigger ? (
    <div onClick={handleTriggerClick} className="w-full cursor-pointer">
      {trigger}
    </div>
  ) : (
    <Button
      variant={isEditMode ? "outline" : "default"}
      size={isEditMode ? "sm" : "default"}
      onClick={handleTriggerClick}
    >
      {isEditMode ? (
        <>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          New Enquiry
        </>
      )}
    </Button>
  );

  return (
    <>
      {triggerElement}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Enquiry" : "Add New Enquiry"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the enquiry information. Fields marked with * are required."
                : "Create a new enquiry record. Fields marked with * are required."}
            </DialogDescription>
          </DialogHeader>

          {isLoadingUser ? (
            <LoadingSpinner />
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Candidate Name */}
                  <FormField
                    control={form.control}
                    name="candidateName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Candidate Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter candidate name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Contact 2 */}
                  <FormField
                    control={form.control}
                    name="contact2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Contact</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter secondary contact"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status - Only show in edit mode */}
                  {isEditMode && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(EnquiryStatus).map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replace("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}



                  {/* Branch */}
                  {!isBranchScoped ? (
                    <FormField
                      control={form.control}
                      name="branchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select branch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    userBranchName && (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <FormControl>
                          <Input
                            value={userBranchName}
                            disabled
                            className="bg-muted text-muted-foreground cursor-not-allowed"
                          />
                        </FormControl>
                      </FormItem>
                    )
                  )}

                  {/* Preferred Course */}
                  <FormField
                    control={form.control}
                    name="preferredCourseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Course</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value || undefined)
                          }
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select course (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.name}{" "}
                                {course.duration && `- ${course.duration}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Required Service */}
                  <FormField
                    control={form.control}
                    name="requiredServiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Service</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value || undefined)
                          }
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select service (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Created By */}
                  {mode !== "create" && currentUser?.role !== "telecaller" && (
                    <FormField
                      control={form.control}
                      name="createdByUserId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Created By</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select creator" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name} ({u.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Assigned To */}
                  {mode !== "create" && currentUser?.role !== "telecaller" && (
                    <FormField
                      control={form.control}
                      name="assignedToUserId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select assignee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name} ({u.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Full-width fields */}
                <div className="space-y-4">
                  {/* Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter full address"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Feedback - Only show in edit mode */}
                  {isEditMode && (
                    <FormField
                      control={form.control}
                      name="feedback"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feedback</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Feedback from the candidate"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes about the enquiry"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Any additional information about the enquiry that
                          might be helpful
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isExecuting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isExecuting}>
                    {isExecuting
                      ? isEditMode
                        ? "Updating..."
                        : "Creating..."
                      : isEditMode
                      ? "Update Enquiry"
                      : "Create Enquiry"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
