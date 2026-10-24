"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  ClipboardCheck,
  FileCheck2,
  Truck,
  Wrench,
  Sun,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { updateAdmission } from "@/server/actions/admission-actions";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AdmissionStatus } from "@prisma/client";

export type InstallationStage =
  | "SURVEY_COMPLETED"
  | "DOCUMENTS_VERIFIED"
  | "MATERIAL_DISPATCHED"
  | "INSTALLATION_IN_PROGRESS"
  | "INSTALLED";

export interface TimelineMilestone {
  key: InstallationStage;
  stepNumber: number;
  title: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const INSTALLATION_MILESTONES: TimelineMilestone[] = [
  {
    key: "SURVEY_COMPLETED",
    stepNumber: 1,
    title: "Pre-Installation Survey",
    shortLabel: "Survey Completed",
    description: "Site feasibility, roof condition & customer KYC documents collected",
    icon: ClipboardCheck,
  },
  {
    key: "DOCUMENTS_VERIFIED",
    stepNumber: 2,
    title: "KYC & Subsidy Feasibility",
    shortLabel: "Documents Verified",
    description: "KSEB electricity bill, sanction load & DBT subsidy eligibility verified",
    icon: FileCheck2,
  },
  {
    key: "MATERIAL_DISPATCHED",
    stepNumber: 3,
    title: "Procurement & Dispatch",
    shortLabel: "Material Dispatched",
    description: "Solar PV panels, inverter, mounting rails & DC cables dispatched to site",
    icon: Truck,
  },
  {
    key: "INSTALLATION_IN_PROGRESS",
    stepNumber: 4,
    title: "Rooftop Solar Installation",
    shortLabel: "Installation In Progress",
    description: "Structure erection, solar panel mounting, inverter setup & wiring",
    icon: Wrench,
  },
  {
    key: "INSTALLED",
    stepNumber: 5,
    title: "Grid Net-Metering & Commissioned",
    shortLabel: "Installed & Active",
    description: "KSEB net-meter installed, safety test passed & solar system commissioned",
    icon: Sun,
  },
];

interface InstallationTimelineCardProps {
  admissionId: string;
  createdAt: Date | string;
  createdByUserName?: string;
  currentStatus: AdmissionStatus;
  additionalNotes?: string | null;
  isAdmin?: boolean;
}

export function InstallationTimelineCard({
  admissionId,
  createdAt,
  createdByUserName,
  currentStatus,
  additionalNotes,
  isAdmin = true,
}: InstallationTimelineCardProps) {
  const router = useRouter();

  // Parse existing timeline step from additionalNotes if available
  let initialStage: InstallationStage = "SURVEY_COMPLETED";
  let parsedNotesObj: Record<string, any> = {};

  if (additionalNotes) {
    try {
      parsedNotesObj = JSON.parse(additionalNotes);
      if (parsedNotesObj && parsedNotesObj.timelineStep) {
        initialStage = parsedNotesObj.timelineStep;
      } else if (currentStatus === "COMPLETED") {
        initialStage = "INSTALLED";
      } else if (currentStatus === "CONFIRMED") {
        initialStage = "INSTALLATION_IN_PROGRESS";
      }
    } catch {
      // Legacy note
      if (currentStatus === "COMPLETED") initialStage = "INSTALLED";
    }
  }

  const [currentStage, setCurrentStage] = useState<InstallationStage>(initialStage);
  const [selectedStage, setSelectedStage] = useState<InstallationStage>(initialStage);

  const currentIndex = INSTALLATION_MILESTONES.findIndex((m) => m.key === currentStage);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const isFullyInstalled = currentStage === "INSTALLED";

  const { execute: executeUpdate, isExecuting } = useAction(updateAdmission, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setCurrentStage(selectedStage);
        toast.success(
          selectedStage === "INSTALLED"
            ? "Solar project marked as fully INSTALLED!"
            : `Timeline updated to ${INSTALLATION_MILESTONES.find((m) => m.key === selectedStage)?.shortLabel}!`
        );
        router.refresh();
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to update timeline status");
    },
  });

  const handleUpdateStage = () => {
    if (selectedStage === currentStage) return;

    // Map stage to database AdmissionStatus
    let dbStatus: AdmissionStatus = "PENDING";
    if (selectedStage === "INSTALLED") {
      dbStatus = "COMPLETED";
    } else if (
      selectedStage === "INSTALLATION_IN_PROGRESS" ||
      selectedStage === "MATERIAL_DISPATCHED"
    ) {
      dbStatus = "CONFIRMED";
    }

    const updatedNotesPayload = JSON.stringify({
      ...parsedNotesObj,
      timelineStep: selectedStage,
      timelineUpdatedAt: new Date().toISOString(),
      ...(selectedStage === "INSTALLED" ? { installedAt: new Date().toISOString() } : {}),
    });

    executeUpdate({
      id: admissionId,
      status: dbStatus,
      additionalNotes: updatedNotesPayload,
    });
  };

  const createdDateObj = new Date(createdAt);

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border/60 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base font-semibold">
                Installation Progress Timeline
              </CardTitle>
              {isFullyInstalled ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs gap-1 border-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Installed ✓
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Step {activeIndex + 1} of {INSTALLATION_MILESTONES.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1 text-muted-foreground font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Created: {format(createdDateObj, "dd MMM yyyy, hh:mm a")}
                {createdByUserName ? ` by ${createdByUserName}` : ""}
              </span>
            </CardDescription>
          </div>

          {/* Quick Stage Update for Admins */}
          {isAdmin && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <Select
                value={selectedStage}
                onValueChange={(val) => setSelectedStage(val as InstallationStage)}
              >
                <SelectTrigger className="h-8 text-xs w-[190px] bg-background">
                  <SelectValue placeholder="Update Stage" />
                </SelectTrigger>
                <SelectContent>
                  {INSTALLATION_MILESTONES.map((milestone) => (
                    <SelectItem key={milestone.key} value={milestone.key} className="text-xs">
                      {milestone.stepNumber}. {milestone.shortLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={selectedStage === "INSTALLED" ? "default" : "outline"}
                disabled={isExecuting || selectedStage === currentStage}
                onClick={handleUpdateStage}
                className="h-8 text-xs gap-1 font-medium"
              >
                {isExecuting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Save Step
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {/* Horizontal / Vertical Timeline Stepper */}
        <div className="relative">
          <div className="space-y-4">
            {INSTALLATION_MILESTONES.map((milestone, index) => {
              const isPast = index < activeIndex;
              const isCurrent = index === activeIndex;
              const isFuture = index > activeIndex;

              const Icon = milestone.icon;

              return (
                <div key={milestone.key} className="relative flex items-start gap-3.5">
                  {/* Connecting Line */}
                  {index < INSTALLATION_MILESTONES.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 -bottom-4 w-0.5 transition-colors ${
                        isPast ? "bg-emerald-500" : "bg-border"
                      }`}
                    />
                  )}

                  {/* Step Bubble Icon */}
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all ${
                      isPast
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                        : isCurrent
                        ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 shadow-md"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Icon className="h-4 w-4" />
                    ) : (
                      <span>{milestone.stepNumber}</span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-xs font-semibold ${
                            isCurrent
                              ? "text-primary font-bold"
                              : isPast
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          Step {milestone.stepNumber}: {milestone.title}
                        </h4>
                        {isCurrent && (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0 uppercase tracking-wider font-semibold animate-pulse"
                          >
                            Current Stage
                          </Badge>
                        )}
                        {isPast && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0"
                          >
                            Completed ✓
                          </Badge>
                        )}
                      </div>

                      {/* Timestamp display for first step (creation date) or installed date */}
                      {index === 0 && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {format(createdDateObj, "dd MMM yyyy")}
                        </span>
                      )}
                      {milestone.key === "INSTALLED" && isFullyInstalled && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Installed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highlight Banner if fully installed */}
        {isFullyInstalled && (
          <div className="mt-5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              <strong>Solar Plant Installed & Commissioned:</strong> The solar system has completed
              physical installation, KSEB net-meter synchronization, and is producing clean solar energy.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
