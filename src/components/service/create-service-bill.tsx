import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { formatCurrency, cn } from "@/lib/utils";
import {
 listStudents,
 listServices,
 createServiceBilling,
} from "@/server/actions/service-actions";
import { CreateServiceBilling } from "@/types/service-billing";

interface Student {
 id: string;
 candidateName: string;
}

interface Service {
 id: string;
 name: string;
 price: number;
}

// NOTE: We need to define the schema without the total/paid validation first,
// and then refine the whole object in the component because 'total' depends on state.
const serviceBillSchema = z.object({
 admissionId: z.string().min(1, "Student selection is required"),
 serviceIds: z
  .array(z.string())
  .min(1, "At least one service must be selected"),
 billDate: z.date({
  required_error: "Bill date is required",
  invalid_type_error: "Please select a valid date",
 }),
 paid: z
  .string()
  .transform((val) => (val === "" ? undefined : val))
  .pipe(
   z.union([
    z.undefined(),
    z
     .string()
     .refine((val) => !isNaN(parseFloat(val)), {
      message: "Must be a valid number",
     })
     .refine((val) => parseFloat(val) >= 0, {
      message: "Amount must be zero or positive",
     })
     .transform((val) => parseFloat(val)),
   ])
  ),
 paymentMode: z.string().optional(),
});

type ServiceBillForm = z.infer<typeof serviceBillSchema>;

interface CreateServiceBillModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onSuccess: () => void;
}

