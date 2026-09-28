'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Clock, AlertCircle, XCircle, Circle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { updateInvoice } from '@/server/actions/invoice-actions';
import { InvoiceStatus } from '@/types/invoice';

interface InvoiceStatusUpdateProps {
  invoiceId: string;
  currentStatus: InvoiceStatus;
  onStatusUpdate?: () => void;
}

const statusConfig = {
  [InvoiceStatus.DRAFT]: {
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: Circle,
    label: 'Draft',
  },
  [InvoiceStatus.SENT]: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
    label: 'Sent',
  },
  [InvoiceStatus.PAID]: {
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
    label: 'Paid',
  },
  [InvoiceStatus.OVERDUE]: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
    label: 'Overdue',
  },
  [InvoiceStatus.CANCELLED]: {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle,
    label: 'Cancelled',
  },
};

export function InvoiceStatusUpdate({
  invoiceId,
  currentStatus,
  onStatusUpdate,
}: InvoiceStatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (selectedStatus === currentStatus) {
      toast.info('Status is already set to ' + statusConfig[selectedStatus].label);
      return;
    }

    try {
      setIsUpdating(true);
      toast.info('Updating invoice status...');

      const result = await updateInvoice({
        id: invoiceId,
        status: selectedStatus,
      });

      if (result.data?.success) {
        toast.success(`Invoice status updated to ${statusConfig[selectedStatus].label}`);
        onStatusUpdate?.();
      } else {
        throw new Error(result.data?.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error(
        'Failed to update status: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
      // Reset selection on error
      setSelectedStatus(currentStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const SelectedStatusIcon = statusConfig[selectedStatus].icon;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground">Update Status</h4>
      <Select
        value={selectedStatus}
        onValueChange={(value: InvoiceStatus) => setSelectedStatus(value)}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <SelectedStatusIcon className="h-4 w-4" />
              {statusConfig[selectedStatus].label}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([status, config]) => {
            const StatusIcon = config.icon;
            return (
              <SelectItem key={status} value={status}>
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4" />
                  {config.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Update Button */}
      <Button
        onClick={handleStatusUpdate}
        disabled={isUpdating || selectedStatus === currentStatus}
        className="w-full gap-2"
        variant={selectedStatus === currentStatus ? 'outline' : 'default'}
      >
        {isUpdating ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : selectedStatus === currentStatus ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Current Status
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Update to {statusConfig[selectedStatus].label}
          </>
        )}
      </Button>
    </div>
  );
}
