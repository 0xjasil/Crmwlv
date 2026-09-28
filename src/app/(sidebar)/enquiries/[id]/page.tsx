'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Phone,
  Mail,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Building,
  GraduationCap,
  MessageSquare,
  PhoneCall,
  CalendarPlus,
  ArrowLeft,
  UserPlus,
  MapPin,
  ExternalLink,
  MessageCircle,
  Star,
  TrendingUp,
  Activity,
  Edit2,
  ArrowUpCircle,
  FileText,

} from 'lucide-react';
import { getEnquiry } from '@/server/actions/enquiry';
import { createFollowUp } from '@/server/actions/follow-up';
import { createCallLog } from '@/server/actions/call-log';
import { getEnquiryActivities } from '@/server/actions/enquiry-activity-actions';
import { ENQUIRY_STATUS_OPTIONS } from '@/constants/enquiry';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { EnquiryStatus, Enquiry, FollowUp, CallLog } from '@/types/enquiry';
import { EnquiryActivity, ActivityType } from '@/types/enquiry-activity';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAction } from 'next-safe-action/hooks';
import { authClient } from '@/lib/auth-client';

const EnquiryFormDialog = dynamic(
  () => import('@/components/enquiry/enquiry-form-dialog').then((mod) => mod.EnquiryFormDialog),
  { ssr: false }
);
const AssignEnquiryDialog = dynamic(
  () => import('@/components/enquiry/assign-enquiry-dialog').then((mod) => mod.AssignEnquiryDialog),
  { ssr: false }
);
const StatusUpdateDialog = dynamic(
  () => import('@/components/enquiry/status-update-dialog').then((mod) => mod.StatusUpdateDialog),
  { ssr: false }
);

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

