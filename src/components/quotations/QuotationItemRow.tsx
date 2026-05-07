import React, { useState, useEffect } from 'react';
import { QuotationItem } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface QuotationItemRowProps {
  item: QuotationItem;
  currency: string;
  onUpdate: (id: string, field: string, value: any) => void;
  onSync: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  index?: number;
}

export function QuotationItemRow({ item, currency, onUpdate, onSync, onDelete, isLoading, index }: QuotationItemRowProps) {
  // Use local state only for the inputs to keep them snappy
  const [localTitle, setLocalTitle] = useState(item.title);
  const [localDescription, setLocalDescription] = useState(item.description || '');
  const [localQty, setLocalQty] = useState(item.quantity.toString());
  const [localPrice, setLocalPrice] = useState(item.unit_price.toString());

  // Keep local state in sync with external item prop (when it changes from DB)
  useEffect(() => {
    setLocalTitle(item.title);
    setLocalDescription(item.description || '');
    setLocalQty(item.quantity.toString());
    setLocalPrice(item.unit_price.toString());
  }, [item.id, item.title, item.description, item.quantity, item.unit_price]);

  const handleChange = (field: string, value: any) => {
    if (field === 'title') setLocalTitle(value);
    if (field === 'description') setLocalDescription(value);
    if (field === 'quantity') setLocalQty(value);
    if (field === 'unit_price') setLocalPrice(value);

    // Immediate local update for summary calculations
    onUpdate(item.id, field, field === 'quantity' || field === 'unit_price' ? (parseFloat(value) || 0) : value);
  };

  const handleBlur = (field: string, value: any) => {
    onSync(item.id, field, field === 'quantity' || field === 'unit_price' ? (parseFloat(value) || 0) : value);
  };

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      {typeof index === 'number' && (
        <td className="px-4 py-2 text-xs text-muted-foreground align-top w-10">{index}</td>
      )}
      <td className="px-4 py-2">
        <Input
          value={localTitle}
          onChange={(e) => handleChange('title', e.target.value)}
          onBlur={(e) => handleBlur('title', e.target.value)}
          placeholder="Item name"
          className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0 font-semibold"
        />
        <Input
          value={localDescription}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={(e) => handleBlur('description', e.target.value)}
          placeholder="Description (optional)"
          className="bg-transparent border-0 p-0 h-auto text-sm text-muted-foreground mt-1 focus-visible:ring-0"
        />
      </td>
      <td className="p-3 w-24">
        <Input
          type="number"
          value={localQty}
          onChange={(e) => handleChange('quantity', e.target.value)}
          onBlur={(e) => handleBlur('quantity', e.target.value)}
          min="0"
          step="0.01"
          className="text-right h-8"
        />
      </td>
      <td className="p-3 w-32">
        <Input
          type="number"
          value={localPrice}
          onChange={(e) => handleChange('unit_price', e.target.value)}
          onBlur={(e) => handleBlur('unit_price', e.target.value)}
          min="0"
          step="0.01"
          className="text-right h-8"
        />
      </td>
      <td className="p-3 w-32 text-right font-medium">
        {currency}{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="p-3 w-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          disabled={isLoading}
          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
