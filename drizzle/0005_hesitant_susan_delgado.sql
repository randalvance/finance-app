-- Drop the old varchar category column
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "category";--> statement-breakpoint
-- Add new integer category_id column
ALTER TABLE "transactions" ADD COLUMN "category_id" integer;--> statement-breakpoint
-- Add foreign key constraint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Add index for performance
CREATE INDEX IF NOT EXISTS "idx_transactions_category_id" ON "transactions" USING btree ("category_id");