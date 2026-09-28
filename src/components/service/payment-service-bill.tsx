import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  onProcessPayment: (amount: number, paymentMode?: string) => Promise<void>;
  isProcessing?: boolean;
}

export default function PaymentModal({
  open,
  onOpenChange,
  customerName,
  totalAmount,
  paidAmount,
  balance,
  onProcessPayment,
  isProcessing = false,
}: PaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentError, setPaymentError] = useState("");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPaymentAmount("");
      setPaymentMode("");
      setPaymentError("");
    }
  }, [open]);

  const handlePaymentAmountChange = (value: string) => {
    // Sanitize the input to only allow digits and one decimal point
    const sanitizedValue = value
      .replace(/[^\d.]/g, "") // Remove all characters except digits and dot
      .replace(/^(\d*\.)(.*)$/, (match, p1, p2) => p1 + p2.replace(/\./g, ""));

    setPaymentAmount(sanitizedValue);
    setPaymentError("");

    if (sanitizedValue === "") {
      return;
    }

    const amount = parseFloat(sanitizedValue);

    if (isNaN(amount)) {
      setPaymentError("Please enter a valid number");
      return;
    }

    if (amount <= 0) {
      setPaymentError("Payment amount must be greater than zero");
      return;
    }

    const newTotalPaid = paidAmount + amount;
    if (newTotalPaid > totalAmount + 0.001) {
      setPaymentError(
        `Payment amount exceeds balance. Maximum allowed: ${formatCurrency(balance)}`
      );
      return;
    }
  };

  const handleSubmit = async () => {
    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Please enter a valid amount");
      return;
    }

    const newTotalPaid = paidAmount + amount;
    if (newTotalPaid > totalAmount + 0.001) {
      setPaymentError(
        `Payment amount exceeds balance. Maximum allowed: ${formatCurrency(balance)}`
      );
      return;
    }

    await onProcessPayment(amount, paymentMode || undefined);
  };

  const parsedAmount = parseFloat(paymentAmount);
  const showPreview = paymentAmount && !paymentError && !isNaN(parsedAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Enter the payment amount and optional mode for{" "}
            <span className="font-medium text-primary">{customerName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid Amount:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(paidAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Remaining Balance:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(balance)}
              </span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Payment Amount</Label>
            <Input
              id="payment-amount"
              type="text"
              inputMode="decimal"
              placeholder={`Max: ${formatCurrency(balance)}`}
              value={paymentAmount}
              onChange={(e) => handlePaymentAmountChange(e.target.value)}
              disabled={isProcessing}
            />
            {paymentError && (
              <p className="text-sm text-destructive">{paymentError}</p>
            )}
          </div>

          {/* Payment Mode Input */}
          <div className="space-y-2">
            <Label htmlFor="payment-mode">Payment Mode (Optional)</Label>
            <Input
              id="payment-mode"
              type="text"
              placeholder="e.g., Cash, UPI, Bank Transfer"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          {/* Calculation Preview */}
          {showPreview && (
            <div className="rounded-lg border p-4 space-y-2 bg-green-50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Paid Amount:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(paidAmount + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Balance:</span>
                <span className="font-semibold">
                  {formatCurrency(balance - parsedAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !paymentAmount ||
              !!paymentError ||
              isProcessing ||
              parsedAmount <= 0
            }
          >
            {isProcessing ? "Processing..." : "Process Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}