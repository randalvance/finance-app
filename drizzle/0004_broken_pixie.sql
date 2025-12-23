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
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_transaction_1_id_transactions_id_fk" FOREIGN KEY ("transaction_1_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_links" ADD CONSTRAINT "transaction_links_transaction_2_id_transactions_id_fk" FOREIGN KEY ("transaction_2_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transaction_links_t1" ON "transaction_links" USING btree ("transaction_1_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_links_t2" ON "transaction_links" USING btree ("transaction_2_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_links_user" ON "transaction_links" USING btree ("user_id");