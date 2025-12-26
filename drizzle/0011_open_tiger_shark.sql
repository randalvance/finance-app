CREATE TABLE "account_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"date" date NOT NULL,
	"currency" varchar(3) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "account_balances_currency_check" CHECK ("account_balances"."currency" IN ('USD', 'SGD', 'EUR', 'JPY', 'PHP'))
);
--> statement-breakpoint
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_balances_account" ON "account_balances" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_account_balances_user" ON "account_balances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_account_balances_date" ON "account_balances" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_account_balances_account_date" ON "account_balances" USING btree ("account_id","date");