-- Add categoryId column
ALTER TABLE "transactions" ADD COLUMN "category_id" INTEGER REFERENCES "categories"("id") ON DELETE RESTRICT;

-- For existing data, try to match category names to category IDs
-- This assumes categories with matching names exist
UPDATE "transactions" t
SET "category_id" = c.id
FROM "categories" c
WHERE t."category" = c."name" 
  AND t."user_id" = c."user_id";

-- Make categoryId NOT NULL after migration
ALTER TABLE "transactions" ALTER COLUMN "category_id" SET NOT NULL;

-- Drop the old category varchar column
ALTER TABLE "transactions" DROP COLUMN "category";

-- Add index for better query performance
CREATE INDEX "idx_transactions_category_id" ON "transactions"("category_id");
