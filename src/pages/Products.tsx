import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProducts, useProductCategories, useCreateProduct, useUpdateProduct, useDeleteProduct, useGenerateSku } from '@/hooks/useProducts';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Package, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/database';
const UNITS = ['pcs', 'hour', 'kg', 'liter', 'meter', 'sqft', 'box', 'set'];
export default function Products() {
  const {
    data: products = [],
    isLoading
  } = useProducts();
  const {
    data: categories = []
  } = useProductCategories();
  const {
    data: settings
  } = useCompanySettings();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const generateSku = useGenerateSku();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    unit_price: 0,
    cost_price: 0,
    unit: 'pcs',
    tax_rate: null as number | null,
    stock_quantity: 0,
    low_stock_threshold: 10,
    is_active: true
  });
  const handleOpenForm = async (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        category_id: product.category_id || '',
        unit_price: product.unit_price,
        cost_price: product.cost_price || 0,
        unit: product.unit,
        tax_rate: product.tax_rate,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        is_active: product.is_active
      });
    } else {
      setEditingProduct(null);
      const sku = await generateSku.mutateAsync();
      setFormData({
        sku,
        name: '',
        description: '',
        category_id: '',
        unit_price: 0,
        cost_price: 0,
        unit: 'pcs',
        tax_rate: null,
        stock_quantity: 0,
        low_stock_threshold: 10,
        is_active: true
      });
    }
    setIsFormOpen(true);
  };
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      ...formData,
      category_id: formData.category_id || null,
      description: formData.description || null,
      cost_price: formData.cost_price || null,
      created_by: null
    };
    if (editingProduct) {
      updateProduct.mutate({
        id: editingProduct.id,
        ...productData
      }, {
        onSuccess: handleCloseForm
      });
    } else {
      createProduct.mutate(productData, {
        onSuccess: handleCloseForm
      });
    }
  };
  const handleDelete = () => {
    if (deleteId) {
      deleteProduct.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    let matchesStock = true;
    if (stockFilter === 'inStock') matchesStock = product.stock_quantity > product.low_stock_threshold;
    if (stockFilter === 'lowStock') matchesStock = product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
    if (stockFilter === 'outOfStock') matchesStock = product.stock_quantity === 0;
    return matchesSearch && matchesCategory && matchesStock;
  });
  const getStockBadge = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return <Badge className="bg-warning text-warning-foreground">Low Stock</Badge>;
    }
    return <Badge className="bg-success/20 text-success border-success/30">In Stock</Badge>;
  };
  const currency = settings?.currency || '₹';
  return <AppLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-sans">Products</h1>
          <Link to="/products/categories">
            <Button variant="outline" size="sm">
              <FolderOpen className="h-4 w-4 mr-2" />
              Categories
            </Button>
          </Link>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input placeholder="Search by name or SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-64" />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Stock Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Levels</SelectItem>
            <SelectItem value="inStock">In Stock</SelectItem>
            <SelectItem value="lowStock">Low Stock</SelectItem>
            <SelectItem value="outOfStock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading products...</p> : filteredProducts.length === 0 ? <div className="text-center py-12 bg-card rounded-lg border border-border">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4 font-sans">No products found</p>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Product
        </Button>
      </div> : <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => <tr key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                <td className="font-mono text-sm">{product.sku}</td>
                <td>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.description && <p className="text-sm text-muted-foreground truncate max-w-xs">{product.description}</p>}
                  </div>
                </td>
                <td className="text-muted-foreground">{product.category?.name || '-'}</td>
                <td className="font-medium">
                  {currency}{product.unit_price.toLocaleString('en-IN', {
                    minimumFractionDigits: 2
                  })}
                  <span className="text-muted-foreground text-sm">/{product.unit}</span>
                </td>
                <td>{product.stock_quantity}</td>
                <td>{getStockBadge(product)}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenForm(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(product.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Product Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-3xl p-0 gap-0 max-h-[92vh] overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Manage product identity, pricing, and stock levels.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(92vh-130px)]">
            <div className="overflow-y-auto px-6 py-5 space-y-6">

              {/* Identity preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-sm">
                  <Package className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{formData.name || 'New Product'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{formData.sku || 'SKU pending'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className={formData.stock_quantity === 0 ? 'bg-red-50 text-red-700 border-red-200' : formData.stock_quantity <= formData.low_stock_threshold ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                    {formData.stock_quantity === 0 ? 'Out of Stock' : formData.stock_quantity <= formData.low_stock_threshold ? 'Low Stock' : 'In Stock'}
                  </Badge>
                  <Badge variant="outline" className={formData.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600'}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Section 1: Identity */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Identity</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">SKU *</label>
                    <Input value={formData.sku} onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))} placeholder="PROD-0001" required className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Product Name *</label>
                    <Input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter product name" required />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">Active Status</p>
                    <p className="text-xs text-muted-foreground">Inactive products are hidden from quotes & invoices</p>
                  </div>
                  <Switch checked={formData.is_active} onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))} />
                </div>
              </section>

              {/* Section 2: Details */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Description</label>
                  <Textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Product description, specs, materials…" rows={3} className="resize-none" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Category</label>
                    <Select value={formData.category_id} onValueChange={v => setFormData(prev => ({ ...prev, category_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Unit of Measure</label>
                    <Select value={formData.unit} onValueChange={v => setFormData(prev => ({ ...prev, unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Section 3: Pricing */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Unit Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currency}</span>
                      <Input type="number" value={formData.unit_price} onChange={e => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" required className="pl-7" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Cost Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currency}</span>
                      <Input type="number" value={formData.cost_price} onChange={e => setFormData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" className="pl-7" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Tax Rate</label>
                    <div className="relative">
                      <Input type="number" value={formData.tax_rate || ''} onChange={e => setFormData(prev => ({ ...prev, tax_rate: e.target.value ? parseFloat(e.target.value) : null }))} min="0" max="100" step="0.01" placeholder="Default" className="pr-8" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Inventory */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inventory</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Stock Quantity</label>
                    <Input type="number" value={formData.stock_quantity} onChange={e => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))} min="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Low Stock Threshold</label>
                    <Input type="number" value={formData.low_stock_threshold} onChange={e => setFormData(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) || 10 }))} min="0" />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-muted/30">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="min-w-[130px]">
                {createProduct.isPending || updateProduct.isPending ? 'Saving…' : 'Save Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </AppLayout>;
}