"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const PaymentsSummarySkeletons = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32 mt-1" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

export const PaymentsBreakdownSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 mt-2" />
              <Skeleton className="h-3 w-20 mt-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const PaymentsTableSkeleton = () => {
  return (
    <div>
      <Skeleton className="h-8 w-48 mb-4" />
      {/* Desktop skeleton */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile skeleton */}
      <div className="grid grid-cols-1 gap-4 md:hidden mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg border shadow-sm p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[...Array(4)].map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20 mt-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PaymentsPageSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          <Skeleton className="h-8 w-64" />
        </h1>
        <Skeleton className="h-10 w-32" />
      </div>

      <PaymentsSummarySkeletons />
      <PaymentsBreakdownSkeleton />
      <Skeleton className="h-px w-full my-6" />
      <PaymentsTableSkeleton />
    </div>
  );
};
