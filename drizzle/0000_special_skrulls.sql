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
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#6366f1',
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"is_investment_account" varchar DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "accounts_user_id_name_unique" UNIQUE("user_id","name"),
	CONSTRAINT "currency_check" CHECK ("accounts"."currency" IN ('USD', 'SGD', 'EUR', 'JPY', 'PHP'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6366f1',
	"default_transaction_type" varchar(15) DEFAULT 'Debit',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_user_id_name_unique" UNIQUE("user_id","name"),
	CONSTRAINT "categories_transaction_type_check" CHECK ("categories"."default_transaction_type" IN ('Debit', 'TransferOut', 'Credit', 'TransferIn'))
);
--> statement-breakpoint
CREATE TABLE "computation_transactions" (
	"computation_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	"is_excluded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "computation_transactions_computation_id_transaction_id_pk" PRIMARY KEY("computation_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "computations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "computations_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"currency" varchar(3) NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"date" date NOT NULL,
	"source" varchar(50) DEFAULT 'exchangerate-api',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "exchange_rates_currency_date_unique" UNIQUE("currency","date")
);
--> statement-breakpoint
CREATE TABLE "import_source_accounts" (
	"import_source_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "import_source_accounts_import_source_id_account_id_pk" PRIMARY KEY("import_source_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "import_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "import_sources_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"import_source_id" integer,
	"filename" varchar(255) NOT NULL,
	"default_account_id" integer,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"preview_data" jsonb,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transaction_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"transaction_1_id" integer NOT NULL,
	"transaction_2_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "transaction_links_transaction_1_id_transaction_2_id_unique" UNIQUE("transaction_1_id","transaction_2_id"),
	CONSTRAINT "no_self_link" CHECK ("transaction_links"."transaction_1_id" != "transaction_links"."transaction_2_id"),
	CONSTRAINT "canonical_ordering" CHECK ("transaction_links"."transaction_1_id" < "transaction_links"."transaction_2_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_account_id" integer,
	"target_account_id" integer,
	"transaction_type" varchar(15) DEFAULT 'Debit' NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category_id" integer,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"import_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "transaction_type_check" CHECK ("transactions"."transaction_type" IN ('Debit', 'TransferOut', 'Credit', 'TransferIn')),
	CONSTRAINT "transaction_account_validation" CHECK (
      ("transactions"."transaction_type" = 'Debit' AND "transactions"."source_account_id" IS NOT NULL) OR
      ("transactions"."transaction_type" = 'TransferOut' AND "transactions"."source_account_id" IS NOT NULL AND "transactions"."target_account_id" IS NOT NULL) OR
      ("transactions"."transaction_type" = 'Credit' AND "transactions"."target_account_id" IS NOT NULL) OR
      ("transactions"."transaction_type" = 'TransferIn' AND "transactions"."source_account_id" IS NOT NULL AND "transactions"."target_account_id" IS NOT NULL AND "transactions"."source_account_id" != "transactions"."target_account_id")
    )
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"display_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computation_transactions" ADD CONSTRAINT "computation_transactions_computation_id_computations_id_fk" FOREIGN KEY ("computation_id") REFERENCES "public"."computations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computation_transactions" ADD CONSTRAINT "computation_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_source_accounts" ADD CONSTRAINT "import_source_accounts_import_source_id_import_sources_id_fk" FOREIGN KEY ("import_source_id") REFERENCES "public"."import_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_source_accounts" ADD CONSTRAINT "import_source_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_sources" ADD CONSTRAINT "import_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_import_source_id_import_sources_id_fk" FOREIGN KEY ("import_source_id") REFERENCES "public"."import_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_default_account_id_accounts_id_fk" FOREIGN KEY ("default_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_transaction_1_id_transactions_id_fk" FOREIGN KEY ("transaction_1_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_transaction_2_id_transactions_id_fk" FOREIGN KEY ("transaction_2_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_account_id_accounts_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_target_account_id_accounts_id_fk" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_balances_account" ON "account_balances" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_account_balances_user" ON "account_balances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_account_balances_date" ON "account_balances" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_account_balances_account_date" ON "account_balances" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "idx_computation_transactions_computation" ON "computation_transactions" USING btree ("computation_id");--> statement-breakpoint
CREATE INDEX "idx_computation_transactions_transaction" ON "computation_transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_computations_user" ON "computations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_date" ON "exchange_rates" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_currency" ON "exchange_rates" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "idx_import_source_accounts_source" ON "import_source_accounts" USING btree ("import_source_id");--> statement-breakpoint
CREATE INDEX "idx_import_source_accounts_account" ON "import_source_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_imports_user_id" ON "imports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_imports_source_id" ON "imports" USING btree ("import_source_id");--> statement-breakpoint
CREATE INDEX "idx_imports_status" ON "imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_imports_created_at" ON "imports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transaction_links_t1" ON "transaction_links" USING btree ("transaction_1_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_links_t2" ON "transaction_links" USING btree ("transaction_2_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_links_user" ON "transaction_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_source_account" ON "transactions" USING btree ("source_account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_target_account" ON "transactions" USING btree ("target_account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_category_id" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_type" ON "transactions" USING btree ("user_id","transaction_type");--> statement-breakpoint
CREATE INDEX "idx_transactions_import_id" ON "transactions" USING btree ("import_id");