'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createProposal } from '@/server/actions/proposal/proposal-actions';
import { getEnquiries } from '@/server/actions/enquiry';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Enquiry } from '@/types/enquiry';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const proposalItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be positive'),
});

const createProposalSchema = z.object({
    clientName: z.string().min(1, 'Client Name is required'),
    clientEmail: z.string().email().optional().or(z.literal('')),
    clientPhone: z.string().optional(),
    branch: z.string(),
    items: z.array(proposalItemSchema),
});

type ProposalFormValues = z.infer<typeof createProposalSchema>;

export default function CreateProposalPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const enquiryIdParam = searchParams.get('enquiryId');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Auto-fill states
    const [open, setOpen] = useState(false);
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [selectedEnquiryId, setSelectedEnquiryId] = useState<string>("");

    const fetchEnquiries = async (search: string = "") => {
        const res = await getEnquiries({ page: 1, limit: 10, search });
        if (res.success && res.data) {
            setEnquiries(res.data as Enquiry[]);
        }
    };

    useEffect(() => {
        fetchEnquiries();
    }, []);

    // Handle URL param for enquiryId
    useEffect(() => {
        if (enquiryIdParam) {
             import('@/server/actions/enquiry').then(({ getEnquiry }) => {
                getEnquiry(enquiryIdParam).then((res) => {
                    if (res.success && res.data) {
                        const enquiry = res.data as Enquiry;
                        setSelectedEnquiryId(enquiry.id); // For visual selection state if needed
                        form.setValue('clientName', enquiry.candidateName);
                        form.setValue('clientEmail', enquiry.email || '');
                        form.setValue('clientPhone', enquiry.phone || '');
                        if (enquiry.branchId) {
                            form.setValue('branch', enquiry.branchId);
                        }
                    }
                });
             });
        }
    }, [enquiryIdParam]);

    const form = useForm<ProposalFormValues>({
        resolver: zodResolver(createProposalSchema),
        defaultValues: {
            clientName: '',
            clientEmail: '',
            clientPhone: '',
            branch: '',
            items: [{ description: '', quantity: 1, unitPrice: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    // Watch items for total calculation
    const items = form.watch('items');
    const totalAmount = items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;

    const onSubmit = async (data: ProposalFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await createProposal(data);
            if (res?.data?.success) {
                toast.success('Proposal created successfully!');
                router.push('/proposals');
            } else {
                toast.error(res?.data?.message || 'Failed to create proposal');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Proposal</h1>
                    <p className="text-gray-600">Draft a new proposal for a client</p>
                </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Details</CardTitle>
                            <CardDescription>Enter the client's information or select from Enquiries</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="flex flex-col space-y-2">
                                <Label>Import from Enquiry (Optional)</Label>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={open}
                                            className="w-full justify-between"
                                        >
                                            {selectedEnquiryId
                                                ? enquiries.find((e) => e.id === selectedEnquiryId)?.candidateName || "Select enquiry..."
                                                : "Select enquiry to auto-fill..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search enquiry..." onValueChange={(val) => fetchEnquiries(val)} />
                                            <CommandList>
                                                <CommandEmpty>No enquiry found.</CommandEmpty>
                                                <CommandGroup>
                                                    {enquiries.map((enquiry) => (
                                                        <CommandItem
                                                            key={enquiry.id}
                                                            value={enquiry.candidateName}
                                                            onSelect={() => {
                                                                setSelectedEnquiryId(enquiry.id === selectedEnquiryId ? "" : enquiry.id);
                                                                if (enquiry.id !== selectedEnquiryId) {
                                                                    form.setValue('clientName', enquiry.candidateName);
                                                                    form.setValue('clientEmail', enquiry.email || '');
                                                                    form.setValue('clientPhone', enquiry.phone || '');
                                                                    if (enquiry.branchId) {
                                                                        form.setValue('branch', enquiry.branchId);
                                                                    }
                                                                }
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedEnquiryId === enquiry.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span>{enquiry.candidateName}</span>
                                                                <span className="text-xs text-muted-foreground">{enquiry.phone}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Separator />
                            <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="clientName">Client Name *</Label>
                                <Input
                                    id="clientName"
                                    placeholder="e.g. Acme Corp"
                                    {...form.register('clientName')}
                                />
                                {form.formState.errors.clientName && (
                                    <p className="text-sm text-red-500">{form.formState.errors.clientName.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="clientEmail">Email</Label>
                                <Input
                                    id="clientEmail"
                                    type="email"
                                    placeholder="client@example.com"
                                    {...form.register('clientEmail')}
                                />
                                {form.formState.errors.clientEmail && (
                                    <p className="text-sm text-red-500">{form.formState.errors.clientEmail.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="clientPhone">Phone</Label>
                                <Input
                                    id="clientPhone"
                                    placeholder="e.g. +1 234 567 890"
                                    {...form.register('clientPhone')}
                                />
                            </div>
                            </div>
                    </CardContent>
                </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Items</CardTitle>
                                    <CardDescription>Add services or products to the proposal</CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Item
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className={cn(
                                    "flex flex-col md:flex-row gap-4 items-start",
                                    "p-4 border rounded-lg bg-gray-50/50 md:p-0 md:border-0 md:bg-transparent md:rounded-none"
                                )}>
                                    <div className="flex-1 grid gap-2 w-full">
                                        <Label className={index !== 0 ? 'md:sr-only' : ''}>Description</Label>
                                        <Input
                                            placeholder="Item description"
                                            {...form.register(`items.${index}.description`)}
                                        />
                                        {form.formState.errors.items?.[index]?.description && (
                                            <p className="text-sm text-red-500">{form.formState.errors.items[index]?.description?.message}</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-4 w-full md:w-auto">
                                        <div className="flex-1 md:w-24 grid gap-2">
                                            <Label className={index !== 0 ? 'md:sr-only' : ''}>Qty</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                            />
                                        </div>
                                        <div className="flex-1 md:w-32 grid gap-2">
                                            <Label className={index !== 0 ? 'md:sr-only' : ''}>Unit Price</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                                            />
                                        </div>
                                    </div>

                                    <div className="w-full md:w-32 grid gap-2 text-right">
                                        <Label className={cn("text-left md:text-right", index !== 0 ? 'md:sr-only' : '')}>Total</Label>
                                        <div className="h-10 flex items-center justify-between md:justify-end px-3 border rounded-md bg-white md:border-0 md:bg-transparent md:px-0">
                                            <span className="md:hidden text-muted-foreground text-sm">Subtotal:</span>
                                            <div className="font-medium">
                                                {(items[index]?.quantity || 0) * (items[index]?.unitPrice || 0)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={cn("flex justify-end w-full md:w-auto", index === 0 ? 'md:pt-8' : '')}>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                                    No items added. Click "Add Item" to start.
                                </div>
                            )}

                            <Separator className="my-4" />

                            <div className="flex justify-end items-center gap-4 text-lg font-semibold">
                                <span>Total Amount:</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Create Proposal'}
                                {!isSubmitting && <Save className="ml-2 h-4 w-4" />}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </form>
        </div>
    );
}
