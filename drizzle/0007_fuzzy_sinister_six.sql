ALTER TABLE "categories" DROP CONSTRAINT "categories_transaction_type_check";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transaction_type_check";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transaction_account_validation";--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_transaction_type_check" CHECK ("categories"."default_transaction_type" IN ('Debit', 'TransferOut', 'Credit', 'TransferIn'));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transaction_type_check" CHECK ("transactions"."transaction_type" IN ('Debit', 'TransferOut', 'Credit', 'TransferIn'));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transaction_account_validation" CHECK (
      ("transactions"."transaction_type" = 'Debit' AND "transactions"."source_account_id" IS NOT NULL) OR
      ("transactions"."transaction_type" = 'TransferOut' AND "transactions"."source_account_id" IS NOT NULL AND "transactions"."target_account_id" IS NOT NULL) OR
      ("transactions"."transaction_type" = 'Credit' AND "transactions"."target_account_id" IS NOT NULL) OR
      ("transactions"."transaction_type" = 'TransferIn' AND "transactions"."source_account_id" IS NOT NULL AND "transactions"."target_account_id" IS NOT NULL)
    );