import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { CalendarIcon } from "lucide-react";
import { FC, useState } from "react";
import { format } from "date-fns";

interface DateOfBirthPickerProps
  extends Omit<
    React.ComponentProps<typeof Calendar>,
    "mode" | "selected" | "onSelect"
  > {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

export const DateOfBirthPicker: FC<DateOfBirthPickerProps> = ({
  value,
  onChange,
  className,
  ...props
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id="date-of-birth"
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? format(value, "PPP") : "Select date"}
          <CalendarIcon className="ml-auto size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(selectedDate) => {
            onChange(selectedDate);
            setOpen(false);
          }}
          {...props}
        />
      </PopoverContent>
    </Popover>
  );
};
