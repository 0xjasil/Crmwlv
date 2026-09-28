import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TableSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  columnWidths?: string[];
  showHeader?: boolean;
}

export function TableSkeletonRows({
  rowCount = 5,
  columnCount = 6,
  columnWidths,
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columnCount }).map((_, colIndex) => {
            const widthClass = columnWidths
              ? columnWidths[colIndex % columnWidths.length]
              : colIndex === 0
              ? 'w-[140px]'
              : colIndex === columnCount - 1
              ? 'w-[80px]'
              : 'w-[100px]';

            return (
              <TableCell key={colIndex} className="py-3">
                <Skeleton className={`h-4 ${widthClass} max-w-full`} />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}

export function TableSkeletonCard({
  rowCount = 6,
  columnCount = 6,
  columnWidths,
  title = true,
}: {
  rowCount?: number;
  columnCount?: number;
  columnWidths?: string[];
  title?: boolean;
}) {
  return (
    <Card>
      {title && (
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
      )}
      <CardContent className={title ? '' : 'pt-6'}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: columnCount }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeletonRows
                rowCount={rowCount}
                columnCount={columnCount}
                columnWidths={columnWidths}
              />
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PageHeaderSkeleton({
  hasActions = true,
  actionCount = 1,
}: {
  hasActions?: boolean;
  actionCount?: number;
}) {
  return (
    <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {hasActions && (
        <div className="flex items-center gap-2">
          {Array.from({ length: actionCount }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-md" />
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterCardSkeleton({
  filterCount = 3,
}: {
  filterCount?: number;
}) {
  return (
    <Card>
      <CardHeader className="space-y-2 pb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-60" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          <Skeleton className="h-10 flex-1 rounded-md" />
          {Array.from({ length: filterCount }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-36 rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function GenericTablePageSkeleton({
  title = 'Loading Page...',
  columnCount = 6,
  rowCount = 7,
  columnWidths,
  hasFilters = true,
  actionCount = 2,
  statCardCount = 0,
}: {
  title?: string;
  columnCount?: number;
  rowCount?: number;
  columnWidths?: string[];
  hasFilters?: boolean;
  actionCount?: number;
  statCardCount?: number;
}) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6 animate-in fade-in-50 duration-150">
      <PageHeaderSkeleton hasActions={actionCount > 0} actionCount={actionCount} />
      {statCardCount > 0 && <StatCardsSkeleton count={statCardCount} />}
      {hasFilters && <FilterCardSkeleton filterCount={2} />}
      <TableSkeletonCard
        rowCount={rowCount}
        columnCount={columnCount}
        columnWidths={columnWidths}
      />
    </div>
  );
}
