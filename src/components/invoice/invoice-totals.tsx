'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, IndianRupee, Receipt, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface InvoiceTotalsProps {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  serviceCharge: number;
  otherCharges: number;
  totalAmount: number;
}

export function InvoiceTotals({ subtotal, taxRate, taxAmount, serviceCharge, otherCharges, totalAmount }: InvoiceTotalsProps) {
  return (
    <Card className="w-full overflow-hidden shadow-sm py-0">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b py-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-blue-600" />
          Invoice Summary
        </CardTitle>
        <CardDescription>Calculated totals for this invoice</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Subtotal</span>
          </div>
          <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
        </div>

        {/* Service Charge */}
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Service Charge</span>
          </div>
          <span className="font-semibold text-foreground">{formatCurrency(serviceCharge)}</span>
        </div>

        {/* Other Charges */}
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Other Charges</span>
          </div>
          <span className="font-semibold text-foreground">{formatCurrency(otherCharges)}</span>
        </div>
        
        {/* Tax */}
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Tax</span>
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {(taxRate * 100).toFixed(1)}%
            </Badge>
          </div>
          <span className="font-semibold text-foreground">{formatCurrency(taxAmount)}</span>
        </div>

        <Separator className="my-4" />

        {/* Total */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <IndianRupee className="h-4 w-4 text-green-600" />
              <span className="text-lg font-bold text-green-900">Total Amount</span>
            </div>
            <span className="text-2xl font-bold text-green-900">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-muted/30 rounded-lg p-3 mt-4">
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-current rounded-full" />
              <span>Tax rate can be modified in invoice settings</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-current rounded-full" />
              <span>Totals automatically update when items change</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
