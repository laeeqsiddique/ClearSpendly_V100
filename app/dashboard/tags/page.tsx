"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Settings,
  Tag,
  Hash,
  Users,
  Trash2,
  Edit,
  Search,
  RefreshCw,
  Palette,
  BookOpen,
  MoreHorizontal
} from "lucide-react";
import AIChatAgent from '@/components/ai-chat-agent';

interface TagCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  required: boolean;
  multiple: boolean;
  sort_order: number;
  system?: boolean;
  created_at: string;
  updated_at: string;
}

interface TagData {
  id: string;
  name: string;
  description?: string;
  color: string;
  usage_count: number;
  created_at: string;
  category: {
    id: string;
    name: string;
    color: string;
    required: boolean;
    multiple: boolean;
  };
}

export default function TagsManagementPage() {
  // Helper function to handle authentication errors
  const handleAuthError = (response: Response) => {
    if (response.status === 401) {
      toast.error('Please sign in to continue');
      window.location.href = '/sign-in?returnTo=' + encodeURIComponent(window.location.pathname);
      return true;
    }
    return false;
  };

  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TagCategory | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    required: false,
    multiple: true
  });

  // Category delete confirmation state
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<TagCategory | null>(null);

  // Tag dialog state
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [newTag, setNewTag] = useState({
    name: "",
    description: "",
    categoryId: "",
    color: ""
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagData | null>(null);

  // Loading states
  const [createCategoryLoading, setCreateCategoryLoading] = useState(false);
  const [updateCategoryLoading, setUpdateCategoryLoading] = useState(false);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const [createTagLoading, setCreateTagLoading] = useState(false);
  const [updateTagLoading, setUpdateTagLoading] = useState(false);
  const [deleteTagLoading, setDeleteTagLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load categories
      const categoriesResponse = await fetch('/api/tags/categories');
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json();
        setCategories(categoriesResult.data || []);
      } else if (handleAuthError(categoriesResponse)) {
        return;
      }

      // Load tags
      const tagsResponse = await fetch('/api/tags');
      if (tagsResponse.ok) {
        const tagsResult = await tagsResponse.json();
        setTags(tagsResult.data || []);
      } else if (handleAuthError(tagsResponse)) {
        return;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
    setCreateCategoryLoading(true);
    try {
      const response = await fetch('/api/tags/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Category "${newCategory.name}" created successfully!`);
        loadData();
        handleCategoryDialogChange(false);
      } else {
        if (handleAuthError(response)) {
          return;
        }
        const error = await response.json();
        toast.error(`Failed to create category: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category. Please try again.');
    } finally {
      setCreateCategoryLoading(false);
    }
  };

  const updateCategory = async () => {
    if (!editingCategory) return;
    
    setUpdateCategoryLoading(true);
    try {
      const response = await fetch(`/api/tags/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Category "${newCategory.name}" updated successfully!`);
        loadData();
        handleCategoryDialogChange(false);
      } else {
        const error = await response.json();
        toast.error(`Failed to update category: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category. Please try again.');
    } finally {
      setUpdateCategoryLoading(false);
    }
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;
    
    setDeleteCategoryLoading(true);
    try {
      const response = await fetch(`/api/tags/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Category "${categoryToDelete.name}" deleted successfully!`);
        loadData();
        setDeleteCategoryDialogOpen(false);
        setCategoryToDelete(null);
      } else {
        const error = await response.json();
        toast.error(`Failed to delete category: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category. Please try again.');
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  const handleEditCategory = (category: TagCategory) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || "",
      color: category.color,
      required: category.required,
      multiple: category.multiple
    });
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (category: TagCategory) => {
    setCategoryToDelete(category);
    setDeleteCategoryDialogOpen(true);
  };

  const handleCategoryDialogChange = (open: boolean) => {
    setCategoryDialogOpen(open);
    if (!open) {
      // Only reset form when closing
      setEditingCategory(null);
      setNewCategory({
        name: "",
        description: "",
        color: "#6366f1",
        required: false,
        multiple: true
      });
    }
  };

  const createTag = async () => {
    setCreateTagLoading(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTag),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Tag "${newTag.name}" created successfully!`);
        loadData();
        handleTagDialogChange(false);
      } else {
        const error = await response.json();
        toast.error(`Failed to create tag: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag. Please try again.');
    } finally {
      setCreateTagLoading(false);
    }
  };

  const updateTag = async () => {
    if (!editingTag) return;
    
    setUpdateTagLoading(true);
    try {
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTag.name,
          description: newTag.description,
          categoryId: newTag.categoryId,
          color: newTag.color
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Tag "${newTag.name}" updated successfully!`);
        loadData();
        handleTagDialogChange(false);
      } else {
        const error = await response.json();
        toast.error(`Failed to update tag: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Failed to update tag. Please try again.');
    } finally {
      setUpdateTagLoading(false);
    }
  };

  const deleteTag = async () => {
    if (!tagToDelete) return;
    
    setDeleteTagLoading(true);
    try {
      const response = await fetch(`/api/tags/${tagToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Tag "${tagToDelete.name}" deleted successfully!`);
        loadData();
        setDeleteDialogOpen(false);
        setTagToDelete(null);
      } else {
        const error = await response.json();
        toast.error(`Failed to delete tag: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag. Please try again.');
    } finally {
      setDeleteTagLoading(false);
    }
  };

  const handleEditTag = (tag: TagData) => {
    setEditingTag(tag);
    setNewTag({
      name: tag.name,
      description: tag.description || "",
      categoryId: tag.category.id,
      color: tag.color
    });
    setTagDialogOpen(true);
  };

  const handleDeleteTag = (tag: TagData) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleTagDialogChange = (open: boolean) => {
    setTagDialogOpen(open);
    if (!open) {
      // Only reset form when closing
      setEditingTag(null);
      setNewTag({
        name: "",
        description: "",
        categoryId: "",
        color: ""
      });
    }
  };

  // Filter tags based on search and category
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || tag.category.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Color options
  const colorOptions = [
    "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", 
    "#ef4444", "#ec4899", "#84cc16", "#f97316", "#6b7280"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Tag Management
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Organize your expense categories and tags
          </p>
        </div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row items-stretch sm:items-center gap-3">
          <Dialog open={categoryDialogOpen} onOpenChange={handleCategoryDialogChange}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-purple-200 hover:bg-purple-50 w-full sm:w-auto h-11 touch-manipulation">
                <BookOpen className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Tag Category'}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? 'Update category details.' : 'Categories help organize your tags into logical groups.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    placeholder="e.g., Project, Department"
                  />
                </div>
                <div>
                  <Label htmlFor="category-description">Description</Label>
                  <Input
                    id="category-description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newCategory.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCategory({...newCategory, color})}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={newCategory.required}
                    onCheckedChange={(checked) => setNewCategory({...newCategory, required: !!checked})}
                  />
                  <Label htmlFor="required">Required (must have at least one tag)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="multiple"
                    checked={newCategory.multiple}
                    onCheckedChange={(checked) => setNewCategory({...newCategory, multiple: !!checked})}
                  />
                  <Label htmlFor="multiple">Allow multiple tags</Label>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={editingCategory ? updateCategory : createCategory} 
                  disabled={createCategoryLoading || updateCategoryLoading}
                >
                  {(editingCategory && updateCategoryLoading) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (!editingCategory && createCategoryLoading) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    editingCategory ? 'Update Category' : 'Create Category'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={tagDialogOpen} onOpenChange={handleTagDialogChange}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto h-11 touch-manipulation">
                <Tag className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
                <DialogDescription>
                  {editingTag ? 'Update tag details.' : 'Add a new tag to organize your expenses.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tag-name">Name</Label>
                  <Input
                    id="tag-name"
                    value={newTag.name}
                    onChange={(e) => setNewTag({...newTag, name: e.target.value})}
                    placeholder="e.g., Q1-2024, Marketing"
                  />
                </div>
                <div>
                  <Label htmlFor="tag-category">Category</Label>
                  <Select value={newTag.categoryId} onValueChange={(value) => setNewTag({...newTag, categoryId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tag-description">Description</Label>
                  <Input
                    id="tag-description"
                    value={newTag.description}
                    onChange={(e) => setNewTag({...newTag, description: e.target.value})}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <Label>Color (optional)</Label>
                  <div className="flex gap-2 mt-2">
                    <button
                      className={`w-6 h-6 rounded-full border-2 ${
                        !newTag.color ? 'border-gray-900' : 'border-gray-300'
                      } bg-gray-100`}
                      onClick={() => setNewTag({...newTag, color: ""})}
                      title="Use category color"
                    >
                      <Palette className="h-3 w-3 mx-auto text-gray-600" />
                    </button>
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newTag.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTag({...newTag, color})}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={editingTag ? updateTag : createTag} 
                  disabled={!newTag.name || !newTag.categoryId || createTagLoading || updateTagLoading}
                >
                  {(editingTag && updateTagLoading) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (!editingTag && createTagLoading) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    editingTag ? 'Update Tag' : 'Create Tag'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Tag</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{tagToDelete?.name}"? This action cannot be undone.
                  {tagToDelete && tagToDelete.usage_count > 0 && (
                    <span className="block mt-2 text-orange-600 font-medium">
                      Warning: This tag is used in {tagToDelete.usage_count} receipt{tagToDelete.usage_count > 1 ? 's' : ''}.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteTagLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={deleteTag} disabled={deleteTagLoading}>
                  {deleteTagLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Tag'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Category Delete Confirmation Dialog */}
          <Dialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Category</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the category "{categoryToDelete?.name}"? This action cannot be undone.
                  {categoryToDelete && (() => {
                    const categoryTags = tags.filter(tag => tag.category.id === categoryToDelete.id);
                    return categoryTags.length > 0 && (
                      <span className="block mt-2 text-orange-600 font-medium">
                        Warning: This category contains {categoryTags.length} tag{categoryTags.length > 1 ? 's' : ''} that will also be deleted.
                      </span>
                    );
                  })()}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteCategoryDialogOpen(false)} disabled={deleteCategoryLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={deleteCategory} disabled={deleteCategoryLoading}>
                  {deleteCategoryLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Category'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {categories.map((category) => {
          const categoryTags = tags.filter(tag => tag.category.id === category.id);
          const totalUsage = categoryTags.reduce((sum, tag) => sum + tag.usage_count, 0);

          return (
            <Card key={category.id} className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity touch-manipulation"
                      onClick={() => handleEditCategory(category)}
                      title="Edit category"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!category.system && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity touch-manipulation"
                        onClick={() => handleDeleteCategory(category)}
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tags:</span>
                    <span className="font-medium">{categoryTags.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usage:</span>
                    <span className="font-medium">{totalUsage}</span>
                  </div>
                  <div className="flex gap-1 text-xs">
                    {category.system && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">System</Badge>
                    )}
                    {category.required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                    {category.multiple && (
                      <Badge variant="outline" className="text-xs">Multiple</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tags Table */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
              <Tag className="h-5 w-5 text-purple-600" />
              All Tags ({filteredTags.length})
            </CardTitle>
            
            <div className="flex flex-col gap-3 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full h-11 touch-manipulation"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48 h-11 touch-manipulation">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent
                  className="max-h-[60vh] w-full sm:w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]"
                  position="popper"
                  side="bottom"
                  align="start"
                  avoidCollisions={true}
                  sticky="always"
                >
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredTags.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Tag className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No tags found</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4">
                {searchQuery || selectedCategory !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "Create your first tag to get started"
                }
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              <div className="block lg:hidden space-y-3">
                {filteredTags.map((tag) => (
                  <div key={tag.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-semibold text-sm truncate">{tag.name}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-manipulation">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          className="w-48 max-w-[calc(100vw-2rem)] shadow-lg border-gray-200"
                          side="bottom"
                          sideOffset={8}
                          avoidCollisions={true}
                          sticky="always"
                        >
                          <DropdownMenuItem 
                            onClick={() => handleEditTag(tag)}
                            className="h-11 px-4 py-3 cursor-pointer touch-manipulation hover:bg-gray-100 focus:bg-gray-100"
                          >
                            <Edit className="w-4 h-4 mr-3" />
                            <span className="text-sm font-medium">Edit Tag</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTag(tag)}
                            className="h-11 px-4 py-3 cursor-pointer touch-manipulation hover:bg-red-50 focus:bg-red-50 text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            <span className="text-sm font-medium">Delete Tag</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Category Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Category:</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: tag.category.color,
                          color: tag.category.color 
                        }}
                      >
                        {tag.category.name}
                      </Badge>
                    </div>
                    
                    {/* Description */}
                    {tag.description && (
                      <div className="space-y-1">
                        <span className="text-xs text-gray-600">Description:</span>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{tag.description}</p>
                      </div>
                    )}
                    
                    {/* Usage and Date */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Usage:</span>
                        <Badge variant="secondary" className="text-xs">
                          {tag.usage_count} times
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        Created {new Date(tag.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop: Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead>Tag</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Usage</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTags.map((tag) => (
                      <TableRow key={tag.id} className="hover:bg-purple-50/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="font-medium">{tag.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: tag.category.color,
                              color: tag.category.color 
                            }}
                          >
                            {tag.category.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {tag.description || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            {tag.usage_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(tag.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditTag(tag)}
                              title="Edit tag"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTag(tag)}
                              title="Delete tag"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* AI Chat Agent */}
      <AIChatAgent />
    </div>
  );
}