-- Rename expenses table to transactions
ALTER TABLE "expenses" RENAME TO "transactions";--> statement-breakpoint

-- Add new columns for transaction system
ALTER TABLE "transactions" ADD COLUMN "source_account_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "target_account_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transaction_type" varchar(10) DEFAULT 'Debit' NOT NULL;--> statement-breakpoint

-- Migrate existing data: all existing records become Debit transactions
UPDATE "transactions" SET "source_account_id" = "account_id", "transaction_type" = 'Debit';--> statement-breakpoint

-- Add foreign key constraints for new account columns
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_account_id_accounts_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_target_account_id_accounts_id_fk" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- Add check constraint for valid transaction types
ALTER TABLE "transactions" ADD CONSTRAINT "transaction_type_check" CHECK ("transaction_type" IN ('Debit', 'Credit', 'Transfer'));--> statement-breakpoint

-- Add validation constraint based on transaction type
ALTER TABLE "transactions" ADD CONSTRAINT "transaction_account_validation" CHECK (
  ("transaction_type" = 'Debit' AND "source_account_id" IS NOT NULL) OR
  ("transaction_type" = 'Credit' AND "target_account_id" IS NOT NULL) OR
  ("transaction_type" = 'Transfer' AND "source_account_id" IS NOT NULL AND "target_account_id" IS NOT NULL AND "source_account_id" != "target_account_id")
);--> statement-breakpoint

-- Drop old account_id column
ALTER TABLE "transactions" DROP COLUMN "account_id";--> statement-breakpoint

-- Add default_transaction_type to categories
ALTER TABLE "categories" ADD COLUMN "default_transaction_type" varchar(10) DEFAULT 'Debit';--> statement-breakpoint

-- Add check constraint for categories transaction type
ALTER TABLE "categories" ADD CONSTRAINT "categories_transaction_type_check" CHECK ("default_transaction_type" IN ('Debit', 'Credit', 'Transfer'));--> statement-breakpoint

-- Add indexes for performance
CREATE INDEX "idx_transactions_source_account" ON "transactions"("source_account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_target_account" ON "transactions"("target_account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "transactions"("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_type" ON "transactions"("user_id", "transaction_type");
