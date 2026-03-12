CREATE TABLE "courses"."courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255),
	"title" varchar(100) NOT NULL,
	"description" varchar(2000) NOT NULL,
	"image_url" varchar(1000),
	"image_public_id" varchar(255),
	"video_preview_url" varchar(1000),
	"category" varchar(50) NOT NULL,
	"level" varchar(50),
	"current_price" integer NOT NULL,
	"original_price" integer,
	"instructor_id" uuid,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"rating" numeric(3, 2) DEFAULT '0',
	"total_ratings" integer DEFAULT 0,
	"duration" varchar(100),
	"lessons_count" integer DEFAULT 0,
	"videos_count" integer DEFAULT 0,
	"students_count" integer DEFAULT 0,
	"is_bestseller" boolean DEFAULT false,
	"urgency_text" varchar(255),
	"tags" jsonb,
	"last_synced_at" timestamp DEFAULT now(),
	"requires_form" boolean DEFAULT false,
	"sales_inquiry" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "courses"."lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"duration" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"amount" integer,
	"status" varchar(50) DEFAULT 'active',
	"is_active" boolean DEFAULT true,
	"payment_id" varchar(255),
	"enrolled_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "courses"."courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses"."lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses"."subscriptions" ADD CONSTRAINT "subscriptions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_status_category_idx" ON "courses"."courses" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "course_instructor_idx" ON "courses"."courses" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "course_students_count_idx" ON "courses"."courses" USING btree ("students_count");--> statement-breakpoint
CREATE INDEX "course_requires_form_idx" ON "courses"."courses" USING btree ("requires_form");--> statement-breakpoint
CREATE INDEX "course_sales_inquiry_idx" ON "courses"."courses" USING btree ("sales_inquiry");--> statement-breakpoint
CREATE INDEX "course_slug_idx" ON "courses"."courses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "subscription_user_course_idx" ON "courses"."subscriptions" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "subscription_active_idx" ON "courses"."subscriptions" USING btree ("is_active");