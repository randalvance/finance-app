ALTER TABLE "exchange_rates" DROP CONSTRAINT "exchange_rates_from_currency_to_currency_date_unique";--> statement-breakpoint
DROP INDEX "idx_exchange_rates_pair";--> statement-breakpoint
DROP INDEX "idx_exchange_rates_base";--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "currency" varchar(3) NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_currency" ON "exchange_rates" USING btree ("currency");--> statement-breakpoint
ALTER TABLE "exchange_rates" DROP COLUMN "from_currency";--> statement-breakpoint
ALTER TABLE "exchange_rates" DROP COLUMN "to_currency";--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_currency_date_unique" UNIQUE("currency","date");