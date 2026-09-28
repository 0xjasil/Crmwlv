'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save, X } from 'lucide-react';
import {
  addInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
} from '@/server/actions/invoice-actions';
import { toast } from 'sonner';
import { InvoiceItem } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { Label } from '../ui/label';

interface InvoiceItemsSectionProps {
  invoiceId: string;
  items: InvoiceItem[];
  onItemsChange: () => void;
}

interface NewItemForm {
  itemDescription: string;
  quantity: number;
  unitPrice: number;
}

interface EditingItem extends InvoiceItem {
  isEditing: boolean;
}

export function InvoiceItemsSection({ invoiceId, items, onItemsChange }: InvoiceItemsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<NewItemForm>({
    itemDescription: '',
    quantity: 1,
    unitPrice: 0,
  });
  const [editingItems, setEditingItems] = useState<Record<string, EditingItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = async () => {
    if (!newItem.itemDescription.trim() || newItem.quantity <= 0 || newItem.unitPrice < 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addInvoiceItem({
        invoiceId,
        itemDescription: newItem.itemDescription,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
      });

      if (result.data?.success) {
        toast.success('Item added successfully');
        setNewItem({ itemDescription: '', quantity: 1, unitPrice: 0 });
        setShowAddForm(false);
        onItemsChange();
      } else {
        toast.error(result.data?.message || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = (item: InvoiceItem) => {
    setEditingItems((prev) => ({
      ...prev,
      [item.id]: { ...item, isEditing: true },
    }));
  };

  const handleCancelEdit = (itemId: string) => {
    setEditingItems((prev) => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  const handleSaveEdit = async (itemId: string) => {
    const editingItem = editingItems[itemId];
    if (!editingItem) return;

    if (
      !editingItem.itemDescription.trim() ||
      editingItem.quantity <= 0 ||
      editingItem.unitPrice < 0
    ) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateInvoiceItem({
        id: itemId,
        itemDescription: editingItem.itemDescription,
        quantity: editingItem.quantity,
        unitPrice: editingItem.unitPrice,
      });

      if (result.data?.success) {
        toast.success('Item updated successfully');
        handleCancelEdit(itemId);
        onItemsChange();
      } else {
        toast.error(result.data?.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setIsSubmitting(true);
    try {
      const result = await deleteInvoiceItem({ id: itemId });

      if (result.data?.success) {
        toast.success('Item deleted successfully');
        onItemsChange();
      } else {
        toast.error(result.data?.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateEditingItem = (itemId: string, field: keyof EditingItem, value: string | number) => {
    setEditingItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoice Items</CardTitle>
            <CardDescription>Add and manage line items for this invoice</CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Item Form */}
        {showAddForm && (
          <div className="mb-6 p-6 border rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-200/60">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Add New Item</h4>
                <p className="text-sm text-gray-600">Enter item details to add to your invoice</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Item Description - Takes more space */}
              <div className="lg:col-span-5 space-y-2">
                <Label className="px-1 text-sm font-medium text-gray-700 flex items-center gap-1">
                  Item Description
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Describe the product or service..."
                  value={newItem.itemDescription}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, itemDescription: e.target.value }))
                  }
                  className="min-h-[90px] border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Quantity */}
              <div className="lg:col-span-2 space-y-2">
                <Label className="px-1 text-sm font-medium text-gray-700 flex items-center gap-1">
                  Quantity
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                  }
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-center"
                />
              </div>

              {/* Unit Price */}
              <div className="lg:col-span-2 space-y-2">
                <Label className="px-1 text-sm font-medium text-gray-700 flex items-center gap-1">
                  Unit Price
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={newItem.unitPrice}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))
                  }
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-right"
                />
              </div>

              {/* Line Total - Real-time calculation */}
              <div className="lg:col-span-3 space-y-2">
                <Label className="px-1 text-sm font-medium text-gray-700">Line Total</Label>
                <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-end">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency((newItem.quantity || 0) * (newItem.unitPrice || 0))}
                  </span>
                </div>
                <p className="px-1 text-xs text-gray-500">Qty × Price = Total</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <span className="text-red-500">*</span> Required fields
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    // Reset form when canceling
                    setNewItem({ itemDescription: '', quantity: 1, unitPrice: 0 });
                  }}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddItem}
                  disabled={
                    isSubmitting || !newItem.itemDescription.trim() || newItem.quantity <= 0
                  }
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        {items.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">No items added yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              Click &quot;Add Item&quot; to get started
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead className="w-[15%] text-center">Quantity</TableHead>
                <TableHead className="w-[15%] text-right">Unit Price</TableHead>
                <TableHead className="w-[15%] text-right">Line Total</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isEditing = editingItems[item.id]?.isEditing;
                const editingItem = editingItems[item.id];

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {isEditing ? (
                        <Textarea
                          value={editingItem.itemDescription}
                          onChange={(e) =>
                            updateEditingItem(item.id, 'itemDescription', e.target.value)
                          }
                          className="min-h-[60px]"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{item.itemDescription}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="1"
                          value={editingItem.quantity}
                          onChange={(e) =>
                            updateEditingItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="w-20 mx-auto"
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingItem.unitPrice}
                          onChange={(e) =>
                            updateEditingItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 ml-auto"
                        />
                      ) : (
                        formatCurrency(item.unitPrice)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {isEditing
                        ? formatCurrency(editingItem.quantity * editingItem.unitPrice)
                        : formatCurrency(item.lineTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={isSubmitting}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelEdit(item.id)}
                            disabled={isSubmitting}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditItem(item)}
                            disabled={isSubmitting}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isSubmitting}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
