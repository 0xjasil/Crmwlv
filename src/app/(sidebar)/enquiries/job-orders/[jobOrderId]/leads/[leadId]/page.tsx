'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    User as UserIcon,
    Phone,
    Mail,
    MapPin,
    Calendar as CalendarIcon,
    Briefcase,
    ExternalLink,
    MessageSquare,
    Clock,
    PhoneCall,
    CalendarPlus,
    UserPlus,
    Edit2,
    TrendingUp,
    Building,
    GraduationCap,
    Activity,
    ArrowUpCircle,
    MessageCircle,
    Star
} from 'lucide-react';
import { getJobLead, updateJobLeadStatus } from '@/server/actions/job-order';
import { createFollowUp } from '@/server/actions/follow-up';
import { createCallLog } from '@/server/actions/call-log';
import { getEnquiryActivities } from '@/server/actions/enquiry-activity-actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ENQUIRY_STATUS_OPTIONS } from '@/constants/enquiry';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAction } from 'next-safe-action/hooks';
import { EnquiryActivity, ActivityType } from '@/types/enquiry-activity';
import { FollowUp, CallLog, EnquiryStatus, Enquiry } from '@/types/enquiry';
import { EnquiryFormDialog } from '@/components/enquiry/enquiry-form-dialog';
import { StatusUpdateDialog } from '@/components/enquiry/status-update-dialog';

// Form schemas
const followUpSchema = z.object({
    scheduledAt: z.date({
        required_error: 'A date and time is required.',
    }),
    notes: z.string().max(1000).optional(),
});

const callLogSchema = z.object({
    duration: z.number().min(0).optional(),
    outcome: z.string().min(1, 'Call outcome is required').max(500),
    notes: z.string().max(1000).optional(),
});

type FollowUpFormData = z.infer<typeof followUpSchema>;
type CallLogFormData = z.infer<typeof callLogSchema>;

interface JobLeadDetail {
    id: string;
    status: 'PENDING' | 'CLOSED';
    job: {
        id: string;
        name: string;
        description?: string | null;
        manager: {
            id: string;
            name: string;
            email: string;
        };
        branch: {
            id: string;
            name: string;
        };
    };
    lead: Enquiry & {
        assignedTo?: {
            id: string;
            name: string;
        } | null;
        preferredCourse?: {
            id: string;
            name: string;
        } | null;
        enquirySource?: {
            id: string;
            name: string;
        } | null;
        requiredService?: {
            id: string;
            name: string;
        } | null;
        branch?: {
            id: string;
            name: string;
        } | null;
    };
    assigneeId?: string | null; // From schema: assignee User
}

