'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, MapPin, Phone, Plus, Search, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { createInvoiceCustomer, fetchInvoiceCustomers, type InvoiceCustomer } from '@/lib/api/invoice-api';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { getEnquiry } from '@/server/actions/enquiry';
import type { Enquiry } from '@/types/enquiry';

type CustomerForm = { name: string; email: string; phone: string; address: string; state: string; gstin: string };
const blankForm: CustomerForm = { name: '', email: '', phone: '', address: '', state: '', gstin: '' };

export default function CustomersPage() {
  const { data: session } = authClient.useSession();
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');
  const [customers, setCustomers] = useState<InvoiceCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerForm>(blankForm);
  const canCreate = session?.user?.role === 'admin' || session?.user?.role === 'executive';

  useEffect(() => {
    let active = true;
    fetchInvoiceCustomers()
      .then((records) => { if (active) setCustomers(records.filter((record) => record.savedCustomer)); })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load customers.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!leadId) return;
    if (!session) return;
    if (!canCreate) {
      toast.error('Only admins and sales executives can add customer records.');
      return;
    }
    let active = true;
    getEnquiry(leadId).then((result) => {
      if (!active) return;
      if (!result.success || !result.data) {
        toast.error(result.message || 'Could not load the selected lead.');
        return;
      }
      const lead = result.data as Enquiry;
      setForm((current) => ({ ...current, name: lead.candidateName || '', email: lead.email || '', phone: lead.phone || '', address: lead.address || '' }));
      setDialogOpen(true);
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load the selected lead.'));
    return () => { active = false; };
  }, [leadId, session, canCreate]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone} ${customer.address}`.toLocaleLowerCase().includes(term));
  }, [customers, search]);

  const saveCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await createInvoiceCustomer({ ...form, name: form.name.trim() });
      setCustomers((current) => [...current.filter((customer) => customer.id !== created.id), { ...created, savedCustomer: true }].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(blankForm);
      setDialogOpen(false);
      toast.success('Customer added.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add customer.');
    } finally {
      setSaving(false);
    }
  };

  return <PageContainer>
    <PageHeader
      title="Customers"
      description="Keep solar homeowners, businesses, and project contacts together."
      actions={canCreate ? <Button onClick={() => setDialogOpen(true)}><Plus /> Add Customer</Button> : undefined}
    />
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Customer Directory</CardTitle><CardDescription>{customers.length} saved {customers.length === 1 ? 'customer' : 'customers'}</CardDescription></div>
          <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search customers" aria-label="Search customers" /></div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="p-10 text-center text-sm text-muted-foreground">Loading customers…</div> : filteredCustomers.length === 0 ? <EmptyState icon={Sun} title={search ? 'No customers match that search' : 'No saved customers yet'} description={search ? 'Try a different name, email, phone, or address.' : 'Add your first solar customer to start preparing quotes and invoices.'} action={canCreate && !search ? <Button onClick={() => setDialogOpen(true)}><Plus /> Add Customer</Button> : undefined} /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Contact</TableHead><TableHead>Billing location</TableHead><TableHead>Tax details</TableHead></TableRow></TableHeader>
              <TableBody>{filteredCustomers.map((customer) => <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell><div className="flex flex-col gap-1 text-sm text-muted-foreground">{customer.email && <span className="flex items-center gap-2"><Mail className="size-3.5" />{customer.email}</span>}{customer.phone && <span className="flex items-center gap-2"><Phone className="size-3.5" />{customer.phone}</span>}{!customer.email && !customer.phone && 'No contact details'}</div></TableCell>
                <TableCell className="max-w-sm"><span className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" />{[customer.address, customer.state].filter(Boolean).join(', ') || 'No billing address saved'}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground">{customer.gstin || 'Not provided'}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Add solar customer</DialogTitle><DialogDescription>Save a homeowner or business contact for quotes, projects, and invoices. GST details are optional.</DialogDescription></DialogHeader>
        <form id="customer-create-form" onSubmit={(event) => void saveCustomer(event)} className="grid gap-4 py-2">
          <div className="grid gap-2"><Label htmlFor="customer-name">Customer or business name *</Label><Input id="customer-name" required maxLength={160} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name or company" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="customer-email">Email</Label><Input id="customer-email" type="email" maxLength={254} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" /></div>
            <div className="grid gap-2"><Label htmlFor="customer-phone">Phone</Label><Input id="customer-phone" type="tel" maxLength={32} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone number" /></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="customer-address">Billing address</Label><Textarea id="customer-address" maxLength={1000} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Street, city, postal code" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="customer-state">State / region</Label><Input id="customer-state" maxLength={80} value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} placeholder="State or region" /></div>
            <div className="grid gap-2"><Label htmlFor="customer-gstin">GSTIN (optional)</Label><Input id="customer-gstin" maxLength={32} value={form.gstin} onChange={(event) => setForm((current) => ({ ...current, gstin: event.target.value }))} placeholder="GSTIN" /></div>
          </div>
        </form>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" form="customer-create-form" disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : 'Save Customer'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </PageContainer>;
}
