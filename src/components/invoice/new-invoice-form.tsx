'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDays, endOfMonth, format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft, CalendarDays, Check, ChevronDown, FileCheck, FileText, GripVertical, Info,
  Plus, ScanLine, Search, Settings2, Sparkles, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { createInvoiceCustomer as createInvoiceCustomerRequest, createInvoiceCustomerFromAdmission, fetchInvoiceCustomers, getPaymentNumberPreview, InvoiceCustomer, saveInvoice as saveInvoiceRequest, sendInvoiceEmail } from '@/lib/api/invoice-api';
import { getInvoiceProductCatalog, InvoiceProductItem, ProposalMatch } from '@/server/actions/invoice-catalog-actions';
import { PaymentNumberSettingsDialog } from '@/components/invoice/invoice-payments';
import { PageContainer, PageHeader } from '@/components/ui/page-header';

type Customer = InvoiceCustomer;
type InvoiceItem = { id: number; description: string; quantity: number; rate: number; discount: number; tax: number };

const terms = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due end of month', 'Due end of next month', 'Custom'];
const currency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const blankItem = (id: number): InvoiceItem => ({ id, description: '', quantity: 1, rate: 0, discount: 0, tax: 0 });

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="overflow-hidden rounded-lg border bg-card">
    <div className="flex min-h-12 items-center justify-between border-b bg-muted/20 px-5">
      <h2 className="text-sm font-semibold">{title}</h2>{action}
    </div>
    <div className="p-5">{children}</div>
  </section>;
}

function CustomerSelect({ value, onChange, customers, loading, onNew }: { value: Customer | null; onChange: (customer: Customer | null) => void; customers: Customer[]; loading: boolean; onNew: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-3">
    <Popover>
      <PopoverTrigger asChild><Button variant="outline" className="h-10 w-full justify-between font-normal text-muted-foreground">
        <span className="flex items-center gap-2">{value ? <><span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{value.name[0]}</span><span className="text-foreground">{value.name}</span></> : <><Search className="size-4" /> Select or search a customer</>}</span><ChevronDown className="size-4" />
      </Button></PopoverTrigger>
      <PopoverContent align="start" className="w-[min(420px,calc(100vw-2rem))] p-0">
        <div className="border-b p-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" className="pl-8" /></div></div>
        <div className="max-h-56 overflow-auto p-1">{loading ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading customers…</p> : filtered.length ? filtered.map((customer) => <button type="button" key={customer.id} onClick={() => { onChange(customer); setSearch(''); }} className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted"><span><span className="block font-medium">{customer.name}</span><span className="text-xs text-muted-foreground">{[customer.email, customer.phone, customer.sourceType === 'admission' ? 'Admission' : customer.sourceType === 'enquiry' ? 'Enquiry' : 'Customer'].filter(Boolean).join(' · ')}</span></span>{value?.id === customer.id && <Check className="size-4 text-primary" />}</button>) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching customers.</p>}</div>
        <div className="border-t p-2"><Button type="button" variant="outline" className="w-full" onClick={onNew}><Plus className="size-4" /> New Customer</Button></div>
      </PopoverContent>
    </Popover>
    {value && <div className="grid gap-3 sm:grid-cols-2">
      {[['Billing Address', value.address || 'No billing address saved'], ['Shipping Address', value.address || 'Same as billing address']].map(([label, address]) => <div key={label} className="rounded-md border bg-muted/10 p-3"><div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div><p className="text-sm leading-5">{address}</p></div>)}
    </div>}
  </div>;
}

function InvoiceItemRow({ item, catalog, onChange, onRemove, onEnter }: { item: InvoiceItem; catalog: InvoiceProductItem[]; onChange: (item: InvoiceItem) => void; onRemove: () => void; onEnter: () => void }) {
  const amount = item.quantity * item.rate * (1 - item.discount / 100);
  return <tr className="border-b last:border-0">
    <td className="min-w-[280px] px-3 py-2"><div className="flex items-start gap-2"><GripVertical className="mt-2 size-4 shrink-0 text-muted-foreground/50" /><div className="flex size-10 shrink-0 items-center justify-center rounded border bg-muted/30 text-muted-foreground"><FileText className="size-4" /></div><div className="min-w-0 flex-1 space-y-1"><select aria-label="Solar product or proposal item" value="" onChange={(e) => { const entry = catalog.find((candidate) => candidate.id === e.target.value); if (entry) onChange({ ...item, description: entry.description || entry.name, rate: entry.price, ...(entry.quantity && entry.quantity > 0 ? { quantity: entry.quantity } : {}) }); }} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="">{catalog.length ? 'Choose a solar product / proposal item (optional)' : 'Enter a custom item'}</option>{catalog.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {currency(entry.price)}</option>)}</select><Textarea value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter(); } }} placeholder="Solar system package, panel, inverter, or proposal item" className="min-h-12 resize-y" /></div></div></td>
    <td className="min-w-24 px-2"><Input aria-label="Quantity" type="number" min="1" step="1" value={item.quantity} onChange={(e) => onChange({ ...item, quantity: Number(e.target.value) })} className="h-9 text-right" /></td>
    <td className="min-w-28 px-2"><div className="relative"><span className="absolute left-2.5 top-2 text-sm text-muted-foreground">₹</span><Input aria-label="Rate" type="number" min="0" step="0.01" value={item.rate || ''} onChange={(e) => onChange({ ...item, rate: Number(e.target.value) })} className="h-9 pl-6 text-right" /></div></td>
    <td className="min-w-24 px-2"><div className="relative"><Input aria-label="Discount percentage" type="number" min="0" max="100" value={item.discount || ''} onChange={(e) => onChange({ ...item, discount: Number(e.target.value) })} className="h-9 pr-7 text-right" /><span className="absolute right-2.5 top-2 text-xs text-muted-foreground">%</span></div></td>
    <td className="min-w-28 px-2"><div className="relative"><Input aria-label="Tax rate percentage" type="number" min="0" max="100" step="0.01" value={item.tax || ''} onChange={(e) => onChange({ ...item, tax: Number(e.target.value) })} className="h-9 pr-7 text-right" placeholder="0" /><span className="absolute right-2.5 top-2 text-xs text-muted-foreground">%</span></div></td>
    <td className="min-w-28 px-3 text-right text-sm font-medium tabular-nums">{currency(amount)}</td><td className="px-2"><Button type="button" size="icon" variant="ghost" aria-label="Remove item" onClick={onRemove} className="size-8 text-muted-foreground"><X className="size-4" /></Button></td>
  </tr>;
}

