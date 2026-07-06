/*
# Make book_id nullable in order_items for package purchases

## Overview
When a customer purchases a package, the order_items row has book_id = NULL
and package_id set to the package. The foreign key constraint on book_id
currently does not allow NULL values.

## Changes
1. Alter the order_items table to make book_id nullable
   - This allows package purchases to be stored with NULL book_id
   
## Notes
- Package items will have: book_id = NULL, package_id = uuid, is_package = true
- Individual book items will have: book_id = uuid, package_id = NULL, is_package = false
*/

-- Make book_id nullable
ALTER TABLE public.order_items 
  ALTER COLUMN book_id DROP NOT NULL;