export default function CreateServiceBillModal({
 open,
 onOpenChange,
 onSuccess,
}: CreateServiceBillModalProps) {
 const [students, setStudents] = useState<Student[]>([]);
 const [services, setServices] = useState<Service[]>([]);
 const [selectedServices, setSelectedServices] = useState<string[]>([]);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // --- Calculate Total Amount ---
 const calculateTotal = () => {
  return selectedServices.reduce((total, serviceId) => {
   const service = services.find((s) => s.id === serviceId);
   return total + (service?.price || 0);
  }, 0);
 };
 const totalAmount = calculateTotal();
 const serviceBillForm = useForm({
  resolver: zodResolver(serviceBillSchema),
  defaultValues: {
   admissionId: "",
   serviceIds: [],
   billDate: new Date(),
   paid: "",
   paymentMode: "",
  },
 });

 const loadFormData = async () => {
  try {
   const [studentsResult, servicesResult] = await Promise.all([
    listStudents(),
    listServices(),
   ]);

   if (studentsResult.success && studentsResult.data) {
    setStudents(studentsResult.data);
   }
   if (servicesResult.success && servicesResult.data) {
    setServices(servicesResult.data);
   }
  } catch (error) {
   console.error("Failed to load form data", error);
   toast.error("Failed to load form data");
  }
 };

 const handleServiceToggle = (serviceId: string, checked: boolean) => {
  const newSelection = checked
   ? [...selectedServices, serviceId]
   : selectedServices.filter((id) => id !== serviceId);

  setSelectedServices(newSelection);
  serviceBillForm.setValue("serviceIds", newSelection, {
   shouldValidate: true, // Re-validate serviceIds field
  });
 };

 const handleCreateServiceBill = async (data: ServiceBillForm) => {
  setIsSubmitting(true);

  try {
   // --- Custom Validation for Paid Amount vs Total Amount ---
   const paidValue = typeof data.paid === 'number' ? data.paid : data.paid !== undefined ? parseFloat(data.paid as string) : undefined;
   
   if (paidValue !== undefined && paidValue > totalAmount) {
    toast.error(
     `Paid amount (${formatCurrency(paidValue)}) cannot exceed the total bill amount (${formatCurrency(totalAmount)}).`
    );
    setIsSubmitting(false);
    return;
   }

   if (
    selectedServices.length <= 0 ||
    !data.serviceIds ||
    data.serviceIds.length === 0 ||
    data.admissionId === "all" ||
    data.admissionId.trim() === ""
   ) {
    toast.error("At least one service must be selected");
    setIsSubmitting(false);
    return;
   }
   
   const payload: CreateServiceBilling = {
    admissionId: data.admissionId,
    serviceIds: data.serviceIds,
    billDate: data.billDate,
    paid: data.paid,
   };
   
   if (data.paymentMode && data.paymentMode.trim() !== "") {
    payload.paymentMode = data.paymentMode;
   }
   
   const result = await createServiceBilling(payload);

   if (result.success) {
    toast.success(result.message);
    onOpenChange(false);
    serviceBillForm.reset();
    setSelectedServices([]);
    onSuccess();
   } else {
    toast.error(result.message);
   }
  } catch (error) {
   console.error("Failed to create service bill", error);
   toast.error("Failed to create service bill");
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleClose = () => {
  onOpenChange(false);
  serviceBillForm.reset();
  setSelectedServices([]);
 };

 useEffect(() => {
  if (open) {
   loadFormData();
  }
 }, [open]);

 const paidAmountWatch = serviceBillForm.watch("paid");
 const paidValue = typeof paidAmountWatch === 'string' && paidAmountWatch !== '' ? parseFloat(paidAmountWatch) : undefined;
 const balance = paidValue !== undefined ? totalAmount - paidValue : totalAmount;

 return (
  <Dialog open={open} onOpenChange={handleClose}>
   <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
     <DialogTitle>Create Service Bill</DialogTitle>
     <DialogDescription>
      Create a new service bill for a student with selected services
     </DialogDescription>
    </DialogHeader>

    <form
     onSubmit={serviceBillForm.handleSubmit(handleCreateServiceBill)}
     className="space-y-6"
    >
     {/* Student Selection */}
     <div className="space-y-2">
      <Label htmlFor="student-select">Select Student</Label>
      <Select
       value={serviceBillForm.watch("admissionId")}
       onValueChange={(value) =>
        serviceBillForm.setValue("admissionId", value)
       }
      >
       <SelectTrigger>
        <SelectValue placeholder="Choose a student" />
       </SelectTrigger>
       <SelectContent>
        {students.length === 0 ? (
         <SelectItem value="none" disabled>
          Loading students...
         </SelectItem>
        ) : (
         students.map((student) => (
          <SelectItem key={student.id} value={student.id}>
           {student.candidateName}
          </SelectItem>
         ))
        )}
       </SelectContent>
      </Select>
      {serviceBillForm.formState.errors.admissionId && (
       <p className="text-sm text-destructive">
        {serviceBillForm.formState.errors.admissionId.message}
       </p>
      )}
     </div>

     {/* Bill Date */}
     <div className="space-y-2">
      <Label>Bill Date</Label>
      <Popover>
       <PopoverTrigger asChild>
        <Button
         variant="outline"
         className={cn(
          "w-full justify-start text-left font-normal",
          !serviceBillForm.watch("billDate") && "text-muted-foreground"
         )}
        >
         <CalendarIcon className="mr-2 h-4 w-4" />
         {serviceBillForm.watch("billDate") ? (
          format(serviceBillForm.watch("billDate"), "PPP")
         ) : (
          <span>Pick a date</span>
         )}
        </Button>
       </PopoverTrigger>
       <PopoverContent className="w-auto p-0" align="start">
        <Calendar
         mode="single"
         selected={serviceBillForm.watch("billDate")}
         onSelect={(date) => serviceBillForm.setValue("billDate", date as Date)}
         captionLayout="dropdown"
         fromYear={2000}
         toYear={2050}
         initialFocus
        />
       </PopoverContent>
      </Popover>
      {serviceBillForm.formState.errors.billDate && (
       <p className="text-sm text-destructive">
        {serviceBillForm.formState.errors.billDate.message}
       </p>
      )}
     </div>

     {/* Services Selection */}
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
            id={service.id}
            checked={selectedServices.includes(service.id)}
            onCheckedChange={(checked) =>
             handleServiceToggle(service.id, checked as boolean)
            }
           />
           <Label
            htmlFor={service.id}
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

     {/* Paid Amount */}
     <div className="space-y-2">
      <Label htmlFor="paid">Paid Amount (Optional)</Label>
      <Input
       id="paid"
       type="text"
       placeholder="Enter paid amount (e.g., 1500.50)"
       {...serviceBillForm.register("paid")}
      />
      {serviceBillForm.formState.errors.paid && (
       <p className="text-sm text-destructive">
        {serviceBillForm.formState.errors.paid.message}
       </p>
      )}
     </div>

     {/* Payment Mode */}
     <div className="space-y-2">
      <Label htmlFor="paymentMode">Payment Mode (Optional)</Label>
      <Input
       id="paymentMode"
       type="text"
       placeholder="Enter payment mode (e.g., Cash, UPI, Card)"
       {...serviceBillForm.register("paymentMode")}
      />
      {serviceBillForm.formState.errors.paymentMode && (
       <p className="text-sm text-destructive">
        {serviceBillForm.formState.errors.paymentMode.message}
       </p>
      )}
     </div>

     {/* Bill Summary */}
     {selectedServices.length > 0 && (
      <div className="border rounded-md p-4 bg-muted/50">
       <h4 className="font-medium mb-3">Bill Summary</h4>
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
        <div className="flex justify-between font-medium text-base">
         <span>Total Amount</span>
         <span>{formatCurrency(totalAmount)}</span>
        </div>
        {paidAmountWatch && (
         <>
          <div className="flex justify-between text-green-600">
           <span>Paid Amount</span>
           <span>{formatCurrency(paidValue ?? 0)}</span>
          </div>
          <div className="flex justify-between font-medium text-base text-orange-600">
           <span>Balance Due</span>
           <span>{formatCurrency(balance)}</span>
          </div>
         </>
        )}
       </div>
      </div>
     )}

     {/* Form Actions */}
     <div className="flex justify-end space-x-2">
      <Button type="button" variant="outline" onClick={handleClose}>
       Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
       {isSubmitting ? "Creating..." : "Create Service Bill"}
      </Button>
     </div>
    </form>
   </DialogContent>
  </Dialog>
 );
}