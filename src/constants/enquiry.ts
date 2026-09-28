import { EnquiryStatus, FollowUpStatus } from '@/types/enquiry';

export const ENQUIRY_STATUS_OPTIONS = [
  { value: EnquiryStatus.NEW, label: 'New', color: 'blue' },
  { value: EnquiryStatus.CONTACTED, label: 'Contacted', color: 'yellow' },
  { value: EnquiryStatus.INTERESTED, label: 'Interested', color: 'green' },
  { value: EnquiryStatus.NOT_INTERESTED, label: 'Not Interested', color: 'red' },
  { value: EnquiryStatus.FOLLOW_UP, label: 'Follow Up', color: 'orange' },
  { value: EnquiryStatus.ENROLLED, label: 'Enrolled', color: 'emerald' },
  { value: EnquiryStatus.DROPPED, label: 'Dropped', color: 'gray' },
  { value: EnquiryStatus.INVALID, label: 'Invalid', color: 'red' },
] as const;

export const FOLLOW_UP_STATUS_OPTIONS = [
  { value: FollowUpStatus.PENDING, label: 'Pending', color: 'yellow' },
  { value: FollowUpStatus.COMPLETED, label: 'Completed', color: 'green' },
  { value: FollowUpStatus.CANCELLED, label: 'Cancelled', color: 'red' },
  { value: FollowUpStatus.RESCHEDULED, label: 'Rescheduled', color: 'blue' },
] as const;

export const CALL_OUTCOME_OPTIONS = [
  { value: 'ANSWERED', label: 'Answered', color: 'green' },
  { value: 'NOT_ANSWERED', label: 'Not Answered', color: 'red' },
  { value: 'BUSY', label: 'Busy', color: 'yellow' },
  { value: 'SWITCHED_OFF', label: 'Switched Off', color: 'gray' },
  { value: 'INVALID_NUMBER', label: 'Invalid Number', color: 'red' },
] as const;
