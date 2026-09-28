'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone, Mail,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  User,
  Calendar,
  GraduationCap,
  MapPin
} from 'lucide-react';
import { Enquiry } from '@/types/enquiry';
import { ENQUIRY_STATUS_OPTIONS } from '@/constants/enquiry';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { authClient } from '@/lib/auth-client';

interface EnquiryMobileCardProps {
  enquiry: Enquiry;
  onView: (enquiryId: string) => void;
  onEdit: (enquiry: Enquiry) => void;
  onDelete: (enquiryId: string, candidateName: string) => void;
}

import { memo } from 'react';

export const EnquiryMobileCard = memo(function EnquiryMobileCard({ enquiry, onView, onEdit, onDelete }: EnquiryMobileCardProps) {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const getStatusColor = (status: string) => {
    const statusOption = ENQUIRY_STATUS_OPTIONS.find((option) => option.value === status);
    return statusOption
      ? `bg-${statusOption.color}-100 text-${statusOption.color}-800`
      : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
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
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-gray-900 truncate">
              {enquiry.candidateName}
            </h3>
            <Badge className={`mt-1 text-xs px-2 py-0.5 ${getStatusColor(enquiry.status)}`}>
              {ENQUIRY_STATUS_OPTIONS.find((opt) => opt.value === enquiry.status)?.label || enquiry.status}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 shrink-0"
            onClick={() => handleCall(enquiry.phone)}
            title="Call"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 shrink-0"
            onClick={() => handleWhatsApp(enquiry.phone)}
            title="WhatsApp"
          >
            <IconBrandWhatsapp className="h-4 w-4" />
          </Button>
          {enquiry.email && (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0"
              onClick={() => handleEmail(enquiry.email)}
              title="Email"
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
          <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 hover:bg-muted"
            onClick={() => onView(enquiry.id)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 hover:bg-muted"
            onClick={() => onEdit(enquiry)}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 hover:bg-red-50 text-red-600 hover:text-red-700"
            onClick={() => onDelete(enquiry.id, enquiry.candidateName)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-muted-foreground border-t border-gray-100 pt-2">
          {enquiry.assignedTo && (
            <div className="flex items-center gap-1.5 col-span-2">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Assigned to: <span className="font-medium text-gray-700">{enquiry.assignedTo.id === currentUserId ? "Yourself" : enquiry.assignedTo.name}</span></span>
            </div>
          )}
          {enquiry.assignedBy && (
            <div className="flex items-center gap-1.5 col-span-2">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Assigned by: <span className="font-medium text-gray-700">{enquiry.assignedBy.id === currentUserId ? "Yourself" : enquiry.assignedBy.name}</span></span>
            </div>
          )}

          {enquiry.preferredCourse && (
            <div className="flex items-center gap-1.5 col-span-2">
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{enquiry.preferredCourse.name}</span>
            </div>
          )}

          {enquiry.contact2 && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono">{enquiry.contact2}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDate(enquiry.createdAt)}</span>
          </div>

          {enquiry.enquirySource && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{enquiry.enquirySource.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