export default function EnquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enquiryId = params.id as string;
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role?.toLowerCase();
  const canAssign = userRole === 'admin' || userRole === 'manager';

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [activities, setActivities] = useState<EnquiryActivity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isCreatingCallLog, setIsCreatingCallLog] = useState(false);

  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [isCallLogDialogOpen, setIsCallLogDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const [fixedBranchId, setFixedBranchId] = useState("");
  const [fixedBranchName, setFixedBranchName] = useState("");

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

  // Fetch enquiry data
  const fetchEnquiry = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getEnquiry(enquiryId);
      if (result.success) {
        setEnquiry(result.data as Enquiry);
      } else {
        toast.error(result.message || 'Failed to fetch enquiry');
      }
    } catch {
      toast.error('Failed to fetch enquiry');
    } finally {
      setIsLoading(false);
    }
  }, [enquiryId]);

  useEffect(()=>{
    if(enquiry?.branch && enquiry.branch.id){
      setFixedBranchId(enquiry.branch?.id);
      setFixedBranchName(enquiry.branch?.name);
    }else{
      console.log("dnote kldjfnf")
    }
  },[enquiry?.branch?.id,enquiry?.branch?.name])

  // Fetch activities data (always fetch all activities, filter on client side)
  const loadActivities = useCallback(async () => {
    if (!enquiryId) return;

    setIsLoadingActivities(true);
    try {
      await fetchActivities({
        enquiryId,
        page: 1,
        limit: 100,
        // Don't send filter to server - we'll filter on client side
        type: undefined,
      });
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setIsLoadingActivities(false);
    }
  }, [enquiryId, fetchActivities]);

  const [activeTab, setActiveTab] = useState('overview');
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  // Handle activities result
  useEffect(() => {
    if (activitiesResult?.data?.success) {
      setActivities((activitiesResult.data.data || []) as EnquiryActivity[]);
    } else if (activitiesResult?.serverError) {
      toast.error(`Error loading activities: ${activitiesResult.serverError}`);
    }
  }, [activitiesResult]);

  useEffect(() => {
    if (enquiryId) {
      fetchEnquiry();
    }
  }, [enquiryId, fetchEnquiry]);

  useEffect(() => {
    if (activeTab === 'activity' && !activitiesLoaded && enquiryId) {
      loadActivities();
      setActivitiesLoaded(true);
    }
  }, [activeTab, activitiesLoaded, enquiryId, loadActivities]);

  // Handle successful status update
  const handleStatusUpdateSuccess = useCallback(() => {
    fetchEnquiry();
    if (activitiesLoaded) {
      loadActivities();
    }
  }, [fetchEnquiry, activitiesLoaded, loadActivities]);

  const handleCreateFollowUp = async (data: FollowUpFormData) => {
    setIsCreatingFollowUp(true);
    try {
      const result = await createFollowUp({
        enquiryId,
        scheduledAt: data.scheduledAt,
        notes: data.notes,
      });

      if (result.success) {
        toast.success(result.message);
        setIsFollowUpDialogOpen(false);
        followUpForm.reset();
        handleStatusUpdateSuccess();
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
    setIsCreatingCallLog(true);
    try {
      const result = await createCallLog({
        enquiryId,
        duration: data.duration,
        outcome: data.outcome,
        notes: data.notes,
      });

      if (result.success) {
        toast.success(result.message);
        setIsCallLogDialogOpen(false);
        callLogForm.reset();
        handleStatusUpdateSuccess();
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
    if (enquiry?.followUps) {
      enquiry.followUps.forEach(followUp => {
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
    if (enquiry?.callLogs) {
      enquiry.callLogs.forEach(callLog => {
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

  if (!enquiry) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{isLoading ? 'Loading...' : 'Enquiry not found'}</p>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <div className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
                className="relative z-20 flex shrink-0 items-center shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
                    {enquiry.candidateName}
                  </h1>
                  <Badge className={cn('w-fit', getStatusColor(enquiry.status))}>
                    {ENQUIRY_STATUS_OPTIONS.find((opt) => opt.value === enquiry.status)?.label ||
                      enquiry.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                  Enquiry Details • Created {formatDate(enquiry.createdAt)}
                  {enquiry.status === 'ENROLLED' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✓ Admission Completed
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="relative z-20 flex flex-wrap gap-2">
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
              {enquiry.email && (
                <Link href={`mailto:${enquiry.email}`} className="relative z-30">
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </Button>
                </Link>
              )}
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
                      if (enquiry.status === EnquiryStatus.ENROLLED) {
                        toast.info(
                          'This enquiry has already been enrolled. Check the admissions section for details.'
                        );
                        return;
                      }
                      toast.info('Taking you to the admissions page to complete the enrollment...');
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

              {canAssign && (
                <Button 
                  variant="outline" 
                  className="relative z-10 w-full"
                  onClick={() => setIsAssignDialogOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {enquiry.assignedTo ? 'Reassign' : 'Assign'}
                </Button>
              )}

              <EnquiryFormDialog mode="edit" enquiry={enquiry} onSuccess={fetchEnquiry} />

              <Button 
                    variant="outline" 
                    className="relative z-10 w-full"
                    onClick={() => router.push(`/proposals/create?enquiryId=${enquiry.id}`)}
                >
                    <FileText className="mr-2 h-4 w-4" />
                    Create Proposal
              </Button>

              <StatusUpdateDialog
                enquiryId={enquiry.id}
                currentStatus={enquiry.status}
                candidateName={enquiry.candidateName}
                onSuccess={handleStatusUpdateSuccess}
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
                    <FormLabel>Schedule Date & Time (12h format)</FormLabel>
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
                              format(field.value, "MM/dd/yyyy hh:mm aa")
                            ) : (
                              <span>MM/DD/YYYY hh:mm aa</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <div className="sm:flex">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                // If no time is set, default to current time
                                if (!field.value) {
                                  const now = new Date();
                                  date.setHours(now.getHours());
                                  date.setMinutes(Math.ceil(now.getMinutes() / 5) * 5); // Round to nearest 5 minutes
                                } else {
                                  // Preserve existing time
                                  date.setHours(field.value.getHours());
                                  date.setMinutes(field.value.getMinutes());
                                }
                                field.onChange(date);
                              }
                            }}
                            initialFocus
                          />
                          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                            <ScrollArea className="w-64 sm:w-auto">
                              <div className="flex sm:flex-col p-2">
                                {Array.from({ length: 12 }, (_, i) => i + 1)
                                  .reverse()
                                  .map((hour) => (
                                    <Button
                                      key={hour}
                                      size="icon"
                                      variant={
                                        field.value &&
                                        field.value.getHours() % 12 === hour % 12
                                          ? "default"
                                          : "ghost"
                                      }
                                      className="sm:w-full shrink-0 aspect-square"
                                      onClick={() => {
                                        const currentDate = field.value || new Date();
                                        const newDate = new Date(currentDate);
                                        const currentHour = newDate.getHours();
                                        const isPM = currentHour >= 12;
                                        newDate.setHours(isPM ? hour + 12 : hour);
                                        field.onChange(newDate);
                                      }}
                                    >
                                      {hour}
                                    </Button>
                                  ))}
                              </div>
                              <ScrollBar
                                orientation="horizontal"
                                className="sm:hidden"
                              />
                            </ScrollArea>
                            <ScrollArea className="w-64 sm:w-auto">
                              <div className="flex sm:flex-col p-2">
                                {Array.from({ length: 12 }, (_, i) => i * 5).map(
                                  (minute) => (
                                    <Button
                                      key={minute}
                                      size="icon"
                                      variant={
                                        field.value &&
                                        field.value.getMinutes() === minute
                                          ? "default"
                                          : "ghost"
                                      }
                                      className="sm:w-full shrink-0 aspect-square"
                                      onClick={() => {
                                        const currentDate = field.value || new Date();
                                        const newDate = new Date(currentDate);
                                        newDate.setMinutes(minute);
                                        field.onChange(newDate);
                                      }}
                                    >
                                      {minute.toString().padStart(2, "0")}
                                    </Button>
                                  )
                                )}
                              </div>
                              <ScrollBar
                                orientation="horizontal"
                                className="sm:hidden"
                              />
                            </ScrollArea>
                            <ScrollArea className="">
                              <div className="flex sm:flex-col p-2">
                                {["AM", "PM"].map((ampm) => (
                                  <Button
                                    key={ampm}
                                    size="icon"
                                    variant={
                                      field.value &&
                                      ((ampm === "AM" &&
                                        field.value.getHours() < 12) ||
                                        (ampm === "PM" &&
                                          field.value.getHours() >= 12))
                                        ? "default"
                                        : "ghost"
                                    }
                                    className="sm:w-full shrink-0 aspect-square"
                                    onClick={() => {
                                      const currentDate = field.value || new Date();
                                      const newDate = new Date(currentDate);
                                      const hours = newDate.getHours();
                                      if (ampm === "AM" && hours >= 12) {
                                        newDate.setHours(hours - 12);
                                      } else if (ampm === "PM" && hours < 12) {
                                        newDate.setHours(hours + 12);
                                      }
                                      field.onChange(newDate);
                                    }}
                                  >
                                    {ampm}
                                  </Button>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Please select your preferred date and time for the follow-up.
                    </FormDescription>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFollowUpDialogOpen(false)}
                  disabled={isCreatingFollowUp}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingFollowUp}>
                  {isCreatingFollowUp ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Schedule Follow-up
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog Content - Replaced with Component */}
      {
                (fixedBranchId && fixedBranchId ) &&<AssignEnquiryDialog
                open={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                enquiryId={enquiry.id}
                currentAssigneeId={enquiry.assignedTo?.id}
                candidateName={enquiry.candidateName}
                fixedBranchId={fixedBranchId}
                fixedBranchName={fixedBranchName}
                onSuccess={fetchEnquiry}
              />
              }

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                      <Link
                        href={`https://wa.me/91${enquiry.contact2.replace(/[^0-9]/g, '')}`}
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

                  {enquiry.createdBy && (
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-indigo-100 p-1 dark:bg-indigo-900">
                          <UserIcon className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Created By
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {enquiry.createdBy.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {enquiry.assignedBy && (
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-indigo-100 p-1 dark:bg-indigo-900">
                          <UserIcon className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Assigned By
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {enquiry.assignedBy.name}
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
                      if (item.type === 'activity') {
                        const activity = item.data as EnquiryActivity;
                        const ActivityIcon = getActivityIcon(activity.type);
                        const color = getActivityColor(activity.type);

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "relative rounded-lg border p-4",
                              {
                                "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950": color === 'blue',
                                "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950": color === 'green',
                                "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950": color === 'purple',
                                "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950": color === 'orange',
                              }
                            )}
                          >
                            <div className={cn("absolute left-0 top-0 h-full w-1", {
                              "bg-blue-500": color === 'blue',
                              "bg-green-500": color === 'green',
                              "bg-purple-500": color === 'purple',
                              "bg-orange-500": color === 'orange',
                            })} />
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn("rounded-full p-2", {
                                  "bg-blue-100 dark:bg-blue-900": color === 'blue',
                                  "bg-green-100 dark:bg-green-900": color === 'green',
                                  "bg-purple-100 dark:bg-purple-900": color === 'purple',
                                  "bg-orange-100 dark:bg-orange-900": color === 'orange',
                                })}>
                                  <ActivityIcon className={cn("h-4 w-4", {
                                    "text-blue-600 dark:text-blue-400": color === 'blue',
                                    "text-green-600 dark:text-green-400": color === 'green',
                                    "text-purple-600 dark:text-purple-400": color === 'purple',
                                    "text-orange-600 dark:text-orange-400": color === 'orange',
                                  })} />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {getActivityTitle(activity)}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    by {activity.createdBy.name} • {formatDate(activity.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {activity.type === ActivityType.STATUS_CHANGE && activity.newStatus && (
                                <Badge variant="secondary" className="w-fit">
                                  {activity.newStatus}
                                </Badge>
                              )}
                            </div>
                            {activity.description && (
                              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                                {activity.description}
                              </p>
                            )}
                            {activity.statusRemarks && (
                              <div className="mt-2 rounded-lg bg-white p-2 dark:bg-gray-800">
                                <p className="text-sm">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    Remarks:
                                  </span>{' '}
                                  {activity.statusRemarks}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      } else if (item.type === 'followup') {
                        const followUp = item.data as FollowUp;
                        return (
                          <div
                            key={item.id}
                        className="relative rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950"
                      >
                            <div className="absolute left-0 top-0 h-full w-1 bg-green-500" />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                              <CalendarIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                    Follow-up Scheduled
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                    for {formatDate(followUp.scheduledAt)} • by {followUp.createdBy.name}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="w-fit">
                            {followUp.status}
                          </Badge>
                        </div>
                        {followUp.notes && (
                          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                            {followUp.notes}
                          </p>
                        )}
                        {followUp.outcome && (
                          <div className="mt-2 rounded-lg bg-white p-2 dark:bg-gray-800">
                            <p className="text-sm">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                Outcome:
                              </span>{' '}
                              {followUp.outcome}
                            </p>
                          </div>
                        )}
                      </div>
                        );
                      } else if (item.type === 'calllog') {
                        const callLog = item.data as CallLog;
                        return (
                          <div
                            key={item.id}
                        className="relative rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950"
                      >
                            <div className="absolute left-0 top-0 h-full w-1 bg-purple-500" />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                              <PhoneCall className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                    Call Logged
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                    on {formatDate(callLog.callDate)} • by {callLog.createdBy.name}
                              </p>
                            </div>
                          </div>
                          {callLog.duration && (
                            <Badge variant="outline" className="w-fit">
                              {callLog.duration} min
                            </Badge>
                          )}
                        </div>
                        {callLog.outcome && (
                          <div className="mt-2 rounded-lg bg-white p-2 dark:bg-gray-800">
                            <p className="text-sm">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                Outcome:
                              </span>{' '}
                              {callLog.outcome}
                            </p>
                          </div>
                        )}
                        {callLog.notes && (
                          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                            {callLog.notes}
                          </p>
                        )}
                      </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
                <Card>
                  <CardContent className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No activity recorded yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Activities will appear here when you update status, create follow-ups, or log calls.
                  </p>
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
