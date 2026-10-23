'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaymentInput, PaymentNumberSettings, getPaymentNumberPreview, getPaymentSettings, recordInvoicePayment, saveInvoiceReminders, savePaymentSettings, sendInvoiceReminder } from '@/lib/api/invoice-api';
import { formatCurrency } from '@/lib/utils';

export function RecordPaymentDialog({ open, onOpenChange, invoiceId, customerName, balanceDue, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; invoiceId: string; customerName: string; balanceDue: number; onSuccess: () => void }) {
  const [amount, setAmount] = useState(balanceDue.toFixed(2));
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentNumber, setPaymentNumber] = useState('');
  const [mode, setMode] = useState('UPI');
  const [depositTo, setDepositTo] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(balanceDue.toFixed(2));
    void getPaymentNumberPreview().then((preview) => { setPaymentNumber(preview.paymentNumber); setAutoGenerate(preview.settings.autoGenerate); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load payment number.'));
  }, [open, balanceDue]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > balanceDue) { toast.error(`Enter an amount greater than zero and no more than ${formatCurrency(balanceDue)}.`); return; }
    if (!autoGenerate && !paymentNumber.trim()) { toast.error('Enter a payment number.'); return; }
    setSaving(true);
    try {
      const input: PaymentInput = { amount: value, paymentDate: new Date(`${paymentDate}T00:00:00`).toISOString(), paymentMode: mode, depositTo, referenceNumber: reference, notes, ...(!autoGenerate ? { paymentNumber } : {}) };
      await recordInvoicePayment(invoiceId, input);
      toast.success('Payment recorded.');
      onOpenChange(false);
      onSuccess();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not record payment.'); }
    finally { setSaving(false); }
  };

  return <>
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle><DialogDescription>Record money received for this invoice.</DialogDescription></DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <Field label="Customer"><Input value={customerName} readOnly /></Field>
          <Field label="Amount Received"><Input type="number" min="0.01" max={balanceDue} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Payment Date"><Input type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></Field>
          <Field label="Payment #"><div className="flex gap-2"><Input required={!autoGenerate} value={paymentNumber} readOnly={autoGenerate} onChange={(event) => setPaymentNumber(event.target.value)} /><Button type="button" variant="outline" size="icon" aria-label="Configure payment number preferences" onClick={() => setSettingsOpen(true)}><Settings2 className="size-4" /></Button></div></Field>
          <Field label="Payment Mode"><select value={mode} onChange={(event) => setMode(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>Card</option><option>Other</option></select></Field>
          <Field label="Deposit To"><Input value={depositTo} onChange={(event) => setDepositTo(event.target.value)} placeholder="Bank or cash account" /></Field>
          <Field label="Reference #"><Input value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
          <Field label="Notes"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Payment'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <PaymentNumberSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={(settings) => { setAutoGenerate(settings.autoGenerate); void getPaymentNumberPreview().then((preview) => setPaymentNumber(preview.paymentNumber)); }} />
  </>;
}

export function PaymentNumberSettingsDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: (settings: PaymentNumberSettings) => void }) {
  const [settings, setSettings] = useState<PaymentNumberSettings>({ autoGenerate: true, prefix: 'PAY-', nextNumber: 1, padding: 6, restartEachFiscalYear: false });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setLoading(true); void getPaymentSettings().then(setSettings).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load settings.')).finally(() => setLoading(false)); } }, [open]);
  const save = async () => { setSaving(true); try { const updated = await savePaymentSettings(settings); setSettings(updated); onSaved(updated); onOpenChange(false); toast.success('Payment number preferences saved.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save settings.'); } finally { setSaving(false); } };
  return <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Configure Payment Number Preferences</DialogTitle><DialogDescription>Auto-generating payment numbers can save your time. Would you like to change your current setting?</DialogDescription></DialogHeader><div className="space-y-4 py-2"><label className="flex items-start gap-3 rounded-md border p-3"><input type="radio" checked={settings.autoGenerate} onChange={() => setSettings((current) => ({ ...current, autoGenerate: true }))} /><span className="text-sm">Auto-generate payment numbers</span></label>{settings.autoGenerate && <div className="grid gap-3 sm:grid-cols-3"><Field label="Prefix"><Input value={settings.prefix} onChange={(event) => setSettings((current) => ({ ...current, prefix: event.target.value }))} /></Field><Field label="Next Number"><Input type="number" min="1" value={settings.nextNumber} onChange={(event) => setSettings((current) => ({ ...current, nextNumber: Number(event.target.value) }))} /></Field><Field label="Padding"><Input type="number" min="1" max="12" value={settings.padding} onChange={(event) => setSettings((current) => ({ ...current, padding: Number(event.target.value) }))} /></Field></div>}<label className="flex items-start gap-3 rounded-md border p-3"><input type="radio" checked={!settings.autoGenerate} onChange={() => setSettings((current) => ({ ...current, autoGenerate: false }))} /><span className="text-sm">Enter payment numbers manually</span></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.restartEachFiscalYear} onChange={(event) => setSettings((current) => ({ ...current, restartEachFiscalYear: event.target.checked }))} />Restart numbering for payments at the start of each fiscal year (April)</label><div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">Configure multiple transaction number series to auto-generate transaction numbers with unique prefixes according to your business needs. <Button type="button" variant="link" className="h-auto p-0" onClick={() => toast.info('Contact your administrator to configure additional payment number series.')}>Configure</Button></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={() => void save()} disabled={loading || saving}>{loading ? 'Loading…' : saving ? 'Saving…' : 'Save'}</Button></DialogFooter></DialogContent></Dialog>;
}