function TotalsPanel({ subtotal, taxAmount, discount, setDiscount, discountMode, setDiscountMode, shipping, setShipping, adjustment, setAdjustment, total, withholding, setWithholding, withholdingRate, setWithholdingRate }: { subtotal: number; taxAmount: number; discount: number; setDiscount: (value: number) => void; discountMode: 'percent' | 'amount'; setDiscountMode: (value: 'percent' | 'amount') => void; shipping: number; setShipping: (value: number) => void; adjustment: number; setAdjustment: (value: number) => void; total: number; withholding: 'TDS' | 'TCS'; setWithholding: (value: 'TDS' | 'TCS') => void; withholdingRate: number; setWithholdingRate: (value: number) => void }) {
  const discountValue = discountMode === 'percent' ? subtotal * discount / 100 : discount;
  const withholdingValue = Math.max(0, subtotal - discountValue) * withholdingRate / 100;
  return <div className="ml-auto max-w-md rounded-lg border bg-muted/20 p-5">
    <div className="space-y-3 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Sub Total</span><span className="tabular-nums">{currency(subtotal)}</span></div>
      <div className="flex justify-between text-xs text-muted-foreground"><span>Tax</span><span>{currency(taxAmount)}</span></div>
      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Discount</span><div className="flex w-40"><Input aria-label="Discount" type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} className="h-8 rounded-r-none text-right" /><button type="button" className="rounded-r-md border border-l-0 bg-background px-2 text-xs" onClick={() => setDiscountMode(discountMode === 'percent' ? 'amount' : 'percent')}>{discountMode === 'percent' ? '%' : '₹'}</button></div></div>
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1 text-muted-foreground">Shipping Charges <Info className="size-3.5" /></span><Input aria-label="Shipping charges" type="number" value={shipping || ''} onChange={(e) => setShipping(Number(e.target.value))} className="h-8 w-40 text-right" /></div>
      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Other Charges</span><Input aria-label="Other charges" type="number" value={adjustment || ''} onChange={(e) => setAdjustment(Number(e.target.value))} className="h-8 w-40 text-right" /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div className="flex items-center gap-3 text-xs"><label className="flex items-center gap-1.5"><input type="radio" checked={withholding === 'TDS'} onChange={() => setWithholding('TDS')} />TDS</label><label className="flex items-center gap-1.5"><input type="radio" checked={withholding === 'TCS'} onChange={() => setWithholding('TCS')} />TCS</label><select aria-label="TDS or TCS rate" value={withholdingRate} onChange={(event) => setWithholdingRate(Number(event.target.value))} className="h-8 rounded-md border border-input bg-background px-2"><option value={0}>Select tax</option><option value={1}>1%</option><option value={2}>2%</option><option value={5}>5%</option><option value={10}>10%</option></select></div><span className="text-xs text-muted-foreground">−{currency(withholdingValue)}</span></div>
      <div className="flex items-center justify-between"><span className="font-semibold">Total</span><span className="text-xl font-semibold tabular-nums">{currency(Math.max(0, total - discountValue - withholdingValue))}</span></div>
      <p className="text-right text-[11px] text-muted-foreground">{currency(Math.max(0, total - discountValue - withholdingValue))} INR</p>
    </div>
  </div>;
}

