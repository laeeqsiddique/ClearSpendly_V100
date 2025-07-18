"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Search, Tag, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagCategory {
  id: string;
  name: string;
  color: string;
  required: boolean;
  multiple: boolean;
}

interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  category: {
    id: string;
    name: string;
  };
  usageCount?: number;
}

interface SelectedTag extends Tag {
  categoryName: string;
}

interface TagInputProps {
  selectedTags: string[] | SelectedTag[]; // Accept both formats
  onTagsChange: (tags: string[] | SelectedTag[]) => void; // Return both formats
  categories: TagCategory[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}

export function TagInput({
  selectedTags,
  onTagsChange,
  categories,
  placeholder = "Search or create tags...",
  className,
  disabled = false
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTagObjects, setSelectedTagObjects] = useState<SelectedTag[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug categories on mount
  useEffect(() => {
    console.log('TagInput received categories:', categories.map(c => ({ name: c.name, multiple: c.multiple })));
  }, [categories]);

  // Convert string[] to SelectedTag[] if needed
  useEffect(() => {
    if (selectedTags.length === 0) {
      setSelectedTagObjects([]);
      return;
    }

    // If selectedTags is already SelectedTag[] format, use it directly
    if (selectedTags.length > 0 && typeof selectedTags[0] === 'object' && 'name' in selectedTags[0]) {
      setSelectedTagObjects(selectedTags as SelectedTag[]);
      return;
    }

    // If selectedTags is string[], convert to SelectedTag[]
    const loadTagObjects = async () => {
      try {
        const tagIds = selectedTags as string[];
        const tagObjects: SelectedTag[] = [];

        for (const tagId of tagIds) {
          // Fetch tag details for each ID
          const response = await fetch(`/api/tags/${tagId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const tag = result.data;
              const categoryName = categories.find(c => c.id === tag.category.id)?.name || tag.category.name;
              tagObjects.push({
                ...tag,
                categoryName
              });
            }
          }
        }

        setSelectedTagObjects(tagObjects);
      } catch (error) {
        console.error('Error loading tag objects:', error);
      }
    };

    if (selectedTags.length > 0) {
      loadTagObjects();
    }
  }, [selectedTags, categories]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 1) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const url = `/api/tags/suggestions?q=${encodeURIComponent(query)}&limit=10`;
        const response = await fetch(url);
        
        if (response.ok) {
          const result = await response.json();
          setSuggestions(result.data || []);
        }
      } catch (error) {
        console.error('TagInput: Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchValue);
  }, [searchValue, debouncedSearch]);


  const addTag = (tag: Tag) => {
    const categoryName = categories.find(c => c.id === tag.category.id)?.name || tag.category.name;
    const selectedTag: SelectedTag = {
      ...tag,
      categoryName
    };

    // Check if tag is already selected
    if (selectedTagObjects.some(t => t.id === tag.id)) {
      // Force close everything immediately
      setSearchValue("");
      setSuggestions([]);
      setOpen(false);
      // Also blur the input to remove focus
      if (inputRef.current) {
        inputRef.current.blur();
      }
      return;
    }

    // Check category constraints
    const category = categories.find(c => c.id === tag.category.id);
    console.log('Adding tag:', tag.name, 'Category:', category?.name, 'Multiple allowed:', category?.multiple);
    
    if (category && !category.multiple) {
      // Remove existing tags from this category
      const filteredTags = selectedTagObjects.filter(t => t.category.id !== tag.category.id);
      const newTags = [...filteredTags, selectedTag];
      console.log('Single tag category - replacing existing tags. New tags:', newTags.map(t => t.name));
      setSelectedTagObjects(newTags);
      onTagsChange(newTags);
    } else {
      const newTags = [...selectedTagObjects, selectedTag];
      console.log('Multiple tag category - adding to existing. New tags:', newTags.map(t => t.name));
      setSelectedTagObjects(newTags);
      onTagsChange(newTags);
    }

    // Clear search for next tag
    setSearchValue("");
    setSuggestions([]);
  };

  const removeTag = (tagId: string) => {
    const newTags = selectedTagObjects.filter(t => t.id !== tagId);
    setSelectedTagObjects(newTags);
    onTagsChange(newTags);
  };

  const createNewTag = async (name: string, categoryId: string) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          categoryId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        addTag(result.data);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      // Clear search for next tag
      setSearchValue("");
      setSuggestions([]);
    }
  };

  // Group selected tags by category
  const tagsByCategory = selectedTagObjects.reduce((acc, tag) => {
    const categoryName = tag.categoryName;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(tag);
    return acc;
  }, {} as Record<string, SelectedTag[]>);

  // Check for missing required categories
  const missingRequiredCategories = categories
    .filter(cat => cat.required && !tagsByCategory[cat.name])
    .map(cat => cat.name);

  // Check for category constraint violations (multiple tags in single-tag categories)
  const constraintViolations = Object.entries(tagsByCategory).filter(([categoryName, tags]) => {
    const category = categories.find(c => c.name === categoryName);
    return category && !category.multiple && tags.length > 1;
  });

  return (
    <div className={cn("space-y-3", className)} data-tag-input>
      {/* Selected Tags Display */}
      {Object.keys(tagsByCategory).length > 0 && (
        <div className="space-y-2">
          {Object.entries(tagsByCategory).map(([categoryName, tags]) => (
            <div key={categoryName} className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {categoryName}
              </span>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-xs px-2 py-1 gap-1"
                    style={{ 
                      backgroundColor: `${tag.color}20`,
                      borderColor: tag.color,
                      color: tag.color
                    }}
                  >
                    <Tag className="h-3 w-3" />
                    {tag.name}
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 p-0 hover:bg-transparent hover:text-red-500 transition-colors"
                        onClick={() => removeTag(tag.id)}
                      >
                        <Trash2 className="h-2 w-2" />
                      </Button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning for missing required categories */}
      {missingRequiredCategories.length > 0 && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
          Missing required tags: {missingRequiredCategories.join(", ")}
        </div>
      )}

      {/* Error for category constraint violations */}
      {constraintViolations.length > 0 && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          <strong>Error:</strong> Multiple tags detected in single-tag categories: {constraintViolations.map(([categoryName]) => categoryName).join(", ")}. Please remove extra tags.
        </div>
      )}

      {/* Modern Search Input with Inline Dropdown */}
      {!disabled && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setOpen(true)}
              className="pl-10 pr-4 h-10 w-full"
            />
          </div>
          
          {/* Inline Dropdown */}
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                  Searching...
                </div>
              ) : suggestions.length === 0 && searchValue.length >= 1 ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground mb-3 text-center">No tags found</p>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => createNewTag(searchValue, category.id)}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-50 rounded-md transition-colors group"
                        style={{ borderLeft: `3px solid ${category.color}` }}
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 group-hover:from-purple-600 group-hover:to-indigo-700 transition-all">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium">Create "{searchValue}" in {category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="py-2">
                  {suggestions.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{tag.name}</div>
                        <div className="text-xs text-muted-foreground">{tag.category.name}</div>
                      </div>
                      {tag.usageCount && tag.usageCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {tag.usageCount}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
      
      {/* Click outside to close */}
      {open && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setOpen(false);
            setSearchValue("");
          }} 
        />
      )}
    </div>
  );
}