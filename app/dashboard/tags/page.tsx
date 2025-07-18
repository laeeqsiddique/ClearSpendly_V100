"use client";

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
  BookOpen
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
      }

      // Load tags
      const tagsResponse = await fetch('/api/tags');
      if (tagsResponse.ok) {
        const tagsResult = await tagsResponse.json();
        setTags(tagsResult.data || []);
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
        setCategoryDialogOpen(false);
        setNewCategory({
          name: "",
          description: "",
          color: "#6366f1",
          required: false,
          multiple: true
        });
      } else {
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
        setCategoryDialogOpen(false);
        setEditingCategory(null);
        setNewCategory({
          name: "",
          description: "",
          color: "#6366f1",
          required: false,
          multiple: true
        });
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

  const handleCategoryDialogClose = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setNewCategory({
      name: "",
      description: "",
      color: "#6366f1",
      required: false,
      multiple: true
    });
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
        setTagDialogOpen(false);
        setNewTag({
          name: "",
          description: "",
          categoryId: "",
          color: ""
        });
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
        setTagDialogOpen(false);
        setEditingTag(null);
        setNewTag({
          name: "",
          description: "",
          categoryId: "",
          color: ""
        });
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

  const handleDialogClose = () => {
    setTagDialogOpen(false);
    setEditingTag(null);
    setNewTag({
      name: "",
      description: "",
      categoryId: "",
      color: ""
    });
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
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Tag Management
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Organize your expense categories and tags
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={categoryDialogOpen} onOpenChange={handleCategoryDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-purple-200 hover:bg-purple-50">
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

          <Dialog open={tagDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEditCategory(category)}
                      title="Edit category"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {!category.system && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteCategory(category)}
                        title="Delete category"
                      >
                        <Trash2 className="h-3 w-3" />
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-purple-600" />
              All Tags ({filteredTags.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
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
        <CardContent className="p-0">
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
        </CardContent>
      </Card>
      
      {/* AI Chat Agent */}
      <AIChatAgent />
    </div>
  );
}