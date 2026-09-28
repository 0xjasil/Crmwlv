'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Eye,
  Trash2,
  Calendar,
  User,
  MapPin,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog";

interface JobOrder {
  id: string;
  name: string;
  branch: {
    name: string;
  };
  manager: {
    name: string;
  };
  startDate: Date;
  endDate: Date;
  progress: number;
  _count?: {
    jobLeads: number;
  };
}

interface JobOrderMobileCardProps {
  jobOrder: JobOrder;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

export function JobOrderMobileCard({ jobOrder, onView, onDelete, isAdmin }: JobOrderMobileCardProps) {
  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-2">
             <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">
                    #{jobOrder.id.slice(-6)}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    {jobOrder._count?.jobLeads || 0} Leads
                </Badge>
             </div>
            <h3 className="font-semibold text-base text-gray-900 truncate leading-tight">
              {jobOrder.name}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
             <div className="flex items-center gap-1.5">
               <Progress value={jobOrder.progress} className="w-12 h-2" />
               <span className="text-xs font-medium w-8 text-right">{jobOrder.progress}%</span>
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 hover:bg-muted"
            onClick={() => onView(jobOrder.id)}
            title="View Details"
          >
            <Eye className="h-4 w-4 text-blue-500" />
          </Button>

          {isAdmin && (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 hover:bg-red-50 text-red-600 hover:text-red-700"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the job order
                            and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(jobOrder.id)} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-muted-foreground border-t border-gray-100 pt-2">
          <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{jobOrder.branch.name}</span>
          </div>

          <div className="flex items-center gap-1.5">
             <User className="h-3.5 w-3.5 shrink-0" />
             <span className="truncate">{jobOrder.manager.name}</span>
          </div>

          <div className="flex items-center gap-1.5 col-span-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                  {formatDate(jobOrder.startDate)} - {formatDate(jobOrder.endDate)}
              </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
