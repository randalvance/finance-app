ALTER TABLE "categories" ALTER COLUMN "default_transaction_type" SET DATA TYPE varchar(15);--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "default_transaction_type" SET DEFAULT 'Debit';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "transaction_type" SET DATA TYPE varchar(15);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "transaction_type" SET DEFAULT 'Debit';