export default function JobLeadDetailPage({ params }: { params: Promise<{ jobOrderId: string; leadId: string }> }) {
    const { jobOrderId, leadId } = use(params);
    const router = useRouter();
    const [jobLead, setJobLead] = useState<JobLeadDetail | null>(null);

    // Activity state
    const [activities, setActivities] = useState<EnquiryActivity[]>([]);

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
    const [isCreatingCallLog, setIsCreatingCallLog] = useState(false);

    // Dialog states
    const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
    const [isCallLogDialogOpen, setIsCallLogDialogOpen] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);


    // Safe action for fetching activities
    const {
        execute: fetchActivities,
        result: activitiesResult,
        isExecuting: isFetchingActivities,
    } = useAction(getEnquiryActivities);

    // Forms
    const followUpForm = useForm<FollowUpFormData>({
        resolver: zodResolver(followUpSchema),
    });

    const callLogForm = useForm<CallLogFormData>({
        resolver: zodResolver(callLogSchema),
    });

    const fetchJobLead = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getJobLead(leadId);
            if (result.success) {
                setJobLead(result.data as JobLeadDetail);
            } else {
                toast.error(result.message || 'Failed to fetch job lead details');
                router.push(`/enquiries/job-orders/${jobOrderId}`);
            }
        } catch {
            toast.error('An error occurred while fetching job lead details');
        } finally {
            setIsLoading(false);
        }
    }, [leadId, jobOrderId, router]);

    // Fetch activities data (always fetch all activities, filter on client side)
    const loadActivities = useCallback(async () => {
        if (!jobLead?.lead?.id) return;

        setIsLoadingActivities(true);
        try {
            await fetchActivities({
                enquiryId: jobLead.lead.id,
                page: 1,
                limit: 100,
                type: undefined,
            });
        } catch (error) {
            console.error('Error loading activities:', error);
            toast.error('Failed to load activities');
        } finally {
            setIsLoadingActivities(false);
        }
    }, [jobLead?.lead?.id, fetchActivities]);

    useEffect(() => {
        fetchJobLead();
    }, [fetchJobLead]);

    useEffect(() => {
        if (jobLead?.lead) {
            // Load activities once lead is loaded
            loadActivities();
        }
    }, [jobLead?.lead?.id, loadActivities]);

    // Handle activities result
    useEffect(() => {
        if (activitiesResult?.data?.success) {
            setActivities((activitiesResult.data.data || []) as EnquiryActivity[]);
        }
    }, [activitiesResult]);

    const handleJobStatusChange = async () => {
        if (!jobLead) return;

        const newStatus = jobLead.status === 'PENDING' ? 'CLOSED' : 'PENDING';

        setIsUpdatingStatus(true);
        try {
            const result = await updateJobLeadStatus(leadId, newStatus);
            if (result.success) {
                toast.success(`Job lead marked as ${newStatus.toLowerCase()}`);
                setJobLead((prev) => {
                    if (!prev) return null;
                    return { ...prev, status: newStatus };
                });
            } else {
                toast.error(result.message || 'Failed to update status');
            }
        } catch {
            toast.error('Failed to update status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleEnquiryStatusUpdateSuccess = useCallback(() => {
        fetchJobLead();
        loadActivities();
    }, [fetchJobLead, loadActivities]);

    const handleCreateFollowUp = async (data: FollowUpFormData) => {
        if (!jobLead?.lead) return;
        setIsCreatingFollowUp(true);
        try {
            const result = await createFollowUp({
                enquiryId: jobLead.lead.id,
                scheduledAt: data.scheduledAt,
                notes: data.notes,
            });

            if (result.success) {
                toast.success(result.message);
                setIsFollowUpDialogOpen(false);
                followUpForm.reset();
                handleEnquiryStatusUpdateSuccess();
            } else {
                toast.error(result.message || 'Failed to create follow-up');
            }
        } catch {
            toast.error('Failed to create follow-up');
        } finally {
            setIsCreatingFollowUp(false);
        }
    };

    const handleCreateCallLog = async (data: CallLogFormData) => {
        if (!jobLead?.lead) return;
        setIsCreatingCallLog(true);
        try {
            const result = await createCallLog({
                enquiryId: jobLead.lead.id,
                duration: data.duration,
                outcome: data.outcome,
                notes: data.notes,
            });

            if (result.success) {
                toast.success(result.message);
                setIsCallLogDialogOpen(false);
                callLogForm.reset();
                handleEnquiryStatusUpdateSuccess();
            } else {
                toast.error(result.message || 'Failed to create call log');
            }
        } catch {
            toast.error('Failed to create call log');
        } finally {
            setIsCreatingCallLog(false);
        }
    };


    const getStatusColor = (status: string) => {
        const statusConfig = ENQUIRY_STATUS_OPTIONS.find((s) => s.value === status);
        return statusConfig?.color || 'gray';
    };

    const formatDate = (dateString: string | Date) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const calculateDaysInPipeline = (createdAt: string | Date) => {
        const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    // Activity helper functions
    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case ActivityType.STATUS_CHANGE:
                return ArrowUpCircle;
            case ActivityType.FOLLOW_UP:
                return CalendarIcon;
            case ActivityType.CALL_LOG:
                return PhoneCall;
            case ActivityType.ENROLLMENT_DIRECT:
                return GraduationCap;
            default:
                return Activity;
        }
    };

    const getActivityColor = (type: ActivityType) => {
        switch (type) {
            case ActivityType.STATUS_CHANGE:
                return 'blue';
            case ActivityType.FOLLOW_UP:
                return 'green';
            case ActivityType.CALL_LOG:
                return 'purple';
            case ActivityType.ENROLLMENT_DIRECT:
                return 'orange';
            default:
                return 'gray';
        }
    };

    const getActivityTitle = (activity: EnquiryActivity) => {
        if (activity.title) return activity.title;

        switch (activity.type) {
            case ActivityType.STATUS_CHANGE:
                return `Status changed to ${activity.newStatus}`;
            case ActivityType.FOLLOW_UP:
                return 'Follow-up created';
            case ActivityType.CALL_LOG:
                return 'Call logged';
            case ActivityType.ENROLLMENT_DIRECT:
                return 'Direct enrollment completed';
            default:
                return 'Activity recorded';
        }
    };

    // Type for unified timeline items
    type TimelineItem = {
        id: string;
        type: 'activity' | 'followup' | 'calllog';
        data: EnquiryActivity | FollowUp | CallLog;
        createdAt: string | Date;
    };

    // Merge activities with existing follow-ups and call logs for unified timeline
    const getAllActivities = (): TimelineItem[] => {
        const allItems: TimelineItem[] = [];

        // Add enquiry activities
        activities.forEach(activity => {
            allItems.push({
                id: `activity-${activity.id}`,
                type: 'activity',
                data: activity,
                createdAt: activity.createdAt,
            });
        });

        // Add follow-ups that aren't already tracked as activities
        if (jobLead?.lead?.followUps) {
            jobLead.lead.followUps.forEach(followUp => {
                const hasActivity = activities.some(a => a.followUpId === followUp.id);
                if (!hasActivity) {
                    allItems.push({
                        id: `followup-${followUp.id}`,
                        type: 'followup',
                        data: followUp,
                        createdAt: followUp.createdAt,
                    });
                }
            });
        }

        // Add call logs that aren't already tracked as activities
        if (jobLead?.lead?.callLogs) {
            jobLead.lead.callLogs.forEach(callLog => {
                const hasActivity = activities.some(a => a.callLogId === callLog.id);
                if (!hasActivity) {
                    allItems.push({
                        id: `calllog-${callLog.id}`,
                        type: 'calllog',
                        data: callLog,
                        createdAt: callLog.createdAt,
                    });
                }
            });
        }

        // Sort by creation date (newest first)
        return allItems.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    };


    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-full min-h-[500px]">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <div className="text-muted-foreground">Loading job lead details...</div>
                </div>
            </div>
        );
    }

    if (!jobLead) {
        return null;
    }

    const enquiry = jobLead.lead; // Convenience alias

    return (
        <div className="@container/main flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6 mb-20 md:mb-0">
            {/* Enhanced Header - Merged with Job Context */}
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <div className="relative z-10 p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                        {/* Top Nav Row */}
                        <div className="flex items-center justify-between">
                            <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Job Order
                            </Button>

                            {/* Job Order Context Badge */}
                            <div className="hidden md:flex items-center gap-2 bg-background/50 p-1.5 rounded-full px-3 text-xs border backdrop-blur-sm">
                                <Briefcase className="h-3.5 w-3.5 text-primary" />
                                <span className="text-muted-foreground">Job Order:</span>
                                <span className="font-medium text-foreground">{jobLead.job.name}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-2">
                            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
                                            {enquiry.candidateName}
                                        </h1>
                                        {/* Job Lead Status Badge */}
                                        <Badge
                                            variant={jobLead.status === 'PENDING' ? 'outline' : 'default'}
                                            className={jobLead.status === 'PENDING'
                                                ? 'w-fit border-orange-200 bg-orange-50 text-orange-700'
                                                : 'w-fit bg-green-600'
                                            }
                                        >
                                            Lead Status: {jobLead.status}
                                        </Badge>
                                        {/* Enquiry Status Badge */}
                                        <Badge className={cn('w-fit', getStatusColor(enquiry.status))}>
                                            Enquiry: {ENQUIRY_STATUS_OPTIONS.find((opt) => opt.value === enquiry.status)?.label ||
                                                enquiry.status}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                                        Created {formatDate(enquiry.createdAt)} • Via {enquiry.enquirySource?.name || 'Unknown'}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="relative z-20 flex flex-wrap gap-2">
                                {/* Mark as Closed Button */}
                                {/* Mark as Closed Button */}
                                {jobLead.status === 'PENDING' && (
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-md animate-in zoom-in duration-300"
                                        onClick={handleJobStatusChange}
                                        disabled={isUpdatingStatus}
                                    >
                                        {isUpdatingStatus ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        ) : (
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                        )}
                                        Mark as Closed
                                    </Button>
                                )}

                                <Link href={`tel:${enquiry.phone}`} className="relative z-30">
                                    <Button size="sm" variant="outline" className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        <span className="hidden sm:inline">Call</span>
                                    </Button>
                                </Link>
                                <Link
                                    href={`https://wa.me/91${enquiry.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative z-30"
                                >
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex items-center gap-2 text-green-600 hover:text-green-700"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        <span className="hidden sm:inline">WhatsApp</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative Background - Lower z-index */}
                <div className="absolute inset-0 z-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
                <div className="absolute right-0 top-0 z-0 -translate-y-12 translate-x-12 transform">
                    <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 opacity-20 dark:from-blue-800 dark:to-indigo-800" />
                </div>
            </div>

            {/* Enhanced Key Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md dark:from-blue-950 dark:to-blue-900">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 sm:text-3xl">
                                    {calculateDaysInPipeline(enquiry.createdAt)}
                                </p>
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:text-sm">
                                    Days in Pipeline
                                </p>
                            </div>
                            <div className="rounded-full bg-blue-200 p-2 dark:bg-blue-800">
                                <Clock className="h-4 w-4 text-blue-700 dark:text-blue-300 sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100 shadow-md dark:from-green-950 dark:to-green-900">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300 sm:text-3xl">
                                    {enquiry.followUps?.length || 0}
                                </p>
                                <p className="text-xs font-medium text-green-600 dark:text-green-400 sm:text-sm">
                                    Follow-ups
                                </p>
                            </div>
                            <div className="rounded-full bg-green-200 p-2 dark:bg-green-800">
                                <CalendarIcon className="h-4 w-4 text-green-700 dark:text-green-300 sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100 shadow-md dark:from-purple-950 dark:to-purple-900">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 sm:text-3xl">
                                    {enquiry.callLogs?.length || 0}
                                </p>
                                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 sm:text-sm">
                                    Call Logs
                                </p>
                            </div>
                            <div className="rounded-full bg-purple-200 p-2 dark:bg-purple-800">
                                <PhoneCall className="h-4 w-4 text-purple-700 dark:text-purple-300 sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-orange-100 shadow-md dark:from-orange-950 dark:to-orange-900">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-bold text-orange-700 dark:text-orange-300 sm:text-xl">
                                    {enquiry.lastContactDate
                                        ? formatDate(enquiry.lastContactDate).split(',')[0]
                                        : 'Never'}
                                </p>
                                <p className="text-xs font-medium text-orange-600 dark:text-orange-400 sm:text-sm">
                                    Last Contact
                                </p>
                            </div>
                            <div className="rounded-full bg-orange-200 p-2 dark:bg-orange-800">
                                <MessageSquare className="h-4 w-4 text-orange-700 dark:text-orange-300 sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Enhanced Action Buttons */}
            <Card className="border-0 bg-gray-50 dark:bg-gray-900/50">
                <CardContent className="relative p-4 sm:p-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {enquiry.status !== EnquiryStatus.ENROLLED ? (
                                <Link href={`/admissions?enquiryId=${enquiry.id}`} className="relative z-10 w-full">
                                    <Button
                                        className="relative z-10 w-full cursor-pointer"
                                        onClick={() => {
                                            toast.info('Taking you to the admissions page...');
                                        }}
                                    >
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Take Admission
                                    </Button>
                                </Link>
                            ) : (
                                <Button className="relative z-10 w-full cursor-not-allowed" disabled>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Already Enrolled
                                </Button>
                            )}

                            <Dialog open={isCallLogDialogOpen} onOpenChange={setIsCallLogDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="relative z-10 w-full">
                                        <PhoneCall className="mr-2 h-4 w-4" />
                                        Log Call
                                    </Button>
                                </DialogTrigger>
                            </Dialog>

                            <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="relative z-10 w-full">
                                        <CalendarPlus className="mr-2 h-4 w-4" />
                                        Schedule Follow-up
                                    </Button>
                                </DialogTrigger>
                            </Dialog>

                            <EnquiryFormDialog mode="edit" enquiry={enquiry} onSuccess={fetchJobLead} />

                            <StatusUpdateDialog
                                enquiryId={enquiry.id}
                                currentStatus={enquiry.status}
                                candidateName={enquiry.candidateName}
                                onSuccess={handleEnquiryStatusUpdateSuccess}
                                open={isStatusDialogOpen}
                                onOpenChange={setIsStatusDialogOpen}
                                trigger={
                                    <Button variant="outline" className="relative z-10 w-full">
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        Update Status
                                    </Button>
                                }
                            />

                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Call Log Dialog Content */}
            <Dialog open={isCallLogDialogOpen} onOpenChange={setIsCallLogDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log Call</DialogTitle>
                        <DialogDescription>
                            Record details about your call with {enquiry.candidateName}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={callLogForm.handleSubmit(handleCreateCallLog)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                placeholder="e.g., 15"
                                {...callLogForm.register('duration', { valueAsNumber: true })}
                            />
                            {callLogForm.formState.errors.duration && (
                                <p className="text-sm text-red-500">
                                    {callLogForm.formState.errors.duration.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="outcome">Call Outcome *</Label>
                            <Input
                                id="outcome"
                                placeholder="e.g., Interested in course, will call back"
                                {...callLogForm.register('outcome')}
                            />
                            {callLogForm.formState.errors.outcome && (
                                <p className="text-sm text-red-500">
                                    {callLogForm.formState.errors.outcome.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="callNotes">Notes</Label>
                            <Textarea
                                id="callNotes"
                                placeholder="Additional notes about the call..."
                                {...callLogForm.register('notes')}
                            />
                            {callLogForm.formState.errors.notes && (
                                <p className="text-sm text-red-500">{callLogForm.formState.errors.notes.message}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isCreatingCallLog}>
                                {isCreatingCallLog ? 'Saving...' : 'Save Call Log'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Follow-up Dialog Content */}
            <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Schedule Follow-up</DialogTitle>
                        <DialogDescription>Schedule a follow-up with {enquiry.candidateName}</DialogDescription>
                    </DialogHeader>
                    <Form {...followUpForm}>
                        <form onSubmit={followUpForm.handleSubmit(handleCreateFollowUp)} className="space-y-5">
                            <FormField
                                control={followUpForm.control}
                                name="scheduledAt"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Schedule Date & Time</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "MM/dd/yyyy h:mm aa")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                {/* Simplified Calendar - Full replication from Enquiry page recommended but abbreviated for speed here unless requested */}
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            // Default time logic 
                                                            const now = new Date();
                                                            date.setHours(now.getHours() + 1);
                                                            date.setMinutes(0);
                                                            field.onChange(date);
                                                        }
                                                    }}
                                                    initialFocus
                                                />
                                                <div className="p-3 border-t">
                                                    {/* Simple time picker fallback */}
                                                    <Input
                                                        type="time"
                                                        className="w-full"
                                                        onChange={(e) => {
                                                            if (field.value && e.target.value) {
                                                                const [h, m] = e.target.value.split(':').map(Number);
                                                                const newDate = new Date(field.value);
                                                                newDate.setHours(h);
                                                                newDate.setMinutes(m);
                                                                field.onChange(newDate);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={followUpForm.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Add any notes for the follow-up..."
                                                className="min-h-[80px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="submit" disabled={isCreatingFollowUp}>
                                    {isCreatingFollowUp ? 'Scheduling...' : 'Schedule Follow-up'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Enhanced Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800">
                    <TabsTrigger
                        value="overview"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                    >
                        <Activity className="h-4 w-4" />
                        <span className="hidden sm:inline">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="activity"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                    >
                        <Clock className="h-4 w-4" />
                        <span className="hidden sm:inline">Activity</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="notes"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Notes</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                        {/* Enhanced Contact Information */}
                        <Card className="overflow-hidden p-0">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 pt-6 pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                                        <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    Contact Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 sm:p-6">
                                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <span className="font-medium">{enquiry.phone}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`tel:${enquiry.phone}`} className="relative z-10">
                                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                                <Phone className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                        <Link
                                            href={`https://wa.me/91${enquiry.phone.replace(/[^0-9]/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative z-10"
                                        >
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                            >
                                                <MessageCircle className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {enquiry.contact2 && (
                                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                        <div className="flex items-center gap-3">
                                            <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <span className="font-medium">{enquiry.contact2}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Link href={`tel:${enquiry.contact2}`} className="relative z-10">
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                                    <Phone className="h-3 w-3" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {enquiry.email && (
                                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                        <div className="flex items-center gap-3">
                                            <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                            <span className="font-medium">{enquiry.email}</span>
                                        </div>
                                        <Link href={`mailto:${enquiry.email}`} className="relative z-10">
                                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                )}

                                {enquiry.address && (
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-1" />
                                            <span className="text-sm leading-relaxed">{enquiry.address}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Enhanced Enquiry Details */}
                        <Card className="overflow-hidden p-0">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 pt-6 pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                                        <GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    Enquiry Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 sm:p-6">
                                <div className="grid gap-4">
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full bg-blue-100 p-1 dark:bg-blue-900">
                                                <TrendingUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Source
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {enquiry.enquirySource?.name}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full bg-purple-100 p-1 dark:bg-purple-900">
                                                <Building className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Branch
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {enquiry.branch?.name}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {enquiry.preferredCourse && (
                                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-full bg-green-100 p-1 dark:bg-green-900">
                                                    <GraduationCap className="h-3 w-3 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        Preferred Course
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {enquiry.preferredCourse.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {enquiry.requiredService && (
                                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-full bg-orange-100 p-1 dark:bg-orange-900">
                                                    <MessageSquare className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        Required Service
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {enquiry.requiredService.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {enquiry.assignedTo && (
                                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-full bg-indigo-100 p-1 dark:bg-indigo-900">
                                                    <UserIcon className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        Assigned To
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {enquiry.assignedTo.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 sm:space-y-6">
                    <div className="space-y-4 sm:space-y-6">
                        {/* Enhanced Unified Activity Timeline */}
                        {isLoadingActivities || isFetchingActivities ? (
                            <Card>
                                <CardContent className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
                                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading activities...</span>
                                </CardContent>
                            </Card>
                        ) : getAllActivities().length > 0 ? (
                            <Card className="overflow-hidden p-0">
                                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950 pt-6 pb-4">
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-900">
                                            <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        Activity Timeline ({getAllActivities().length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6">
                                    <div className="space-y-4">
                                        {getAllActivities().map((item) => {
                                            // ... (Reuse timeline rendering logic same as Enquiry Detail but copied here for safety)
                                            // Since logic is identical as EnquiryDetail, I'll inline a condensed version or reuse if possible in future refactors.
                                            // For now, I'll render basic timeline items
                                            const isActivity = item.type === 'activity';
                                            const isFollowUp = item.type === 'followup';
                                            const isCallLog = item.type === 'calllog';

                                            let title = '';
                                            let desc = '';
                                            let color = 'gray';
                                            let icon = Activity;

                                            if (isActivity) {
                                                const act = item.data as EnquiryActivity;
                                                title = getActivityTitle(act);
                                                desc = act.description || '';
                                                color = getActivityColor(act.type);
                                            } else if (isFollowUp) {
                                                const fu = item.data as FollowUp;
                                                title = 'Follow-up Scheduled';
                                                desc = fu.notes || '';
                                                color = 'green';
                                                icon = CalendarIcon;
                                            } else if (isCallLog) {
                                                const cl = item.data as CallLog;
                                                title = 'Call Logged';
                                                desc = cl.outcome || '';
                                                color = 'purple';
                                                icon = PhoneCall;
                                            }

                                            return (
                                                <div key={item.id} className={cn("relative rounded-lg border p-4",
                                                    color === 'blue' && "border-blue-200 bg-blue-50",
                                                    color === 'green' && "border-green-200 bg-green-50",
                                                    color === 'purple' && "border-purple-200 bg-purple-50",
                                                    color === 'orange' && "border-orange-200 bg-orange-50",
                                                    color === 'gray' && "border-gray-200 bg-gray-50"
                                                )}>
                                                    <div className="flex justify-between">
                                                        <div className="font-medium">{title}</div>
                                                        <div className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                                                    </div>
                                                    {desc && <div className="text-sm mt-1 text-muted-foreground">{desc}</div>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="text-center py-8">
                                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-muted-foreground">No activity recorded yet.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4 sm:space-y-6">
                    <Card className="overflow-hidden p-0">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 pt-6 pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900">
                                    <MessageSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                Notes & Feedback
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                        <MessageSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                        Enquiry Notes
                                    </h4>
                                    {enquiry.notes ? (
                                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                                            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                                {enquiry.notes}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
                                            <MessageSquare className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-600" />
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                No notes available
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {enquiry.feedback && (
                                    <div>
                                        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                            Feedback
                                        </h4>
                                        <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
                                            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                                {enquiry.feedback}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
