export interface ReportsStats {
  totalEnquiries: {
    count: number;
    trend: {
      value: string;
      type: 'up' | 'down';
    };
  };
  newEnquiries: {
    count: number;
    trend: {
      value: string;
      type: 'up' | 'down';
    };
  };
  pendingFollowUps: {
    count: number;
    trend: {
      value: string;
      type: 'up' | 'down';
    };
  };
  todaysCalls: {
    count: number;
    trend: {
      value: string;
      type: 'up' | 'down';
    };
  };
}

export interface EnquiryStatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

export interface ReportsData {
  stats: ReportsStats;
  statusDistribution: EnquiryStatusDistribution[];
  monthlyTrend: MonthlyTrend[];
}

// ✅ NEW ENHANCED TYPES FOR ADVANCED REPORTING SYSTEM

// === COMMON REPORT INTERFACES ===
export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export interface ReportFilters {
  dateRange?: DateRangeFilter;
  branchId?: string;
  courseId?: string;
  userId?: string;
  status?: string;
  search?: string;
}

export interface CSVRow {
  [key: string]: string | number | Date | null;
}

export interface CSVExportData {
  filename: string;
  headers: string[];
  rows: string[][];
}

export interface ExportableReport {
  exportToCSV: () => Promise<CSVExportData>;
}

export interface ReportExportOptions {
  includeHeaders?: boolean;
  dateFormat?: string;
  currencyFormat?: string;
  excludeColumns?: string[];
}

// === TELECALLER REPORT TYPES ===
export interface TelecallerPerformanceMetrics {
  telecallerId: string;
  telecallerName: string;
  totalEnquiries: number;
  callsMade: number;
  conversions: number;
  conversionRate: number;
  averageCallDuration: number;
  followUpCompletion: number;
  responseTime: number; // in hours
  period: DateRangeFilter;
}

export interface TelecallerEnquiryStats {
  telecallerId: string;
  telecallerName: string;
  newEnquiries: number;
  contactedEnquiries: number;
  interestedEnquiries: number;
  enrolledEnquiries: number;
  droppedEnquiries: number;
  statusDistribution: EnquiryStatusDistribution[];
}

export interface TelecallerReport {
  performance: TelecallerPerformanceMetrics[];
  enquiryStats: TelecallerEnquiryStats[];
  totalTelecallers: number;
  topPerformer: string;
  filters: ReportFilters;
}

// === BRANCH REPORT TYPES ===
export interface BranchPerformanceMetrics {
  branchId: string;
  branchName: string;
  totalEnquiries: number;
  totalAdmissions: number;
  conversionRate: number;
  totalRevenue: number;
  activeStudents: number;
  averageEnquiryValue: number;
  period: DateRangeFilter;
}

export interface BranchEnquiryDistribution {
  branchId: string;
  branchName: string;
  enquiryCount: number;
  percentage: number;
  coursePreferences: {
    courseId: string;
    courseName: string;
    count: number;
  }[];
}

export interface BranchReport {
  performance: BranchPerformanceMetrics[];
  enquiryDistribution: BranchEnquiryDistribution[];
  totalBranches: number;
  topPerformingBranch: string;
  filters: ReportFilters;
}

// === FINANCIAL REPORT TYPES ===
export interface AdmissionPaymentDetails {
  studentId: string;
  studentName: string;
  admissionId: string;
  totalFees: number;
  paidAmount: number;
  agentDiscount: number;
  outstandingAmount: number;
  nextDueDate: Date | null;
  paymentHistory: {
    receiptNumber: string;
    amount: number;
    paymentDate: Date;
    paymentMode: string;
  }[];
  status: 'fully_paid' | 'partially_paid' | 'overdue' | 'pending';
}

export interface AdmissionPaymentReport {
  students: AdmissionPaymentDetails[];
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  paymentModeBreakdown: {
    mode: string;
    amount: number;
    count: number;
  }[];
  filters: ReportFilters;
}

export interface ExpenseBreakdown {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  monthlyTrend: {
    month: string;
    amount: number;
  }[];
}

export interface ExpenseReport {
  breakdown: ExpenseBreakdown[];
  totalExpenses: number;
  topCategory: string;
  monthlyTrend: MonthlyTrend[];
  userWiseExpenses: {
    userId: string;
    userName: string;
    totalAmount: number;
    transactionCount: number;
  }[];
  filters: ReportFilters;
}

export interface InvoiceStatusBreakdown {
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface InvoiceReport {
  statusBreakdown: InvoiceStatusBreakdown[];
  totalRevenue: number;
  outstandingAmount: number;
  averageCollectionTime: number; // in days
  paymentTimeline: {
    period: string;
    collected: number;
    pending: number;
  }[];
  agingAnalysis: {
    range: string; // e.g., "0-30 days", "31-60 days"
    count: number;
    amount: number;
  }[];
  filters: ReportFilters;
}

export interface IncomeSource {
  source: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface IncomeReport {
  totalIncome: number;
  sources: IncomeSource[];
  monthlyRevenue: {
    month: string;
    amount: number;
    growth: number; // percentage growth from previous month
    invoiceCount?: number;
  }[];
  paymentMethodDistribution: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  detailedTransactions?: {
    id: string;
    invoiceNumber: string;
    clientName: string;
    description: string;
    amount: number;
    date: Date;
    itemCount: number;
    category: string;
  }[];
  filters: ReportFilters;
}

export interface PendingPaymentDetails {
  studentId: string;
  studentName: string;
  contactNumber: string;
  course: string;
  outstandingAmount: number;
  agentDiscount: number;
  daysOverdue: number;
  lastPaymentDate: Date | null;
  nextDueDate: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface PendingPaymentReport {
  students: PendingPaymentDetails[];
  totalOutstanding: number;
  totalStudents: number;
  agingAnalysis: {
    range: string;
    count: number;
    amount: number;
  }[];
  collectionTargets: {
    thisWeek: number;
    thisMonth: number;
    thisQuarter: number;
  };
  filters: ReportFilters;
}

// === UNIFIED REPORT TYPES ===
export type ReportType =
  | 'telecaller'
  | 'branch'
  | 'admission-payment'
  | 'expense'
  | 'invoice'
  | 'income'
  | 'pending-payment';

export interface BaseReport {
  type: ReportType;
  title: string;
  description: string;
  generatedAt: Date;
  generatedBy: string;
  filters: ReportFilters;
}

export type AllReports =
  | (TelecallerReport & BaseReport)
  | (BranchReport & BaseReport)
  | (AdmissionPaymentReport & BaseReport)
  | (ExpenseReport & BaseReport)
  | (InvoiceReport & BaseReport)
  | (IncomeReport & BaseReport)
  | (PendingPaymentReport & BaseReport);

// === REPORT GENERATION OPTIONS ===
export interface ReportGenerationOptions {
  filters: ReportFilters;
  exportFormat?: 'csv' | 'pdf';
  includeCharts?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// === DASHBOARD SUMMARY TYPES ===
export interface ReportSummaryCard {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    type: 'up' | 'down' | 'neutral';
  };
  icon: string;
  color: string;
}

export interface ReportDashboardData {
  summaryCards: ReportSummaryCard[];
  availableReports: {
    type: ReportType;
    title: string;
    description: string;
    lastGenerated?: Date;
    canAccess: boolean;
  }[];
  recentActivity: {
    action: string;
    user: string;
    timestamp: Date;
    reportType: ReportType;
  }[];
}
