"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Plus, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
  category: {
    id: string;
    name: string;
  };
}

interface SimpleTagInputProps {
  selectedTags: string[]; // Array of tag IDs
  onTagsChange: (tagIds: string[]) => void;
  categoryName?: string; // Filter to specific category like "Expense Type"
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

export function SimpleTagInput({
  selectedTags,
  onTagsChange,
  categoryName = "Expense Type",
  placeholder = "Search expense type tags...",
  className,
  disabled = false
}: SimpleTagInputProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagObjects, setSelectedTagObjects] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available tags for the category
  useEffect(() => {
    const loadTags = async () => {
      try {
        // First get the category ID
        const categoriesResponse = await fetch('/api/tags/categories');
        
        if (categoriesResponse.ok) {
          const categoriesResult = await categoriesResponse.json();
          
          const category = categoriesResult.data?.find((cat: any) => cat.name === categoryName);
          
          if (category) {
            // Then get tags for that category
            const tagsResponse = await fetch(`/api/tags?categoryId=${category.id}`);
            
            if (tagsResponse.ok) {
              const tagsResult = await tagsResponse.json();
              
              setAvailableTags(tagsResult.data || []);
              
              // Set selected tag objects based on selected IDs
              const selectedObjects = (tagsResult.data || []).filter((tag: Tag) => 
                selectedTags.includes(tag.id)
              );
              setSelectedTagObjects(selectedObjects);
            }
          }
        }
      } catch (error) {
        console.error('SimpleTagInput: Error loading tags:', error);
      }
    };

    loadTags();
  }, [categoryName, selectedTags]);

  // Filter tags based on search
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(searchValue.toLowerCase()) &&
    !selectedTags.includes(tag.id)
  );

  const addTag = (tag: Tag) => {
    const newSelectedTags = [...selectedTags, tag.id];
    onTagsChange(newSelectedTags);
    setSearchValue("");
    setOpen(false);
  };

  const removeTag = (tagId: string) => {
    const newSelectedTags = selectedTags.filter(id => id !== tagId);
    onTagsChange(newSelectedTags);
  };

  const createNewTag = async (name: string) => {
    try {
      // Get category ID first
      const categoriesResponse = await fetch('/api/tags/categories');
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json();
        const category = categoriesResult.data?.find((cat: any) => cat.name === categoryName);
        
        if (category) {
          const response = await fetch('/api/tags', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: name.trim(),
              categoryId: category.id
            }),
          });

          if (response.ok) {
            const result = await response.json();
            addTag(result.data);
            // Reload available tags to include the new one
            setAvailableTags(prev => [...prev, result.data]);
          }
        }
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Tags Display */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs px-2 py-1 gap-1"
              style={{ 
                backgroundColor: `${tag.color}15`,
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
                  className="h-3 w-3 p-0 hover:bg-transparent"
                  onClick={() => removeTag(tag.id)}
                >
                  <X className="h-2 w-2" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Tag Input */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between h-11 text-left font-normal"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{placeholder}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 z-[60]" align="start" sideOffset={4}>
            <Command>
              <CommandInput
                placeholder={`Search ${categoryName.toLowerCase()} tags...`}
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList className="max-h-[300px] overflow-auto">
                {availableTags.length === 0 ? (
                  <CommandEmpty>
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">Loading {categoryName} tags...</p>
                    </div>
                  </CommandEmpty>
                ) : filteredTags.length === 0 && searchValue.length >= 2 ? (
                  <CommandEmpty>
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">No tags found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => createNewTag(searchValue)}
                        className="w-full justify-start"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Create "{searchValue}" as {categoryName}
                      </Button>
                    </div>
                  </CommandEmpty>
                ) : filteredTags.length === 0 ? (
                  <CommandEmpty>
                    Start typing to search available tags...
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => addTag(tag)}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}