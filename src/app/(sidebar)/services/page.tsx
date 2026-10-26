"use client";

import React, { Suspense } from "react";
import ServiceTable from "@/components/service/service-table";
import { PageContainer } from "@/components/ui/page-header";

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </PageContainer>
      }
    >
      <ServiceTable />
    </Suspense>
  );
}