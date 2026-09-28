import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import {
  listServices,
  updateServiceBilling,
} from "@/server/actions/service-actions";
import { ServiceBillingWithAdmission } from "@/types/service-billing";

interface Service {
  id: string;
  name: string;
  price: number;
}

const serviceBillSchema = z.object({
  admissionId: z.string().min(1, "Student selection is required"),
  serviceIds: z
    .array(z.string())
    .min(1, "At least one service must be selected"),
});

type ServiceBillForm = z.infer<typeof serviceBillSchema>;

interface EditServiceBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceBill: ServiceBillingWithAdmission | null;
  onSuccess: () => void;
}

export default function EditServiceBillModal({
  open,
  onOpenChange,
  serviceBill,
  onSuccess,
}: EditServiceBillModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceBillForm = useForm<ServiceBillForm>({
    resolver: zodResolver(serviceBillSchema),
    defaultValues: {
      admissionId: "",
      serviceIds: [],
    },
  });

  const loadServices = async () => {
    try {
      const servicesResult = await listServices();
      if (servicesResult.success && servicesResult.data) {
        setServices(servicesResult.data);
      }
    } catch (error) {
      console.error("Failed to load services", error);
      toast.error("Failed to load services");
    }
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedServices, serviceId]
      : selectedServices.filter((id) => id !== serviceId);

    setSelectedServices(newSelection);
    serviceBillForm.setValue("serviceIds", newSelection, {
      shouldValidate: true,
    });
  };

  const calculateTotal = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const handleUpdateServiceBill = async (data: ServiceBillForm) => {
    if (!serviceBill) return;

    setIsSubmitting(true);
    try {
      if (data.serviceIds.length === 0) {
        toast.error("At least one service must be selected");
        return;
      }
      const payload: {
        id: string;
        serviceIds: string[];
        paymentMode?: string;
      } = {
        id: serviceBill.id,
        serviceIds: data.serviceIds,
      };

      const result = await updateServiceBilling(payload);

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        onSuccess();
      } else {
        console.error(result.message);
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Failed to update service bill", error);
      toast.error("Failed to update service bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  useEffect(() => {
    if (open && serviceBill) {
      loadServices();
      serviceBillForm.reset({
        admissionId: serviceBill.admissionId,
        serviceIds: serviceBill.serviceIds,
      });
      setSelectedServices(serviceBill.serviceIds);
    } else {
      serviceBillForm.reset();
      setSelectedServices([]);
    }
  }, [open, serviceBill, serviceBillForm]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service Bill</DialogTitle>
          <DialogDescription>
            Update the service bill for{" "}
            <span className="font-medium text-primary">
              {serviceBill?.admission.candidateName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={serviceBillForm.handleSubmit(handleUpdateServiceBill)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <div className="p-2.5 bg-muted rounded-md text-sm text-muted-foreground">
                {serviceBill?.admission.candidateName}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Services</Label>
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-3">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Loading services...
                </p>
              ) : (
                services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between space-x-3"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${service.id}`}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={(checked) =>
                          handleServiceToggle(service.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`edit-${service.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {service.name}
                      </Label>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(service.price)}
                    </div>
                  </div>
                ))
              )}
            </div>
            {serviceBillForm.formState.errors.serviceIds && (
              <p className="text-sm text-destructive">
                {serviceBillForm.formState.errors.serviceIds.message}
              </p>
            )}
          </div>

          {selectedServices.length > 0 && (
            <div className="border rounded-md p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Updated Bill Summary</h4>
              <div className="space-y-2 text-sm">
                {selectedServices.map((serviceId) => {
                  const service = services.find((s) => s.id === serviceId);
                  return service ? (
                    <div key={serviceId} className="flex justify-between">
                      <span>{service.name}</span>
                      <span>{formatCurrency(service.price)}</span>
                    </div>
                  ) : null;
                })}
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous Total:</span>
                  <span className="text-muted-foreground line-through">
                    {serviceBill ? formatCurrency(serviceBill.total) : ""}
                  </span>
                </div>
                <div className="flex justify-between font-medium text-base">
                  <span>New Total Amount</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Service Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}