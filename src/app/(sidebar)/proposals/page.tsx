'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Eye, Edit, Trash2, MoreVertical, Plus, FileText, RotateCw, FileSpreadsheet } from 'lucide-react';
import { Proposal, ProposalStatus } from '@/types/proposal';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { getProposals, deleteProposal } from '@/server/actions/proposal/proposal-actions';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

export default function ProposalsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getProposals();
      if (result?.data?.success && Array.isArray(result.data.data)) {
        setProposals(result.data.data);
      } else if (Array.isArray(result?.data)) {
        setProposals(result.data);
      } else {
        setProposals([]);
        if (result?.data?.message) {
          console.warn('Proposals fetch:', result.data.message);
        }
      }
    } catch (err) {
      console.error('Failed to fetch proposals', err);
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const filteredProposals = proposals.filter((p) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      p.proposalNo.toLowerCase().includes(lower) ||
      p.clientName.toLowerCase().includes(lower)
    );
  });

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteProposal({ id: deleteId });
    if (res?.data?.success) {
      toast.success('Proposal deleted successfully');
      fetchProposals();
    } else {
      toast.error(res?.data?.message || 'Failed to delete proposal');
    }
    setDeleteId(null);
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Proposals"
        description="Draft, customize, and deliver commercial proposals and course estimates."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchProposals}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => router.push('/proposals/create')}
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Proposal
            </Button>
          </div>
        }
      />

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by proposal number or client name..."
            className="pl-9 h-9 text-xs bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch('')}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Proposals Table */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Proposal Records ({filteredProposals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-xs font-medium text-muted-foreground">Loading proposals...</p>
            </div>
          ) : filteredProposals.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No proposals found"
              description="Create a client proposal or adjust your search filter."
              action={
                <Button
                  onClick={() => router.push('/proposals/create')}
                  size="sm"
                  className="text-xs"
                >
                  Create Proposal
                </Button>
              }
            />
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Proposal No.</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="w-[130px]">Date</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[130px] text-right">Amount</TableHead>
                    <TableHead className="w-[130px]">Created By</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((proposal) => (
                    <TableRow
                      key={proposal.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/proposals/${proposal.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {proposal.proposalNo}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-xs text-foreground">
                          {proposal.clientName}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(proposal.createdAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={proposal.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                        {formatCurrency(proposal.totalAmount || 0)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {proposal.createdByUser || 'System'}
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
                              onClick={() => router.push(`/proposals/${proposal.id}`)}
                              className="text-xs"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              View
                            </DropdownMenuItem>
                            {proposal.status === ProposalStatus.DRAFT && (
                              <DropdownMenuItem
                                onClick={() => router.push(`/proposals/${proposal.id}/edit`)}
                                className="text-xs"
                              >
                                <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => window.open(`/api/proposals/${proposal.id}/pdf`, '_blank')}
                              className="text-xs"
                            >
                              <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Preview PDF
                            </DropdownMenuItem>
                            {proposal.status === ProposalStatus.DRAFT && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                                  onClick={() => setDeleteId(proposal.id)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this proposal draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 text-xs text-white">
              Delete Proposal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
