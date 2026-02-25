CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'USER' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`tin` text NOT NULL,
	`registration_number` text NOT NULL,
	`msic_code` text NOT NULL,
	`sst_registration_number` text,
	`address_line0` text,
	`address_line1` text,
	`address_line2` text,
	`postal_zone` text,
	`city_name` text,
	`state_code` text,
	`country_code` text DEFAULT 'MYS' NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`lhdn_client_id_encrypted` text,
	`lhdn_client_secret_encrypted` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `business_members` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`user_id` text,
	`role` text DEFAULT 'VIEWER' NOT NULL,
	`invited_by_user_id` text,
	`invite_token` text,
	`invite_email` text,
	`invite_expires_at` text,
	`accepted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_members_invite_token_unique` ON `business_members` (`invite_token`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`ocr_document_id` text,
	`invoice_number` text,
	`invoice_type` text DEFAULT '01' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`supplier_name` text,
	`supplier_tin` text,
	`supplier_registration` text,
	`buyer_name` text,
	`buyer_tin` text,
	`buyer_registration_number` text,
	`buyer_sst_number` text,
	`buyer_email` text,
	`buyer_phone` text,
	`buyer_address_line0` text,
	`buyer_address_line1` text,
	`buyer_city_name` text,
	`buyer_state_code` text,
	`buyer_country_code` text DEFAULT 'MYS' NOT NULL,
	`currency_code` text DEFAULT 'MYR' NOT NULL,
	`subtotal` text DEFAULT '0.00' NOT NULL,
	`tax_total` text DEFAULT '0.00' NOT NULL,
	`grand_total` text DEFAULT '0.00' NOT NULL,
	`issue_date` text,
	`due_date` text,
	`notes` text,
	`lhdn_uuid` text,
	`lhdn_submission_uid` text,
	`lhdn_validation_status` text,
	`lhdn_submitted_at` text,
	`lhdn_validated_at` text,
	`pdf_storage_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`classification_code` text DEFAULT '001' NOT NULL,
	`quantity` text NOT NULL,
	`unit_code` text DEFAULT 'KGM' NOT NULL,
	`unit_price` text NOT NULL,
	`subtotal` text NOT NULL,
	`tax_type` text NOT NULL,
	`tax_rate` text DEFAULT '0' NOT NULL,
	`tax_amount` text DEFAULT '0.00' NOT NULL,
	`total` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ocr_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text,
	`user_id` text NOT NULL,
	`business_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`original_filename` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`ocr_status` text DEFAULT 'PENDING' NOT NULL,
	`raw_text` text,
	`extracted_json` text,
	`confidence_score` text,
	`processing_error` text,
	`processed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lhdn_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`access_token_encrypted` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lhdn_tokens_business_id_unique` ON `lhdn_tokens` (`business_id`);--> statement-breakpoint
CREATE TABLE `lhdn_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`business_id` text NOT NULL,
	`submission_uid` text,
	`document_uuid` text,
	`submission_payload` text NOT NULL,
	`response_payload` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`error_message` text,
	`submitted_at` text,
	`validated_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`business_id` text,
	`invoice_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_hash_unique` ON `refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email_on_submitted` integer DEFAULT true NOT NULL,
	`email_on_validated` integer DEFAULT true NOT NULL,
	`email_on_rejected` integer DEFAULT true NOT NULL,
	`email_on_cancelled` integer DEFAULT false NOT NULL,
	`email_on_team_invite` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_preferences_user_id_unique` ON `notification_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `notification_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`business_id` text,
	`invoice_id` text,
	`channel` text NOT NULL,
	`event` text NOT NULL,
	`recipient_email` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`error_message` text,
	`sent_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `buyer_portal_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`recipient_email` text NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` text,
	`expires_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buyer_portal_tokens_token_hash_unique` ON `buyer_portal_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `bulk_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`initiated_by_user_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`original_filename` text NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`total_rows` integer,
	`success_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	`created_invoice_ids` text,
	`processing_error` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
