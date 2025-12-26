CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"date" date NOT NULL,
	"source" varchar(50) DEFAULT 'exchangerate-api',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "exchange_rates_from_currency_to_currency_date_unique" UNIQUE("from_currency","to_currency","date")
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "transaction_type" SET DATA TYPE varchar(15);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "transaction_type" SET DEFAULT 'Debit';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "is_investment_account" varchar DEFAULT 'false' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_date" ON "exchange_rates" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_pair" ON "exchange_rates" USING btree ("from_currency","to_currency");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_base" ON "exchange_rates" USING btree ("from_currency");