export function NewInvoiceForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<InvoiceProductItem[]>([]);
  const [matchingProposals, setMatchingProposals] = useState<ProposalMatch[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receivedPayment, setReceivedPayment] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedAmountEdited, setReceivedAmountEdited] = useState(false);
  const [receivedMode, setReceivedMode] = useState('UPI');
  const [receivedDepositTo, setReceivedDepositTo] = useState('');
  const [receivedDate, setReceivedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receivedReference, setReceivedReference] = useState('');
  const [receivedPaymentNumber, setReceivedPaymentNumber] = useState('');
  const [paymentAutoGenerate, setPaymentAutoGenerate] = useState(true);
  const [paymentSettingsOpen, setPaymentSettingsOpen] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [term, setTerm] = useState('Net 30');
  const [items, setItems] = useState<InvoiceItem[]>([blankItem(1)]);
  const [nextId, setNextId] = useState(2);
  const [discount, setDiscount] = useState(0);
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [withholding, setWithholding] = useState<'TDS' | 'TCS'>('TDS');
  const [withholdingRate, setWithholdingRate] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [gstin, setGstin] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [customerNotes, setCustomerNotes] = useState('Thanks for your business.');
  const [invoiceTerms, setInvoiceTerms] = useState('');
  const [numberMode, setNumberMode] = useState<'auto' | 'manual'>('auto');
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.rate * (1 - item.discount / 100), 0), [items]);
  const taxAmount = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.rate * (1 - item.discount / 100) * item.tax / 100, 0), [items]);
  const total = subtotal + taxAmount + shipping + adjustment;
  const discountAmount = Math.min(subtotal, discountMode === 'percent' ? subtotal * discount / 100 : discount);
  const withholdingAmount = Math.min(Math.max(0, subtotal - discountAmount), Math.max(0, subtotal - discountAmount) * withholdingRate / 100);
  const payableTotal = Math.max(0, total - discountAmount - withholdingAmount);
  const hasDescription = items.some((item) => item.description.trim() && Number.isInteger(item.quantity) && item.quantity > 0);
  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchInvoiceCustomers(), getInvoiceProductCatalog()])
      .then(([customerResult, catalogResult]) => {
        if (!active) return;
        if (customerResult.status === 'fulfilled') setCustomers(customerResult.value);
        else toast.error(customerResult.reason instanceof Error ? customerResult.reason.message : 'Could not load customers.');
        if (catalogResult.status === 'fulfilled') {
          setCatalog(catalogResult.value.catalog);
          setMatchingProposals(catalogResult.value.matchingProposals);
        } else {
          toast.error(catalogResult.reason instanceof Error ? catalogResult.reason.message : 'Could not load solar product catalog.');
        }
      })
      .finally(() => { if (active) setCustomersLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!customer) return;
    let active = true;
    getInvoiceProductCatalog({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      sourceType: customer.sourceType,
    }).then((res) => {
      if (!active) return;
      if (res.catalog?.length) setCatalog(res.catalog);
      if (res.matchingProposals) setMatchingProposals(res.matchingProposals);
    }).catch((err) => {
      console.warn('Could not refresh customer proposal catalog:', err);
    });
    return () => { active = false; };
  }, [customer]);
  useEffect(() => {
    if (receivedPayment && !receivedAmountEdited) setReceivedAmount(payableTotal.toFixed(2));
  }, [receivedPayment, receivedAmountEdited, payableTotal]);
  const changeTerm = (value: string) => {
    setTerm(value);
    const days = Number(value.replace('Net ', ''));
    if (value === 'Due on Receipt') setDueDate(invoiceDate);
    else if (value === 'Due end of month') setDueDate(endOfMonth(invoiceDate));
    else if (value === 'Due end of next month') setDueDate(endOfMonth(addMonths(invoiceDate, 1)));
    else if (Number.isFinite(days) && days > 0) setDueDate(addDays(invoiceDate, days));
  };
  const updateItem = (changed: InvoiceItem) => setItems((current) => current.map((item) => item.id === changed.id ? changed : item));
  const appendRow = () => { setItems((current) => [...current, blankItem(nextId)]); setNextId((id) => id + 1); };
  const handleScannedItem = useCallback((value: string): boolean => {
    const normalized = value.trim().toLocaleLowerCase();
    const match = catalog.find((entry) => entry.id.toLocaleLowerCase() === normalized || entry.name.trim().toLocaleLowerCase() === normalized);
    if (!match) { toast.error('No active catalog item matches this scan. Match the barcode value to a catalog item name or ID.'); return false; }
    const empty = items.find((entry) => !entry.description.trim());
    if (empty) updateItem({ ...empty, description: match.name, rate: match.price });
    else { setItems((current) => [...current, { ...blankItem(nextId), description: match.name, rate: match.price }]); setNextId((id) => id + 1); }
    toast.success(`${match.name} added to the invoice.`);
    return true;
  }, [catalog, items, nextId]);
  const askLeave = (destination: string) => { if (window.confirm('Discard this invoice? Your unsaved changes will be lost.')) router.push(destination); };
  const saveInvoice = async (status: 'DRAFT' | 'SENT') => {
    setErrors(true);
    if (!customer || !hasDescription) { toast.error(!customer ? 'Select a customer before saving.' : 'Add at least one item with a description.'); return; }
    if (numberMode === 'manual' && !invoiceNumber.trim()) { toast.error('Enter an invoice number or choose auto-generate.'); return; }
    setBusy(true);
    try {
      let invoiceCustomer = customer;
      if (customer.sourceType === 'admission') {
        const saved = await createInvoiceCustomerFromAdmission(customer.id.replace(/^admission:/, ''));
        invoiceCustomer = { id: saved.id, name: saved.name, email: saved.email ?? '', phone: saved.phone ?? '', address: saved.address ?? '', state: saved.state ?? '', gstin: saved.gstin ?? '', savedCustomer: true };
        setCustomer(invoiceCustomer);
        setCustomers((current) => [...current.filter((entry) => entry.id !== invoiceCustomer.id && entry.id !== customer.id), invoiceCustomer].sort((a, b) => a.name.localeCompare(b.name)));
      }
      const billedTo = [invoiceCustomer.name, invoiceCustomer.address, invoiceCustomer.email, invoiceCustomer.phone, gstin ? `GSTIN: ${gstin}` : ''].filter(Boolean).join('\n');
      const effectiveTaxRate = subtotal > 0 ? Math.min(1, Math.max(0, taxAmount / subtotal)) : 0;
      const invoice = await saveInvoiceRequest({
        ...(numberMode === 'manual' ? { invoiceNumber: invoiceNumber.trim() } : {}),
        billedTo,
        ...(invoiceCustomer.savedCustomer ? { customerId: invoiceCustomer.id } : {}),
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        notes: [subject.trim(), customerNotes.trim(), invoiceTerms.trim() ? `Terms & Conditions:\n${invoiceTerms.trim()}` : ''].filter(Boolean).join('\n\n'),
        taxRate: effectiveTaxRate,
        discountAmount,
        withholdingAmount,
        withholdingType: withholding,
        serviceCharge: shipping,
        otherCharges: adjustment,
        status: status === 'SENT' ? 'DRAFT' : status,
        ...(receivedPayment ? { initialPayment: {
          amount: Number(receivedAmount || payableTotal.toFixed(2)),
          ...(!paymentAutoGenerate ? { paymentNumber: receivedPaymentNumber.trim() } : {}),
          paymentDate: new Date(`${receivedDate}T00:00:00`).toISOString(),
          paymentMode: receivedMode,
          depositTo: receivedDepositTo,
          referenceNumber: receivedReference,
        } } : {}),
        items: items.filter((entry) => entry.description.trim() && entry.quantity > 0).map((item) => ({
          itemDescription: item.description.trim(),
          quantity: Math.max(1, Math.round(item.quantity)),
          unitPrice: item.rate * (1 - item.discount / 100),
        })),
      });
      setInvoiceNumber(invoice.invoiceNumber);
      setCreatedId(invoice.id);
      if (status === 'SENT') { setSendEmail(invoiceCustomer.email); setSendOpen(true); toast.success('Invoice saved. Review the recipient before sending.'); }
      else { toast.success('Invoice saved as draft.'); router.push(`/invoices/${invoice.id}`); }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save invoice.'); }
    finally { setBusy(false); }
  };

  return <PageContainer className="pb-4">
    <PageHeader title="New Invoice" description="Create an invoice for a customer using solar system packages, components, and proposal items." actions={<Button type="button" variant="outline" onClick={() => askLeave('/invoices')}><ArrowLeft className="mr-2 size-4" /> Back to invoices</Button>} />
    <div className="space-y-5">
      <Section title="Invoice Details">
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.5fr)]">
          <div className="lg:col-span-2"><FieldLabel required>Customer Name</FieldLabel><CustomerSelect value={customer} customers={customers} loading={customersLoading} onNew={() => setNewCustomerOpen(true)} onChange={(selected) => { setCustomer(selected); if (selected) setGstin(selected.gstin || ''); }} />{errors && !customer && <p className="mt-1 text-xs text-destructive">Please select a customer.</p>}</div>
          <Field label="Invoice#" required={numberMode === 'manual'}><div className="flex gap-2"><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder={numberMode === 'auto' ? 'Generated when saved' : 'Enter invoice number'} disabled={numberMode === 'auto'} /><Button type="button" variant="outline" size="icon" aria-label="Invoice number preferences" onClick={() => setPreferencesOpen(true)}><Settings2 className="size-4" /></Button></div></Field>
          <Field label="Invoice Date" required><DateInput date={invoiceDate} onChange={(date) => { setInvoiceDate(date); if (term === 'Due on Receipt') setDueDate(date); }} /></Field>
          <Field label="Terms"><select value={term} onChange={(e) => changeTerm(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{terms.map((entry) => <option key={entry}>{entry}</option>)}</select></Field>
          <Field label="Due Date"><DateInput date={dueDate} onChange={setDueDate} /></Field>
          <Field label="Subject" className="lg:col-span-2"><Textarea value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Let your customer know what this Invoice is for" className="min-h-20 resize-y" /></Field>
        </div>
      </Section>
      <Section title="GST Details" action={<span className="text-xs text-muted-foreground">Optional · GSTIN is not required</span>}>
        <div className="max-w-xl"><Field label="GSTIN (optional)"><Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="Enter GSTIN" /></Field></div>
      </Section>
      <Section title="Solar Products & Proposal Items" action={<Button type="button" size="sm" variant="outline" onClick={() => setScannerOpen(true)}><ScanLine className="mr-2 size-4" />Scan item</Button>}>
        {matchingProposals.length > 0 && (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Proposal Found for {customer?.name || 'Customer'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {matchingProposals[0].proposalNo ? `Proposal #${matchingProposals[0].proposalNo} · ` : ''}
                    {matchingProposals[0].items.length} item{matchingProposals[0].items.length === 1 ? '' : 's'} · {currency(matchingProposals[0].totalAmount)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const prop = matchingProposals[0];
                  if (prop.items.length > 0) {
                    setItems(prop.items.map((it, idx) => ({
                      id: idx + 1,
                      description: it.description,
                      quantity: it.quantity || 1,
                      rate: it.unitPrice || 0,
                      discount: 0,
                      tax: 0,
                    })));
                    setNextId(prop.items.length + 1);
                    toast.success(`Loaded ${prop.items.length} item(s) from proposal ${prop.proposalNo}.`);
                  }
                }}
              >
                <FileCheck className="size-4" />
                Apply Proposal Items
              </Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto"><table className="w-full min-w-[970px] border-separate border-spacing-0"><thead><tr className="bg-muted/35 text-left text-[11px] font-semibold text-muted-foreground"><th className="px-3 py-3">ITEM DETAILS</th><th className="px-2">QUANTITY</th><th className="px-2">RATE</th><th className="px-2">DISCOUNT</th><th className="px-2">TAX</th><th className="px-3 text-right">AMOUNT</th><th className="w-10" /></tr></thead><tbody>{items.map((item) => <InvoiceItemRow key={item.id} item={item} catalog={catalog} onChange={updateItem} onRemove={() => setItems((current) => current.length > 1 ? current.filter((entry) => entry.id !== item.id) : current)} onEnter={appendRow} />)}</tbody></table></div>
        {errors && !hasDescription && <p className="mt-2 text-xs text-destructive">Add an item description and quantity.</p>}
        <div className="mt-4"><Button type="button" variant="outline" size="sm" onClick={appendRow}><Plus className="size-4" /> Add Item</Button></div>
      </Section>
      <div className="grid gap-5 xl:grid-cols-2"><Section title="Customer Notes"><Textarea value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} className="min-h-24 resize-y" /><div className="mt-5"><label className="mb-2 block text-sm font-medium">Terms &amp; Conditions</label><Textarea value={invoiceTerms} onChange={(event) => setInvoiceTerms(event.target.value)} placeholder="Enter terms and conditions" className="min-h-24 resize-y" /></div></Section><Section title="Invoice Summary"><TotalsPanel subtotal={subtotal} taxAmount={taxAmount} discount={discount} setDiscount={setDiscount} discountMode={discountMode} setDiscountMode={setDiscountMode} shipping={shipping} setShipping={setShipping} adjustment={adjustment} setAdjustment={setAdjustment} total={total} withholding={withholding} setWithholding={setWithholding} withholdingRate={withholdingRate} setWithholdingRate={setWithholdingRate} /></Section></div>
      <Section title="Payment Received">
        <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={receivedPayment} onCheckedChange={(checked) => { setReceivedPayment(checked === true); if (checked === true) { setReceivedAmount(payableTotal.toFixed(2)); setReceivedAmountEdited(false); void getPaymentNumberPreview().then((preview) => { setReceivedPaymentNumber(preview.paymentNumber); setPaymentAutoGenerate(preview.settings.autoGenerate); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load payment number preferences.')); } }} />I have received the payment</label>
        {receivedPayment && <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Field label="Amount Received" required><Input type="number" min="0.01" max={payableTotal} step="0.01" value={receivedAmount} onChange={(event) => { setReceivedAmount(event.target.value); setReceivedAmountEdited(true); }} /></Field><Field label="Payment Mode" required><select value={receivedMode} onChange={(event) => setReceivedMode(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>Card</option><option>Other</option></select></Field><Field label="Deposit To"><Input value={receivedDepositTo} onChange={(event) => setReceivedDepositTo(event.target.value)} placeholder="Bank or cash account" /></Field><Field label="Payment Date" required><Input type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} /></Field><Field label="Reference #"><Input value={receivedReference} onChange={(event) => setReceivedReference(event.target.value)} /></Field>{!paymentAutoGenerate && <Field label="Payment #" required><div className="flex gap-2"><Input value={receivedPaymentNumber} onChange={(event) => setReceivedPaymentNumber(event.target.value)} /><Button type="button" variant="outline" size="icon" aria-label="Payment number settings" onClick={() => setPaymentSettingsOpen(true)}><Settings2 className="size-4" /></Button></div></Field>}</div>}
      </Section>
      <div className="flex justify-end"><Link href="/invoices" className="text-xs text-muted-foreground hover:text-foreground">Return to invoices</Link></div>
    </div>
    <footer className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={() => void saveInvoice('DRAFT')} disabled={busy}>{busy ? 'Saving…' : 'Save as Draft'}</Button><Button type="button" onClick={() => void saveInvoice('SENT')} disabled={busy}>{busy ? 'Saving…' : 'Save and Send'}</Button><Button type="button" variant="ghost" onClick={() => askLeave('/invoices')}>Cancel</Button></div></footer>
    <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}><DialogContent><DialogHeader><DialogTitle>Invoice Number Preferences</DialogTitle><DialogDescription>Choose how invoice numbers are assigned.</DialogDescription></DialogHeader><div className="space-y-3 py-2"><label className="flex cursor-pointer items-start gap-3 rounded-md border p-3"><input type="radio" checked={numberMode === 'auto'} onChange={() => setNumberMode('auto')} /><span><span className="block text-sm font-medium">Auto-generate</span><span className="text-xs text-muted-foreground">Numbers are assigned automatically.</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-md border p-3"><input type="radio" checked={numberMode === 'manual'} onChange={() => setNumberMode('manual')} /><span><span className="block text-sm font-medium">Enter manually</span><span className="text-xs text-muted-foreground">Set the invoice number for this invoice.</span></span></label></div><DialogFooter><Button type="button" onClick={() => setPreferencesOpen(false)}>Done</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={sendOpen} onOpenChange={setSendOpen}><DialogContent><DialogHeader><DialogTitle>Send Invoice</DialogTitle><DialogDescription>Invoice {invoiceNumber} is saved as a draft. Send the PDF to the customer.</DialogDescription></DialogHeader><div className="space-y-3 py-2"><Field label="To"><Input type="email" value={sendEmail} onChange={(event) => setSendEmail(event.target.value)} placeholder="customer@example.com" /></Field><Field label="Subject"><Input value={`Invoice ${invoiceNumber}`} readOnly /></Field></div><DialogFooter><Button type="button" variant="outline" onClick={() => { setSendOpen(false); if (createdId) router.push(`/invoices/${createdId}`); }}>Send later</Button><Button type="button" disabled={busy || !sendEmail.trim()} onClick={async () => { if (!createdId) return; setBusy(true); try { await sendInvoiceEmail(createdId, sendEmail.trim()); toast.success('Invoice emailed with the PDF attached.'); setSendOpen(false); router.push(`/invoices/${createdId}`); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send invoice.'); } finally { setBusy(false); } }}>{busy ? 'Sending…' : 'Send with PDF'}</Button></DialogFooter></DialogContent></Dialog>
    <InvoiceItemScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScannedItem} />
    <PaymentNumberSettingsDialog open={paymentSettingsOpen} onOpenChange={setPaymentSettingsOpen} onSaved={(settings) => { setPaymentAutoGenerate(settings.autoGenerate); void getPaymentNumberPreview().then((preview) => setReceivedPaymentNumber(preview.paymentNumber)); }} />
    <NewCustomerDialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen} onCreated={(created) => { setCustomers((current) => [...current.filter((entry) => entry.id !== created.id), created].sort((a, b) => a.name.localeCompare(b.name))); setCustomer(created); setGstin(created.gstin); }} />
  </PageContainer>;
}

function InvoiceItemScanner({ open, onOpenChange, onScan }: { open: boolean; onOpenChange: (open: boolean) => void; onScan: (value: string) => boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [cameraMessage, setCameraMessage] = useState('Starting camera…');

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const setup = async () => {
      const detectorWindow = window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } };
      if (!detectorWindow.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
        setCameraMessage('Camera barcode scanning is unavailable in this browser. Use a USB scanner in the field below.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (stopped || !videoRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraMessage('Point the camera at a catalog barcode.');
        const detector = new detectorWindow.BarcodeDetector();
        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results[0]?.rawValue) {
              if (onScan(results[0].rawValue)) onOpenChange(false);
              else setCameraMessage('This code did not match an active catalog item. Use the field below to enter an item name or ID.');
              return;
            }
          } catch { setCameraMessage('Could not read the barcode. Try again or use a USB scanner.'); }
          timer = setTimeout(() => void scan(), 300);
        };
        void scan();
      } catch {
        setCameraMessage('Camera access is unavailable. Use a USB scanner in the field below.');
      }
    };
    void setup();
    return () => { stopped = true; if (timer) clearTimeout(timer); stream?.getTracks().forEach((track) => track.stop()); };
  }, [open, onOpenChange, onScan]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scanValue.trim()) return;
    if (!onScan(scanValue)) return;
    setScanValue('');
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Scan invoice item</DialogTitle><DialogDescription>Scan a catalog item barcode. The current product catalog matches scans by item name or ID.</DialogDescription></DialogHeader><div className="space-y-3"><video ref={videoRef} muted playsInline className="aspect-video w-full rounded-md bg-muted object-cover" /><p className="text-xs text-muted-foreground">{cameraMessage}</p><form onSubmit={submit} className="flex gap-2"><Input autoFocus value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="USB scanner input or product item name / ID" /><Button type="submit">Add item</Button></form><p className="text-xs text-muted-foreground">This catalog does not store separate SKU or barcode values. Scanned codes must currently equal a product name or ID.</p></div></DialogContent></Dialog>;
}

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) { return <div className="mb-2 text-sm font-medium">{children}{required && <span className="ml-1 text-destructive" title="Required">*</span>}</div>; }
function Field({ label, children, required = false, className = '' }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) { return <div className={`grid gap-2 sm:grid-cols-[minmax(110px,0.55fr)_minmax(0,1.45fr)] sm:items-start ${className}`}><div className="pt-2"><FieldLabel required={required}>{label}</FieldLabel></div><div>{children}</div></div>; }
function DateInput({ date, onChange }: { date: Date; onChange: (date: Date) => void }) { return <Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="h-9 w-full justify-start font-normal"><CalendarDays className="mr-2 size-4 text-muted-foreground" />{format(date, 'dd MMM yyyy')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={(selected) => selected && onChange(selected)} /></PopoverContent></Popover>; }

function NewCustomerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (customer: Customer) => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', state: '', gstin: '' });

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await createInvoiceCustomerRequest(form);
      const customer: Customer = {
        id: created.id,
        name: created.name,
        email: created.email ?? '',
        phone: created.phone ?? '',
        address: created.address ?? '',
        state: created.state ?? '',
        gstin: created.gstin ?? '',
        savedCustomer: true,
      };
      onCreated(customer);
      setForm({ name: '', email: '', phone: '', address: '', state: '', gstin: '' });
      onOpenChange(false);
      toast.success('Customer added.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create customer.');
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>New Customer</DialogTitle><DialogDescription>Add a customer to the invoice directory. GST details are optional.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <Field label="Customer Name" required><Input autoFocus required maxLength={160} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Name or business name" /></Field>
        <Field label="Email"><Input type="email" maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@example.com" /></Field>
        <Field label="Phone"><Input type="tel" maxLength={32} value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Phone number" /></Field>
        <Field label="Billing Address"><Textarea maxLength={1000} value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Street, city, postal code" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State"><Input maxLength={80} value={form.state} onChange={(event) => update('state', event.target.value)} placeholder="State" /></Field>
          <Field label="GSTIN (optional)"><Input maxLength={32} value={form.gstin} onChange={(event) => update('gstin', event.target.value)} placeholder="GSTIN" /></Field>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : 'Save Customer'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
