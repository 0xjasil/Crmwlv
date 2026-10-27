'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Building2,
  Sparkles,
  Zap,
  FileText,
  User,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { createProposal } from '@/server/actions/proposal/proposal-actions';
import { getEnquiries } from '@/server/actions/enquiry';
import { getAllBranches, getAllCourses } from '@/server/actions/data-management';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProposalStatus } from '@/types/proposal';

const proposalItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
});

const createProposalSchema = z.object({
  title: z.string().optional(),
  clientName: z.string().min(1, 'Client Name is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  branch: z.string().min(1, 'Branch is required'),
  branchId: z.string().optional(),
  enquiryId: z.string().optional(),
  status: z.nativeEnum(ProposalStatus),
  validUntil: z.string().optional(),
  taxRate: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(proposalItemSchema).min(1, 'At least one item is required'),
});

type ProposalFormValues = z.infer<typeof createProposalSchema>;

export default function CreateProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enquiryIdParam = searchParams.get('enquiryId');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill & Master Data states
  const [openEnquirySelect, setOpenEnquirySelect] = useState(false);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(createProposalSchema) as any,
    defaultValues: {
      title: 'Solar Power Plant & Rooftop Installation Proposal',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      branch: '',
      branchId: '',
      enquiryId: '',
      status: ProposalStatus.DRAFT,
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      taxRate: 0,
      discountAmount: 0,
      notes: 'Thank you for your interest in our solar energy solutions. Contact us for any technical adjustments.',
      terms:
        '1. Validity: This proposal and pricing is valid for 15 days from issue date.\n2. Payment terms: 50% advance booking, 40% on material delivery, 10% after grid synchronization.\n3. Feasibility and Net-Metering approvals are subject to KSEB regulations.',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Load Branches & Courses on mount
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [branchRes, courseRes] = await Promise.all([
          getAllBranches(),
          getAllCourses(),
        ]);

        if (branchRes.success && Array.isArray(branchRes.data)) {
          setBranches(branchRes.data);
          // Set first branch as default if none set
          if (branchRes.data.length > 0 && !form.getValues('branch')) {
            form.setValue('branch', branchRes.data[0].name);
            form.setValue('branchId', branchRes.data[0].id);
          }
        }

        if (courseRes.success && Array.isArray(courseRes.data)) {
          setCourses(courseRes.data);
        }
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    }
    loadMasterData();
  }, [form]);

  // Fetch enquiries for combobox
  const fetchEnquiries = async (search: string = '') => {
    try {
      const res = await getEnquiries({ page: 1, limit: 10, search });
      if (res?.success && res?.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.enquiries || [];
        setEnquiries(list);
      }
    } catch (err) {
      console.error('Failed to search enquiries:', err);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  // Handle URL param ?enquiryId=...
  useEffect(() => {
    if (enquiryIdParam) {
      import('@/server/actions/enquiry').then(({ getEnquiry }) => {
        getEnquiry(enquiryIdParam).then((res) => {
          if (res.success && res.data) {
            const enquiry = res.data;
            applyEnquiryData(enquiry);
          }
        });
      });
    }
  }, [enquiryIdParam]);

  const applyEnquiryData = (enquiry: any) => {
    setSelectedEnquiry(enquiry);
    form.setValue('enquiryId', enquiry.id);
    form.setValue('clientName', enquiry.candidateName || '');
    form.setValue('clientEmail', enquiry.email || '');
    form.setValue('clientPhone', enquiry.phone || '');
    if (enquiry.address) {
      form.setValue('clientAddress', enquiry.address);
    }
    if (enquiry.branch?.name) {
      form.setValue('branch', enquiry.branch.name);
      form.setValue('branchId', enquiry.branchId || enquiry.branch.id);
    } else if (enquiry.branchId) {
      form.setValue('branch', enquiry.branchId);
      form.setValue('branchId', enquiry.branchId);
    }

    // If enquiry has preferredCourse, set quotation title and prefill item if empty
    if (enquiry.preferredCourse) {
      const pref = enquiry.preferredCourse;
      form.setValue(
        'title',
        `Quotation for ${pref.name} Solar System - ${enquiry.candidateName}`
      );

      const price = pref.courseFee || 0;
      const kseb = pref.admissionFee || 0;
      const grandTotal = price + kseb;

      const currentItems = form.getValues('items');
      if (
        currentItems.length === 0 ||
        (currentItems.length === 1 && !currentItems[0].description)
      ) {
        replace([
          {
            description: `${pref.name} Solar Power System (Complete On-Grid Package with Tier-1 Panels & Inverter)`,
            quantity: 1,
            unitPrice: grandTotal > 0 ? grandTotal : price,
          },
        ]);
      }
    }
  };

  // Watch items, tax, discount for financial summary
  const watchedItems = form.watch('items') || [];
  const taxRate = Number(form.watch('taxRate') || 0);
  const discountAmount = Number(form.watch('discountAmount') || 0);

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
    0
  );
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

  // Quick-add package/course helper
  const addCourseToItems = (course: any) => {
    const brand = course.duration ? ` (${course.duration})` : '';
    const price = course.courseFee || 0;
    const kseb = course.admissionFee || 0;
    const total = price + kseb;

    append({
      description: `${course.name} Solar System${brand} - Complete Turnkey Installation & KSEB Feasibility`,
      quantity: 1,
      unitPrice: total > 0 ? total : price,
    });
    toast.info(`Added ${course.name} to proposal items`);
  };

  const onSubmit = async (data: ProposalFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await createProposal(data);
      if (res?.data?.success) {
        toast.success(res.data.message || 'Proposal created successfully!');
        router.push('/proposals');
      } else {
        toast.error(res?.data?.message || 'Failed to create proposal');
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-full shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                New Proposal / Quotation
              </h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                DB Connected
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Create an official pricing quotation for leads, customers, or custom projects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push('/proposals')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="shadow-sm"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving to Database...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Create Proposal
              </span>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Client & Enquiry Selection */}
        <Card className="shadow-xs border-muted/80">
          <CardHeader className="bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Client & Lead Information
                </CardTitle>
                <CardDescription>
                  Import existing customer details from Enquiries or type manually
                </CardDescription>
              </div>

              {/* Enquiry Auto-fill Combobox */}
              <div className="w-full sm:w-80">
                <Popover open={openEnquirySelect} onOpenChange={setOpenEnquirySelect}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openEnquirySelect}
                      className="w-full justify-between text-xs h-9 bg-white dark:bg-zinc-950"
                    >
                      <span className="truncate">
                        {selectedEnquiry
                          ? `Imported: ${selectedEnquiry.candidateName}`
                          : '⚡ Select Enquiry to Auto-fill...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0" align="end">
                    <Command>
                      <CommandInput
                        placeholder="Search lead by name or phone..."
                        onValueChange={(val) => fetchEnquiries(val)}
                      />
                      <CommandList>
                        <CommandEmpty>No matching enquiries found.</CommandEmpty>
                        <CommandGroup heading="Recent Enquiries">
                          {enquiries.map((enquiry) => (
                            <CommandItem
                              key={enquiry.id}
                              value={`${enquiry.candidateName} ${enquiry.phone}`}
                              onSelect={() => {
                                applyEnquiryData(enquiry);
                                setOpenEnquirySelect(false);
                                toast.success(`Imported lead details for ${enquiry.candidateName}`);
                              }}
                              className="flex flex-col items-start py-2"
                            >
                              <div className="flex items-center justify-between w-full font-medium">
                                <span>{enquiry.candidateName}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {enquiry.branch?.name || 'Branch'}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {enquiry.phone} • {enquiry.preferredCourse?.name || 'No capacity specified'}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 pt-6">
            {selectedEnquiry && selectedEnquiry.preferredCourse && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Lead Preferred System:</strong> {selectedEnquiry.preferredCourse.name} (Estimated: ₹
                    {(selectedEnquiry.preferredCourse.courseFee || 0).toLocaleString('en-IN')})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs bg-white dark:bg-zinc-900 border-amber-300"
                  onClick={() => addCourseToItems(selectedEnquiry.preferredCourse)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add to Items
                </Button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="clientName">
                  Client / Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clientName"
                  placeholder="e.g. John Doe / GreenTech Industries"
                  {...form.register('clientName')}
                />
                {form.formState.errors.clientName && (
                  <p className="text-xs text-destructive">{form.formState.errors.clientName.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientPhone">Phone Number</Label>
                <Input
                  id="clientPhone"
                  placeholder="+91 98765 43210"
                  {...form.register('clientPhone')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientEmail">Email Address</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@example.com"
                  {...form.register('clientEmail')}
                />
                {form.formState.errors.clientEmail && (
                  <p className="text-xs text-destructive">{form.formState.errors.clientEmail.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 pt-2">
              <div className="grid gap-2">
                <Label htmlFor="branch">
                  Assigned Branch <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch('branch')}
                  onValueChange={(val) => {
                    form.setValue('branch', val);
                    const b = branches.find((item) => item.name === val || item.id === val);
                    if (b) form.setValue('branchId', b.id);
                  }}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select operating branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                    {branches.length === 0 && (
                      <SelectItem value="Main Branch">Main Branch</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.branch && (
                  <p className="text-xs text-destructive">{form.formState.errors.branch.message}</p>
                )}
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="clientAddress">Site / Installation Address</Label>
                <Input
                  id="clientAddress"
                  placeholder="e.g. Building 4, Hill View Road, Kochi, Kerala"
                  {...form.register('clientAddress')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Proposal Header & Terms */}
        <Card className="shadow-xs border-muted/80">
          <CardHeader className="bg-muted/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Proposal Subject & Validity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="title">Proposal Subject / Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. 5kW Solar Rooftop Power Plant Quotation"
                  {...form.register('title')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="validUntil">Proposal Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  {...form.register('validUntil')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Items & Pricing Table */}
        <Card className="shadow-xs border-muted/80">
          <CardHeader className="bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Bill of Quantities / Quotation Items
                </CardTitle>
                <CardDescription>
                  Add system packages, solar components, net metering fees, or custom services
                </CardDescription>
              </div>

              {/* Quick Add from Solar Capacities / Courses */}
              <div className="flex items-center gap-2">
                {courses.length > 0 && (
                  <Select
                    onValueChange={(courseId) => {
                      const c = courses.find((item) => item.id === courseId);
                      if (c) addCourseToItems(c);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs w-[220px] bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="⚡ Add Solar Package..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.duration ? `(${c.duration})` : ''} - ₹
                          {(c.courseFee || 0).toLocaleString('en-IN')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shadow-xs"
                  onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Custom Item
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={cn(
                  'flex flex-col md:flex-row gap-3 items-start p-3 border rounded-lg',
                  'bg-zinc-50/70 dark:bg-zinc-900/50 hover:border-muted-foreground/30 transition-colors'
                )}
              >
                <div className="flex-1 grid gap-1.5 w-full">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Item Description #{index + 1}
                  </Label>
                  <Input
                    placeholder="e.g. 5kW Monocrystalline Solar Panels / 5kW Solar On-Grid Inverter"
                    {...form.register(`items.${index}.description`)}
                  />
                  {form.formState.errors.items?.[index]?.description && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.items[index]?.description?.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-24 grid gap-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>

                  <div className="w-36 grid gap-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Unit Price (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    />
                  </div>

                  <div className="w-36 grid gap-1.5 text-right">
                    <Label className="text-xs text-muted-foreground font-medium">Line Total</Label>
                    <div className="h-9 px-3 flex items-center justify-end font-semibold text-sm bg-white dark:bg-zinc-950 border rounded-md">
                      ₹
                      {(
                        (watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0)
                      ).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      className="text-muted-foreground hover:text-destructive h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No items added. Click &quot;Add Custom Item&quot; or select a Solar Package above.
              </div>
            )}

            <Separator className="my-6" />

            {/* Financial Summary & Tax / Discount Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-4">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Taxes & Deductions
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="taxRate" className="text-xs">
                      GST / Tax Rate (%)
                    </Label>
                    <div className="flex gap-1.5">
                      <Input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        {...form.register('taxRate', { valueAsNumber: true })}
                      />
                      <Button
                        type="button"
                        variant={taxRate === 18 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => form.setValue('taxRate', 18)}
                        className="text-xs px-2"
                      >
                        18%
                      </Button>
                      <Button
                        type="button"
                        variant={taxRate === 0 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => form.setValue('taxRate', 0)}
                        className="text-xs px-2"
                      >
                        0%
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="discountAmount" className="text-xs">
                      Discount (₹)
                    </Label>
                    <Input
                      id="discountAmount"
                      type="number"
                      min="0"
                      placeholder="0"
                      {...form.register('discountAmount', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="status" className="text-xs">
                    Initial Proposal Status
                  </Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(val) => form.setValue('status', val as ProposalStatus)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ProposalStatus.DRAFT}>Draft</SelectItem>
                      <SelectItem value={ProposalStatus.SENT}>Submitted / Sent</SelectItem>
                      <SelectItem value={ProposalStatus.ACCEPTED}>Approved / Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calculations Box */}
              <div className="bg-muted/30 border rounded-xl p-5 space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal ({watchedItems.length} items):</span>
                  <span className="font-medium text-foreground">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {taxRate > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>GST ({taxRate}%):</span>
                    <span className="font-medium text-foreground">
                      +₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Special Discount:</span>
                    <span className="font-medium">
                      -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-base font-bold">Total Amount</span>
                    <p className="text-[11px] text-muted-foreground">Inclusive of all configured charges</p>
                  </div>
                  <div className="text-2xl font-extrabold text-primary">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Terms & Conditions */}
        <Card className="shadow-xs border-muted/80">
          <CardHeader className="bg-muted/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Terms, Conditions & Notes
            </CardTitle>
            <CardDescription>
              Legal warranty, payment milestones, and client-facing notes included on the quotation
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                rows={4}
                placeholder="Payment terms, delivery timeline, validity..."
                {...form.register('terms')}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Client Notes & Remarks</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Custom engineering instructions or contact person details..."
                {...form.register('notes')}
                className="text-xs"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t bg-muted/10 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/proposals')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-36">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Create Proposal
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
