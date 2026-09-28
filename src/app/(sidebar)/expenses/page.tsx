'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, Edit, Trash2, MoreVertical, Plus, Copy, RotateCw, WalletCards } from 'lucide-react';
import { getExpensesAction } from '@/server/actions/expense-actions';
import { ExpenseFormDialog } from '@/components/expense/expense-form-dialog';
import { DeleteExpenseDialog } from '@/components/expense/delete-expense-dialog';
import { toast } from 'sonner';
import { ExpenseWithRelations, ExpenseCategory, ExpenseCategoryLabels } from '@/types/expense';
import { formatCurrency, formatDate, truncateText } from '@/lib/utils';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export default function ExpensesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Fetch expenses data
  const fetchExpensesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExpensesAction({
        page: currentPage,
        limit: pageSize,
        search: search || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });

      if (result?.data?.success) {
        setExpenses(result.data.data || []);
        setPagination({
          page: currentPage,
          limit: pageSize,
          total: result.data.total || 0,
          pages: Math.ceil((result.data.total || 0) / pageSize),
        });
      } else {
        toast.error('Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, search, categoryFilter]);

  useEffect(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  const refreshExpenses = useCallback(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  const handleViewExpense = (expenseId: string) => {
    router.push(`/expenses/${expenseId}`);
  };

  const handleEditExpense = (expense: ExpenseWithRelations) => {
    setSelectedExpense(expense);
    setEditDialogOpen(true);
  };

  const handleDeleteExpense = (expenseId: string, title: string) => {
    setExpenseToDelete({ id: expenseId, title });
    setDeleteDialogOpen(true);
  };

  const handleDuplicateExpense = (expense: ExpenseWithRelations) => {
    setSelectedExpense({
      ...expense,
      id: '',
      title: `${expense.title} (Copy)`,
      expenseDate: new Date(),
    });
    setCreateDialogOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value as ExpenseCategory | 'all');
    setCurrentPage(1);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setSelectedExpense(null);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedExpense(null);
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Expense Tracker"
        description="Monitor operational expenditures, branch costs, and supplier payments."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={refreshExpenses}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Expense
            </Button>
          </div>
        }
      />

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, vendor, or notes..."
            className="pl-9 h-9 text-xs bg-background"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(ExpenseCategoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || categoryFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Expense Records {pagination?.total ? `(${pagination.total})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && expenses.length === 0 ? (
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px] text-right">Amount</TableHead>
                    <TableHead className="w-[140px]">Category</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[130px]">Created By</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableSkeletonRows rowCount={5} columnCount={7} />
                </TableBody>
              </Table>
            </div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={WalletCards}
              title="No expenses recorded"
              description="Record a new business expense or adjust your filter parameters."
              action={
                <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="text-xs">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Expense
                </Button>
              }
            />
          ) : (
            <div className="relative overflow-x-auto">
              {isLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[130px] text-right">Amount</TableHead>
                    <TableHead className="w-[140px]">Category</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[130px]">Created By</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => handleViewExpense(expense.id)}
                    >
                      <TableCell className="font-medium text-xs text-foreground">
                        {truncateText(expense.title, 32)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                        {expense.description ? truncateText(expense.description, 40) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground font-medium text-[11px] border border-border/70"
                        >
                          {ExpenseCategoryLabels[expense.category] || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(expense.expenseDate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {expense.createdBy.name}
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
                              onClick={() => handleViewExpense(expense.id)}
                              className="text-xs"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditExpense(expense)}
                              className="text-xs"
                            >
                              <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Edit Expense
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateExpense(expense)}
                              className="text-xs"
                            >
                              <Copy className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteExpense(expense.id, expense.title)}
                              className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && (
                <div className="p-3 border-t border-border/60 bg-muted/10">
                  <DataTablePagination
                    currentPage={pagination.page}
                    totalPages={pagination.pages || 1}
                    pageSize={pageSize}
                    totalRecords={pagination.total}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ExpenseFormDialog
        open={createDialogOpen}
        onClose={handleCreateDialogClose}
        onSuccess={refreshExpenses}
        expense={selectedExpense}
        mode="create"
      />

      <ExpenseFormDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        onSuccess={refreshExpenses}
        expense={selectedExpense}
        mode="edit"
      />

      {expenseToDelete && (
        <DeleteExpenseDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setExpenseToDelete(null);
          }}
          onSuccess={refreshExpenses}
          expense={expenseToDelete}
        />
      )}
    </PageContainer>
  );
}