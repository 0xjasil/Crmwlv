'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Edit,
  FileText,
  Trash2,
  Send,
  CheckCircle,
  Receipt,
  Printer,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ProposalStatus, Proposal } from '@/types/proposal';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getProposalById,
  updateProposal,
  deleteProposal,
} from '@/server/actions/proposal/proposal-actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';

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
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while loading proposal');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProposal();
    }
  }, [id]);

  const getStatusBadge = (status: ProposalStatus | string) => {
    switch (status) {
      case ProposalStatus.DRAFT:
      case 'DRAFT':
        return <Badge variant="secondary" className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">Draft</Badge>;
      case ProposalStatus.SENT:
      case 'SUBMITTED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">Submitted / Sent</Badge>;
      case ProposalStatus.ACCEPTED:
      case 'APPROVED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">Approved / Confirmed</Badge>;
      case ProposalStatus.REJECTED:
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    try {
      const res = await updateProposal({ id, status: newStatus });
      if (res?.data?.success) {
        toast.success(`Proposal status updated to ${newStatus}`);
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
    try {
      const res = await deleteProposal({ id });
      if (res?.data?.success) {
        toast.success('Proposal deleted successfully');
        router.push('/proposals');
      } else {
        toast.error(res?.data?.message || 'Failed to delete proposal');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading proposal details...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <h2 className="text-xl font-bold">Proposal Not Found</h2>
        <p className="text-muted-foreground">The requested proposal could not be retrieved.</p>
        <Button onClick={() => router.push('/proposals')}>Back to Proposals</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/proposals')}
            className="h-9 w-9 rounded-full shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {proposal.proposalNo}
              </h1>
              {getStatusBadge(proposal.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {proposal.title || 'Commercial Proposal & Quotation'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Convert to Invoice Action */}
          <Button
            variant="default"
            className="shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() =>
              router.push(
                `/invoices/new?proposalId=${proposal.id}&clientName=${encodeURIComponent(
                  proposal.clientName
                )}&phone=${encodeURIComponent(proposal.clientPhone || '')}`
              )
            }
          >
            <Receipt className="mr-2 h-4 w-4" />
            Convert to Invoice
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <div className="w-[170px]">
            <Select
              value={proposal.status}
              onValueChange={(val) => handleStatusChange(val as ProposalStatus)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProposalStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={ProposalStatus.SENT}>Submitted / Sent</SelectItem>
                <SelectItem value={ProposalStatus.ACCEPTED}>Approved / Confirmed</SelectItem>
                <SelectItem value={ProposalStatus.REJECTED}>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => router.push(`/proposals/${id}/edit`)}
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bill of Quantities Items Card */}
          <Card className="shadow-xs border-muted/80">
            <CardHeader className="bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Bill of Quantities / Items</CardTitle>
                  <CardDescription>Itemized scope of work and pricing breakdown</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {proposal.items?.length || 0} Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/10 border-b text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {proposal.items && proposal.items.length > 0 ? (
                      proposal.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-medium">{item.description}</td>
                          <td className="py-3.5 px-4 text-center font-mono">{item.quantity}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold font-mono">
                            {formatCurrency(item.total || item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No items in this proposal
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculations Box */}
              <div className="bg-muted/20 border-t p-5 flex flex-col items-end space-y-2">
                <div className="flex justify-between w-64 text-sm text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(proposal.subtotal || proposal.totalAmount || 0)}
                  </span>
                </div>

                {Boolean(proposal.taxRate && proposal.taxRate > 0) && (
                  <div className="flex justify-between w-64 text-sm text-muted-foreground">
                    <span>GST ({proposal.taxRate}%):</span>
                    <span className="font-medium text-foreground">
                      +{formatCurrency(proposal.taxAmount || 0)}
                    </span>
                  </div>
                )}

                {Boolean(proposal.discountAmount && proposal.discountAmount > 0) && (
                  <div className="flex justify-between w-64 text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-medium">
                      -{formatCurrency(proposal.discountAmount || 0)}
                    </span>
                  </div>
                )}

                <Separator className="w-64 my-1" />

                <div className="flex justify-between w-64 items-baseline pt-1">
                  <span className="font-bold text-base">Grand Total:</span>
                  <span className="font-extrabold text-xl text-primary font-mono">
                    {formatCurrency(proposal.totalAmount || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions Card */}
          {(proposal.terms || proposal.notes) && (
            <Card className="shadow-xs border-muted/80">
              <CardHeader className="bg-muted/20 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Quotation Terms & Client Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4 text-sm">
                {proposal.terms && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      Terms & Payment Conditions:
                    </h4>
                    <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                      {proposal.terms}
                    </p>
                  </div>
                )}

                {proposal.notes && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      Special Remarks:
                    </h4>
                    <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                      {proposal.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Client Details */}
          <Card className="shadow-xs border-muted/80">
            <CardHeader className="bg-muted/20 pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Client Name</span>
                <p className="font-semibold text-base">{proposal.clientName}</p>
              </div>

              {proposal.clientPhone && (
                <div>
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <p className="font-medium">{proposal.clientPhone}</p>
                </div>
              )}

              {proposal.clientEmail && (
                <div>
                  <span className="text-xs text-muted-foreground">Email</span>
                  <p className="font-medium text-muted-foreground break-all">{proposal.clientEmail}</p>
                </div>
              )}

              {proposal.clientAddress && (
                <div>
                  <span className="text-xs text-muted-foreground">Site Address</span>
                  <p className="text-muted-foreground text-xs leading-relaxed">{proposal.clientAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proposal Meta Details */}
          <Card className="shadow-xs border-muted/80">
            <CardHeader className="bg-muted/20 pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Proposal Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Proposal Number:</span>
                <span className="font-mono font-medium">{proposal.proposalNo}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Assigned Branch:</span>
                <span className="font-medium">{proposal.branch || 'Main Branch'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Created By:</span>
                <span>{proposal.createdByUser || 'CRM Team'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Issue Date:</span>
                <span>{new Date(proposal.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
              </div>

              {proposal.validUntil && (
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-muted-foreground">Valid Until:</span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {new Date(proposal.validUntil).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Flow to Invoice */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Project Flow Connected
            </div>
            <p className="text-muted-foreground leading-relaxed">
              When approved, clicking &quot;Convert to Invoice&quot; pre-populates all items, tax rates, and client details automatically.
            </p>
          </div>

          {/* Danger Zone */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-9"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Proposal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Proposal {proposal.proposalNo}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this proposal and all its bill of quantities items from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
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
