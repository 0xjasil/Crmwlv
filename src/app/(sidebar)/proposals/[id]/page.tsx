'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, FileText, Trash2, Send, CheckCircle, XCircle } from 'lucide-react';
import { ProposalStatus, Proposal } from '@/types/proposal';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { getProposalById, updateProposal, deleteProposal } from '@/server/actions/proposal/proposal-actions';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProposalDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProposal = async () => {
        setIsLoading(true);
        try {
            const res = await getProposalById({ id });
            if (res?.data?.success && res.data.data) {
                setProposal(res.data.data);
            } else {
                toast.error(res?.data?.message || 'Failed to fetch proposal');
                // router.push('/proposals');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchProposal();
        }
    }, [id]);

    const getStatusColor = (status: ProposalStatus) => {
        switch (status) {
            case ProposalStatus.DRAFT:
                return 'bg-gray-100 text-gray-800';
            case ProposalStatus.SENT:
                return 'bg-blue-100 text-blue-800';
            case ProposalStatus.ACCEPTED:
                return 'bg-green-100 text-green-800';
            case ProposalStatus.REJECTED:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleStatusChange = async (newStatus: ProposalStatus) => {
        try {
            const res = await updateProposal({ id, status: newStatus });
            if (res?.data?.success) {
                toast.success(`Status updated to ${newStatus}`);
                fetchProposal();
            } else {
                toast.error(res?.data?.message || 'Failed to update status');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async () => {
        // Confirm dialog handled by AlertDialog
        try {
            const res = await deleteProposal({ id });
            if (res?.data?.success) {
                toast.success("Proposal deleted");
                router.push('/proposals');
            } else {
                toast.error(res?.data?.message || "Failed to delete");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        }
    };

    if (isLoading) {
        return <div className="p-6 text-center text-gray-500">Loading proposal details...</div>;
    }

    if (!proposal) {
        return <div className="p-6 text-center text-red-500">Proposal not found</div>;
    }

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{proposal.proposalNo}</h1>
                            <Badge className={getStatusColor(proposal.status)}>{proposal.status}</Badge>
                        </div>
                        <p className="text-sm md:text-base text-gray-600">Created on {new Date(proposal.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" className="flex-1 md:flex-none" onClick={() => window.location.href = `/api/proposals/${id}/pdf?download=true`}>
                        <FileText className="mr-2 h-4 w-4" />
                        PDF
                    </Button>
                    <div className="flex-1 md:w-[180px] min-w-[140px]">
                        <Select
                            value={proposal.status}
                            onValueChange={(value) => handleStatusChange(value as ProposalStatus)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(ProposalStatus).map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {proposal.status === ProposalStatus.DRAFT && (
                         <Button variant="outline" className="flex-1 md:flex-none" onClick={() => router.push(`/proposals/${id}/edit`)}>
                             <Edit className="mr-2 h-4 w-4" />
                             Edit
                         </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    {/* Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Proposal Items</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="relative w-full overflow-auto">
                                {/* Desktop Table */}
                                <table className="hidden md:table w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[50%]">Description</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Qty</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Unit Price</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {proposal.items && proposal.items.length > 0 ? (
                                            proposal.items.map((item) => (
                                                <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4 align-middle">{item.description}</td>
                                                    <td className="p-4 align-middle text-right">{item.quantity}</td>
                                                    <td className="p-4 align-middle text-right">{formatCurrency(item.unitPrice)}</td>
                                                    <td className="p-4 align-middle text-right">{formatCurrency(item.total || (item.quantity * item.unitPrice))}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-muted-foreground">No items found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile List */}
                                <div className="md:hidden grid gap-4 p-4">
                                     {proposal.items && proposal.items.length > 0 ? (
                                        proposal.items.map((item) => (
                                            <div key={item.id} className="border rounded-lg p-3 space-y-2 bg-muted/10">
                                                <div className="font-medium text-sm">{item.description}</div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Quantity:</span>
                                                    <span>{item.quantity}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Unit Price:</span>
                                                    <span>{formatCurrency(item.unitPrice)}</span>
                                                </div>
                                                <Separator className="my-1" />
                                                <div className="flex justify-between font-medium text-sm">
                                                    <span>Total:</span>
                                                    <span>{formatCurrency(item.total || (item.quantity * item.unitPrice))}</span>
                                                </div>
                                            </div>
                                        ))
                                     ) : (
                                        <div className="text-center text-muted-foreground py-4">No items found</div>
                                     )}
                                </div>
                            </div>
                            <div className="flex justify-end p-4">
                                <div className="flex gap-8 text-lg font-semibold">
                                    <span>Total</span>
                                    <span>{formatCurrency(proposal.totalAmount || 0)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Client Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm font-medium text-gray-500">Name</div>
                                <div className="text-base">{proposal.clientName}</div>
                            </div>
                            {proposal.clientEmail && (
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Email</div>
                                    <div className="text-base">{proposal.clientEmail}</div>
                                </div>
                            )}
                            {proposal.clientPhone && (
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Phone</div>
                                    <div className="text-base">{proposal.clientPhone}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Meta Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm font-medium text-gray-500">Proposal ID</div>
                                <div className="text-sm font-mono text-muted-foreground">{proposal.id}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-500">Created By</div>
                                <div className="text-base">{proposal.createdByUser || 'Unknown'}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-500">Last Updated</div>
                                <div className="text-sm text-muted-foreground">{new Date(proposal.updatedAt).toLocaleDateString()}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Proposal
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this proposal.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}
