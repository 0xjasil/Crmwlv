'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone, Mail,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { FollowUp } from '@/types/enquiry';
import { FOLLOW_UP_STATUS_OPTIONS } from '@/constants/enquiry';
import { IconBrandWhatsapp } from '@tabler/icons-react';

interface FollowUpMobileCardProps {
  followUp: FollowUp;
  onUpdate: (followUp: FollowUp) => void;
}

export function FollowUpMobileCard({ followUp, onUpdate }: FollowUpMobileCardProps) {
  const getStatusColor = (status: string) => {
    const statusOption = FOLLOW_UP_STATUS_OPTIONS.find((option) => option.value === status);
    return statusOption
      ? `bg-${statusOption.color}-100 text-${statusOption.color}-800`
      : 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'RESCHEDULED':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const isOverdue = (scheduledAt: string | Date, status: string) => {
    return new Date(scheduledAt) < new Date() && status === 'PENDING';
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleEmail = (email?: string) => {
    if (email) {
      window.open(`mailto:${email}`, '_self');
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Link
              href={`/enquiries/${followUp.enquiry.id}`}
              className="text-blue-600 hover:underline"
            >
              <h3 className="font-semibold text-lg text-blue-600 mb-1">
                {followUp.enquiry.candidateName}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(followUp.status)}
                <Badge className={getStatusColor(followUp.status)}>
                  {FOLLOW_UP_STATUS_OPTIONS.find((opt) => opt.value === followUp.status)?.label || followUp.status}
                </Badge>
              </div>
              {isOverdue(followUp.scheduledAt, followUp.status) && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate(followUp)}
            className="ml-2"
          >
            Update
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="icon"
            variant="outline"
            className="flex-1"
            onClick={() => handleCall(followUp.enquiry.phone)}
          >
            <Phone className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="flex-1"
            onClick={() => handleWhatsApp(followUp.enquiry.phone)}
          >
            <IconBrandWhatsapp className="size-4" />
          </Button>
          {followUp.enquiry.email && (
            <Button
              size="icon"
              variant="outline"
              className="flex-1"
              onClick={() => handleEmail(followUp.enquiry.email)}
            >
              <Mail className="size-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" asChild className="flex-shrink-0">
            <Link href={`/enquiries/${followUp.enquiry.id}`}>
              <Eye className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Contact Information */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="font-mono">{followUp.enquiry.phone}</span>
          </div>
          {followUp.enquiry.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-muted-foreground">{followUp.enquiry.email}</span>
            </div>
          )}
        </div>

        {/* Follow-up Details */}
        <div className="pt-3 border-t border-gray-100 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Scheduled:</span>
            <span>{formatDateTime(followUp.scheduledAt)}</span>
          </div>
          {followUp.notes && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium">Notes:</span>
                <p className="text-muted-foreground mt-1">{followUp.notes}</p>
              </div>
            </div>
          )}
          {followUp.outcome && (
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium">Outcome:</span>
                <p className="text-muted-foreground mt-1">{followUp.outcome}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}