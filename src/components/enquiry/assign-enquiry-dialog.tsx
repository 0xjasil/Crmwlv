'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getUsers, assignEnquiry, bulkAssignEnquiries } from '@/server/actions/enquiry';
import { getAllBranches } from '@/server/actions/data-management';
import { Branch, User } from '@/types/data-management';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface AssignEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId?: string;
  enquiryIds?: string[];
  currentAssigneeId?: string | null;
  onSuccess?: () => void;
  candidateName?: string;
  fixedBranchId?: string;
  fixedBranchName?: string;
  branches?: Branch[];
}

export function AssignEnquiryDialog({
  open,
  onOpenChange,
  enquiryId,
  enquiryIds,
  currentAssigneeId,
  onSuccess,
  candidateName,
  fixedBranchId,
  fixedBranchName,
  branches: passedBranches,
}: AssignEnquiryDialogProps) {
  type AssignableUser = User & { branch?: string | null };

  const [currentUser, setCurrentUser] = useState<{
    id?: string | null;
    role?: string | null;
    branch?: string | null;
  } | null>(null);
  const [localBranches, setLocalBranches] = useState<Branch[]>([]);
  const branches = passedBranches && passedBranches.length > 0 ? passedBranches : localBranches;
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [jobName, setJobName] = useState('');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');

  const isAdmin = (currentUser?.role || '').toLowerCase() === 'admin';

  // Get current user session and branches
  useEffect(() => {
    const fetchSessionAndBranches = async () => {
      try {
        const session = await authClient.getSession();
        setCurrentUser(session.data?.user || null);

        if (!passedBranches || passedBranches.length === 0) {
          const result = await getAllBranches();
          if (result.success) {
            setLocalBranches((result.data as Branch[]) || []);
          }
        }
      } catch (error) {
        console.error('Error initializing dialog details:', error);
      }
    };
    if (open) {
      fetchSessionAndBranches();
    }
  }, [open, passedBranches]);

  useEffect(() => {
    if (open) {
      initializeDialog();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (fixedBranchId) {
        setSelectedBranchId(fixedBranchId);
      } else if (currentUser && currentUser.role !== 'admin' && currentUser.branch) {
        setSelectedBranchId(currentUser.branch);
      }
    }
  }, [open, fixedBranchId, currentUser]);

  useEffect(() => {
    if (open && selectedBranchId) {
      fetchUsers(selectedBranchId);
    } else {
      setUsers([]);
    }
  }, [open, selectedBranchId]);

  const initializeDialog = async () => {
    setSelectedUserId(null);
    setSelectedBranchId(null);
    setStartDate(undefined);
    setEndDate(undefined);
    setJobName('');
    setDescription('');
    setRemarks('');
    setUsers([]);
  };

  // Branch fetching removed entirely.

  const fetchUsers = async (branchId?: string) => {
    if (!branchId) return;
    setIsLoadingUsers(true);
    try {
      const result = await getUsers(branchId);
      if (result.success) {
        setUsers((result.data as AssignableUser[]) || []);
      } else {
        toast.error(result.message || 'Failed to fetch users');
      }
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  // Ensure admin/manager are never listed (extra safety on top of server-side filter)
  const availableUsers = users.filter((user) => {
    const roleName =
      typeof (user as any).role === 'string'
        ? ((user as any).role as string)
        : (user as any).role?.name;

    const nameLower = (user.name || '').toLowerCase();
    const roleLower = (roleName || '').toLowerCase();

    if (roleLower === 'admin' || roleLower === 'manager') return false;
    if (nameLower === 'admin' || nameLower === 'manager') return false;

    return true;
  });

  const handleAssignUser = async () => {
    if (!selectedBranchId) {
      toast.error('Branch selection is required');
      return;
    }

    if (!jobName.trim()) {
      toast.error('Please enter a job name');
      return;
    }

    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    if (!endDate) {
      toast.error('Please select an end date');
      return;
    }

    // Validate start date is not in the past
    const today = startOfDay(new Date());
    const start = startOfDay(startDate);

    if (start < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (startDate > endDate) {
      toast.error('Start date cannot be after end date');
      return;
    }

    setIsAssigning(true);
    try {
      let result;

      if (enquiryIds && enquiryIds.length > 0) {
        // Bulk assignment
        result = await bulkAssignEnquiries(
          enquiryIds,
          selectedUserId,
          startDate,
          endDate,
          selectedBranchId,
          jobName.trim(),
          description || null,
          remarks || null
        );
      } else if (enquiryId) {
        // Single assignment
        result = await assignEnquiry(
          enquiryId,
          selectedUserId,
          startDate,
          endDate,
          selectedBranchId,
          jobName.trim(),
          description || null,
          remarks || null
        );
      } else {
        toast.error('No enquiry selected');
        setIsAssigning(false);
        return;
      }

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.message || 'Failed to assign enquiry');
      }
    } catch {
      toast.error('Failed to assign enquiry');
    } finally {
      setIsAssigning(false);
    }
  };

  const isBulk = !!(enquiryIds && enquiryIds.length > 0);
  const count = enquiryIds?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isBulk ? 'Bulk Assign Enquiries' : 'Assign Enquiry'}</DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Assign ${count} selected enquiries to a user.`
              : candidateName
                ? `Assign ${candidateName} to a user.`
                : 'Select a user to assign this enquiry to.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-2">
          {/* Job Details */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="job-name">Job Name *</Label>
              <Input
                id="job-name"
                placeholder="Enter job name"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                disabled={isAssigning}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Description (optional)</Label>
              <Textarea
                id="job-description"
                placeholder="Add a short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isAssigning}
                rows={3}
              />
            </div>
          </div>

          {/* Branch Selector */}
          <div className="space-y-2">
            <Label htmlFor="branch">Branch *</Label>
            {isAdmin ? (
              <Select
                value={selectedBranchId ?? ''}
                onValueChange={(value) => {
                  setSelectedBranchId(value);
                  setSelectedUserId(null); // Reset user when branch changes
                }}
                disabled={isAssigning}
              >
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="branch"
                value={
                  fixedBranchName ||
                  branches.find((b) => b.id === selectedBranchId)?.name ||
                  'Your Branch'
                }
                disabled
                className="bg-muted text-muted-foreground"
              />
            )}
          </div>

          {/* User */}
          <div className="space-y-2">
            <Label htmlFor="assignee">User *</Label>
            <Select
              value={selectedUserId ?? ''}
              onValueChange={(value) => setSelectedUserId(value)}
              disabled={
                isAssigning ||
                isLoadingUsers ||
                !selectedBranchId ||
                availableUsers.length === 0
              }
            >
              <SelectTrigger id="assignee">
                <SelectValue
                  placeholder={
                    isLoadingUsers
                      ? 'Loading...'
                      : !selectedBranchId
                        ? 'Select a branch first'
                        : availableUsers.length === 0
                          ? 'No users in this branch'
                          : 'Select user'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                    disabled={isAssigning}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => {
                      const today = startOfDay(new Date());
                      return date < today || (endDate ? date > endDate : false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                    disabled={isAssigning}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM dd, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>



          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              placeholder="Add any remark"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isAssigning}
              rows={2}
            />
          </div>

        </div>
        {/* Action Button */}
        <div className="flex justify-end gap-2 pt-2 mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignUser}
            disabled={
              isAssigning ||
              !selectedUserId ||
              !startDate ||
              !endDate ||
              !selectedBranchId ||
              !jobName.trim()
            }
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              'Assign'
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
