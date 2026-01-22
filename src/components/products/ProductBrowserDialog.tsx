import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Product } from '@/types/database';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ProductBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: Product) => void;
  showOutOfStockWarning?: boolean;
}

export function ProductBrowserDialog({ open, onOpenChange, onSelectProduct, showOutOfStockWarning = true }: ProductBrowserDialogProps) {
  const { data: products = [] } = useProducts();
  const { data: settings } = useCompanySettings();
  const [search, setSearch] = useState('');

  const currency = settings?.currency || '₹';

  const filteredProducts = products.filter(p => 
    p.is_active && 
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.sku.toLowerCase().includes(search.toLowerCase()) ||
     (p.description && p.description.toLowerCase().includes(search.toLowerCase())))
  );

  const handleSelect = (product: Product) => {
    if (showOutOfStockWarning && product.stock_quantity === 0) {
      toast.warning(`Warning: "${product.name}" is out of stock`, {
        description: 'The product was added but stock quantity is zero.',
      });
    } else if (showOutOfStockWarning && product.stock_quantity <= product.low_stock_threshold) {
      toast.warning(`Warning: "${product.name}" has low stock (${product.stock_quantity} remaining)`, {
        description: 'Consider checking inventory before finalizing.',
      });
    }
    onSelectProduct(product);
    onOpenChange(false);
    setSearch('');
  };

  const getStockBadge = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Out of Stock</Badge>;
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return <Badge className="bg-warning/20 text-warning-foreground border-warning/30 text-xs gap-1"><AlertTriangle className="h-3 w-3" />Low Stock ({product.stock_quantity})</Badge>;
    }
    return <Badge className="bg-success/20 text-success border-success/30 text-xs">In Stock ({product.stock_quantity})</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Browse Products</DialogTitle>
          <DialogDescription>
            Select a product to add to your document. Stock levels are shown for each item.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search by name, SKU, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {search ? 'No products found' : 'No active products available'}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer transition-colors ${
                    product.stock_quantity === 0 ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                  }`}
                  onClick={() => handleSelect(product)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{product.name}</p>
                      {getStockBadge(product)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{product.sku}</span>
                      {product.category && <span>• {product.category.name}</span>}
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-primary">
                      {currency}{product.unit_price.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      per {product.unit}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
