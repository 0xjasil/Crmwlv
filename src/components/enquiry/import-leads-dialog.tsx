'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileInput } from '@/components/ui/file-input';
import { toast } from 'sonner';
import { FileDown, Upload } from 'lucide-react';
import { bulkImportEnquiries } from '@/server/actions/enquiry';
import { getAllBranches } from '@/server/actions/data-management';
import { Branch } from '@/types/data-management';

interface ImportLeadsDialogProps {
  onSuccess?: () => void;
  branches?: Branch[];
}

export function ImportLeadsDialog({ onSuccess, branches: passedBranches }: ImportLeadsDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [branchId, setBranchId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [localBranches, setLocalBranches] = useState<Branch[]>([]);

  const branches = passedBranches && passedBranches.length > 0 ? passedBranches : localBranches;

  useEffect(() => {
    if (open && (!passedBranches || passedBranches.length === 0)) {
      getAllBranches().then((res) => {
        if (res.success) setLocalBranches(res.data as Branch[]);
      });
    }
  }, [open, passedBranches]);

  const handleDownloadTemplate = () => {
    const template = [
      {
        'Candidate Name': 'John Doe',
        Phone: '9876543210',
        Email: 'john@example.com',
        Address: '123 Main St, City',
        Notes: 'Interested in digital marketing',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'lead_import_template.xlsx');
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!branchId) {
      toast.error('Please select a branch');
      return;
    }

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet);

        // Next.js 15 requires plain objects. We sanitize to remove any hidden methods/prototypes.
        const plainJson = JSON.parse(JSON.stringify(rawJson));

        const result = await bulkImportEnquiries(plainJson, {
          branchId,
        });

        if (result.success) {
          toast.success(result.message);
          setOpen(false);
          setFile(null);
          onSuccess?.();
        } else {
          toast.error(result.message);
        }
        setIsImporting(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Import Error:', error);
      toast.error('An error occurred during import');
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Leads from Excel</DialogTitle>
          <DialogDescription>
            Select a branch, then upload your Excel file.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Excel File</Label>
            <FileInput
              value={file}
              onChange={setFile}
              accept=".xlsx, .xls, .csv"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-fit text-xs h-8"
            onClick={handleDownloadTemplate}
          >
            <FileDown className="mr-2 h-3 w-3" />
            Download Sample Template
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !file}>
            {isImporting ? 'Importing...' : 'Start Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