export function RemindersDialog({ open, onOpenChange, invoiceId, remindersEnabled, reminderRules, email, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; invoiceId: string; remindersEnabled: boolean; reminderRules: string[]; email?: string | null; onSuccess: () => void }) {
  const [enabled, setEnabled] = useState(remindersEnabled);
  const [before, setBefore] = useState('3');
  const [onDue, setOnDue] = useState(true);
  const [after, setAfter] = useState('3');
  const [reminderEmail, setReminderEmail] = useState(email ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setEnabled(remindersEnabled); setBefore(remindersRule(reminderRules, 'before') ?? '3'); setOnDue(reminderRules.includes('on:0')); setAfter(remindersRule(reminderRules, 'after') ?? '3'); setReminderEmail(email ?? ''); } }, [open, remindersEnabled, reminderRules, email]);
  const save = async () => { setSaving(true); try { const rules = [`before:${before}`, ...(onDue ? ['on:0'] : []), `after:${after}`]; await saveInvoiceReminders(invoiceId, enabled, rules); toast.success('Reminder settings saved.'); onOpenChange(false); onSuccess(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save reminders.'); } finally { setSaving(false); } };
  const send = async () => { if (!reminderEmail.trim()) { toast.error('Enter the customer email address to send a reminder.'); return; } setSaving(true); try { await sendInvoiceReminder(invoiceId, reminderEmail.trim()); toast.success('Payment reminder sent.'); onSuccess(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send reminder.'); } finally { setSaving(false); } };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Payment Reminders</DialogTitle><DialogDescription>Choose when to remind this customer about the balance due.</DialogDescription></DialogHeader><div className="space-y-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Enable reminders</label><Field label="Reminder email"><Input type="email" value={reminderEmail} onChange={(event) => setReminderEmail(event.target.value)} placeholder="customer@example.com" /></Field><Field label="Before due"><select value={before} onChange={(event) => setBefore(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="1">1 day before</option><option value="3">3 days before</option><option value="7">7 days before</option><option value="14">14 days before</option></select></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onDue} onChange={(event) => setOnDue(event.target.checked)} />On due date</label><Field label="After due"><select value={after} onChange={(event) => setAfter(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="1">1 day after</option><option value="3">3 days after</option><option value="7">7 days after</option><option value="14">14 days after</option></select></Field></div><DialogFooter><Button variant="outline" onClick={() => void send()} disabled={saving}>Send reminder now</Button><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></DialogFooter></DialogContent></Dialog>;
}

function remindersRule(rules: string[], type: 'before' | 'after') { return rules.find((rule) => rule.startsWith(`${type}:`))?.split(':')[1]; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>; }
