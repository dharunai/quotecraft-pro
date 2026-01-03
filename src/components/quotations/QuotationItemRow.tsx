import React, { useState, useEffect } from 'react';
import { QuotationItem } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface QuotationItemRowProps {
  item: QuotationItem;
  currency: string;
  onUpdate: (item: Partial<QuotationItem> & { id: string }) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function QuotationItemRow({ item, currency, onUpdate, onDelete, isLoading }: QuotationItemRowProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [unitPrice, setUnitPrice] = useState(item.unit_price.toString());

  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const lineTotal = qty * price;

    if (
      title !== item.title ||
      description !== (item.description || '') ||
      qty !== item.quantity ||
      price !== item.unit_price
    ) {
      const timeoutId = setTimeout(() => {
        onUpdate({
          id: item.id,
          title,
          description: description || null,
          quantity: qty,
          unit_price: price,
          line_total: lineTotal,
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [title, description, quantity, unitPrice]);

  const lineTotal = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);

  return (
    <tr className="border-b border-border">
      <td className="p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item name"
          className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="bg-transparent border-0 p-0 h-auto text-sm text-muted-foreground mt-1 focus-visible:ring-0"
        />
      </td>
      <td className="p-3 w-24">
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="0"
          step="0.01"
          className="text-right"
        />
      </td>
      <td className="p-3 w-32">
        <Input
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          min="0"
          step="0.01"
          className="text-right"
        />
      </td>
      <td className="p-3 w-32 text-right font-medium">
        {currency}{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="p-3 w-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          disabled={isLoading}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
