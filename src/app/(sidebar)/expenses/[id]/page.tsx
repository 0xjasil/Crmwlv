'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { getExpenseByIdAction } from '@/server/actions/expense-actions';
import { ExpenseFormDialog } from '@/components/expense/expense-form-dialog';
import { DeleteExpenseDialog } from '@/components/expense/delete-expense-dialog';
import {
  ExpenseWithRelations,
  ExpenseCategoryLabels,
  ExpenseCategoryColors,
} from '@/types/expense';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ExpenseDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const router = useRouter();
  const [expense, setExpense] = useState<ExpenseWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expenseId, setExpenseId] = useState<string | null>(null);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // Unwrap params
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setExpenseId(resolvedParams.id);
    };
    unwrapParams();
  }, [params]);

  // Fetch expense data
  const fetchExpense = useCallback(async () => {
    if (!expenseId) return;

    setIsLoading(true);
    try {
      const result = await getExpenseByIdAction({ id: expenseId });

      if (result?.data?.success) {
        setExpense(result.data.data);
      } else {
        toast.error('Expense not found');
        router.push('/expenses');
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
      toast.error('Failed to fetch expense details');
      router.push('/expenses');
    } finally {
      setIsLoading(false);
    }
  }, [expenseId, router]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleDuplicate = () => {
    setDuplicateDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchExpense(); // Refresh expense data
  };

  const handleDeleteSuccess = () => {
    router.push('/expenses');
  };

  const getCategoryBadgeClass = (category: string) => {
    return ExpenseCategoryColors[category as keyof typeof ExpenseCategoryColors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-muted-foreground">Loading expense details...</div>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Expense not found</p>
            <Button onClick={() => router.push('/expenses')} variant="outline">
              Go to Expenses
            </Button>
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
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Details</h1>
            <p className="text-gray-600">View and manage expense information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Expense Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core expense details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Title</div>
              <div className="text-lg font-semibold">{expense.title}</div>
            </div>

            {expense.description && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Description</div>
                <div className="text-sm">{expense.description}</div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Amount</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(expense.amount)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Category</div>
              <Badge className={getCategoryBadgeClass(expense.category)}>
                {ExpenseCategoryLabels[expense.category]}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Expense Date</div>
              <div className="text-sm font-medium">
                {formatDate(expense.expenseDate)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Additional details and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expense.notes && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Notes</div>
                <div className="text-sm bg-muted p-3 rounded-md">
                  {expense.notes}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Created By</div>
              <div className="text-sm font-medium">{expense.createdBy.name}</div>
              <div className="text-xs text-muted-foreground">{expense.createdBy.email}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Created Date</div>
              <div className="text-sm">
                {formatDate(expense.createdAt)}
              </div>
            </div>

            {expense.updatedAt !== expense.createdAt && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                <div className="text-sm">
                  {formatDate(expense.updatedAt)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ExpenseFormDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSuccess={handleSuccess}
        expense={expense}
        mode="edit"
      />

      <ExpenseFormDialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        onSuccess={handleSuccess}
        expense={{
          ...expense,
          id: '', // Clear ID for duplication
          title: `${expense.title} (Copy)`,
          expenseDate: new Date(),
        }}
        mode="create"
      />

      <DeleteExpenseDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={handleDeleteSuccess}
        expense={{
          id: expense.id,
          title: expense.title,
          amount: expense.amount,
        }}
      />
    </div>
  );
}