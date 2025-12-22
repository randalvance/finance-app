CREATE TABLE "import_source_accounts" (
	"import_source_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "import_source_accounts_import_source_id_account_id_pk" PRIMARY KEY("import_source_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "import_source_accounts" ADD CONSTRAINT "import_source_accounts_import_source_id_import_sources_id_fk" FOREIGN KEY ("import_source_id") REFERENCES "public"."import_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_source_accounts" ADD CONSTRAINT "import_source_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_import_source_accounts_source" ON "import_source_accounts" USING btree ("import_source_id");--> statement-breakpoint
CREATE INDEX "idx_import_source_accounts_account" ON "import_source_accounts" USING btree ("account_id");