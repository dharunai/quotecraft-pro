import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProductCategories, useCreateProductCategory, useUpdateProductCategory, useDeleteProductCategory } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Edit, Trash2, FolderOpen } from 'lucide-react';
import { ProductCategory } from '@/types/database';

export default function ProductCategories() {
  const { data: categories = [], isLoading } = useProductCategories();
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const deleteCategory = useDeleteProductCategory();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sort_order: 0,
  });

  const handleOpenForm = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        sort_order: category.sort_order,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        sort_order: categories.length,
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const categoryData = {
      ...formData,
      description: formData.description || null,
    };

    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, ...categoryData }, {
        onSuccess: handleCloseForm,
      });
    } else {
      createCategory.mutate(categoryData, {
        onSuccess: handleCloseForm,
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCategory.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Product Categories</h1>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading categories...</p>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No categories yet</p>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Category
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Sort Order</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="font-medium">{category.name}</td>
                    <td className="text-muted-foreground">{category.description || '-'}</td>
                    <td>{category.sort_order}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenForm(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(category.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Category Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                  {(createCategory.isPending || updateCategory.isPending) ? 'Saving...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this category? Products in this category will not be deleted.
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
    </AppLayout>
  );
}
