import { ExpenseWithRelations, ExpenseCategory, ExpenseSummary } from '@/types/expense';
import { formatCurrency } from '@/lib/utils';

/**
 * Calculate total expenses from an array of expenses
 */
export function calculateTotalExpenses(expenses: ExpenseWithRelations[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

/**
 * Calculate expenses by category
 */
export function calculateExpensesByCategory(
  expenses: ExpenseWithRelations[]
): Record<ExpenseCategory, number> {
  const categoryTotals = Object.keys(ExpenseCategory).reduce(
    (acc, category) => ({ ...acc, [category]: 0 }),
    {} as Record<ExpenseCategory, number>
  );

  expenses.forEach((expense) => {
    categoryTotals[expense.category] += expense.amount;
  });

  return categoryTotals;
}

/**
 * Calculate expenses by month
 */
export function calculateExpensesByMonth(
  expenses: ExpenseWithRelations[]
): Record<string, number> {
  const monthlyTotals: Record<string, number> = {};

  expenses.forEach((expense) => {
    const date = new Date(expense.expenseDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = 0;
    }
    monthlyTotals[monthKey] += expense.amount;
  });

  return monthlyTotals;
}

/**
 * Calculate comprehensive expense summary
 */
export function calculateExpenseSummary(expenses: ExpenseWithRelations[]): ExpenseSummary {
  return {
    totalExpenses: calculateTotalExpenses(expenses),
    expensesByCategory: calculateExpensesByCategory(expenses),
    expensesByMonth: calculateExpensesByMonth(expenses),
    totalCount: expenses.length,
  };
}

/**
 * Get expenses for current month
 */
export function getCurrentMonthExpenses(expenses: ExpenseWithRelations[]): ExpenseWithRelations[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return expenses.filter((expense) => {
    const expenseDate = new Date(expense.expenseDate);
    return (
      expenseDate.getMonth() === currentMonth &&
      expenseDate.getFullYear() === currentYear
    );
  });
}

/**
 * Get expenses for current year
 */
export function getCurrentYearExpenses(expenses: ExpenseWithRelations[]): ExpenseWithRelations[] {
  const currentYear = new Date().getFullYear();

  return expenses.filter((expense) => {
    const expenseDate = new Date(expense.expenseDate);
    return expenseDate.getFullYear() === currentYear;
  });
}

/**
 * Get expenses within date range
 */
export function getExpensesInDateRange(
  expenses: ExpenseWithRelations[],
  startDate: Date,
  endDate: Date
): ExpenseWithRelations[] {
  return expenses.filter((expense) => {
    const expenseDate = new Date(expense.expenseDate);
    return expenseDate >= startDate && expenseDate <= endDate;
  });
}

/**
 * Get top categories by expense amount
 */
export function getTopExpenseCategories(
  expenses: ExpenseWithRelations[],
  limit: number = 5
): Array<{ category: ExpenseCategory; amount: number; count: number }> {
  const categoryData = Object.values(ExpenseCategory).map((category) => {
    const categoryExpenses = expenses.filter((expense) => expense.category === category);
    return {
      category,
      amount: calculateTotalExpenses(categoryExpenses),
      count: categoryExpenses.length,
    };
  });

  return categoryData
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Calculate average expense amount
 */
export function calculateAverageExpense(expenses: ExpenseWithRelations[]): number {
  if (expenses.length === 0) return 0;
  return calculateTotalExpenses(expenses) / expenses.length;
}

/**
 * Get expenses by user
 */
export function getExpensesByUser(
  expenses: ExpenseWithRelations[],
  userId: string
): ExpenseWithRelations[] {
  return expenses.filter((expense) => expense.createdById === userId);
}

/**
 * Format expense summary for display
 */
export function formatExpenseSummaryForDisplay(summary: ExpenseSummary): {
  totalExpenses: string;
  totalCount: string;
  averageExpense: string;
} {
  const averageExpense = summary.totalCount > 0
    ? summary.totalExpenses / summary.totalCount
    : 0;

  return {
    totalExpenses: formatCurrency(summary.totalExpenses),
    totalCount: summary.totalCount.toString(),
    averageExpense: formatCurrency(averageExpense),
  };
}

/**
 * Get recent expenses (last N days)
 */
export function getRecentExpenses(
  expenses: ExpenseWithRelations[],
  days: number = 30
): ExpenseWithRelations[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return expenses
    .filter((expense) => new Date(expense.expenseDate) >= cutoffDate)
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
}

/**
 * Calculate month-over-month growth
 */
export function calculateMonthOverMonthGrowth(expenses: ExpenseWithRelations[]): {
  currentMonth: number;
  previousMonth: number;
  growthPercentage: number;
} {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.expenseDate);
    return (
      expenseDate.getMonth() === currentMonth &&
      expenseDate.getFullYear() === currentYear
    );
  });

  const previousMonthExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.expenseDate);
    return (
      expenseDate.getMonth() === previousMonth &&
      expenseDate.getFullYear() === previousYear
    );
  });

  const currentTotal = calculateTotalExpenses(currentMonthExpenses);
  const previousTotal = calculateTotalExpenses(previousMonthExpenses);

  const growthPercentage = previousTotal > 0
    ? ((currentTotal - previousTotal) / previousTotal) * 100
    : 0;

  return {
    currentMonth: currentTotal,
    previousMonth: previousTotal,
    growthPercentage,
  };
}