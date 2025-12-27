CREATE TABLE "computation_transactions" (
	"computation_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
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
ALTER TABLE "computation_transactions" ADD CONSTRAINT "computation_transactions_computation_id_computations_id_fk" FOREIGN KEY ("computation_id") REFERENCES "public"."computations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computation_transactions" ADD CONSTRAINT "computation_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_computation_transactions_computation" ON "computation_transactions" USING btree ("computation_id");--> statement-breakpoint
CREATE INDEX "idx_computation_transactions_transaction" ON "computation_transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_computations_user" ON "computations" USING btree ("user_id");