-- Migration: Add performance indexes for query optimization
-- Created: 2026-02-05
-- Description: Adds indexes for foreign keys, filtering, sorting, and RBAC queries

-- ==================================================================
-- CUSTOMERS TABLE INDEXES
-- ==================================================================

-- Foreign key indexes for JOIN operations
CREATE INDEX IF NOT EXISTS idx_customers_company_id
ON customers(company_id);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_customers_assigned_user_id
ON customers(assigned_user_id);--> statement-breakpoint

-- Email search index
CREATE INDEX IF NOT EXISTS idx_customers_email
ON customers(email);--> statement-breakpoint

-- Sorting index
CREATE INDEX IF NOT EXISTS idx_customers_created_at_desc
ON customers(created_at DESC);--> statement-breakpoint

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_customers_company_created
ON customers(company_id, created_at DESC);--> statement-breakpoint

-- ==================================================================
-- QUOTES TABLE INDEXES
-- ==================================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_quotes_company_id
ON quotes(company_id);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id
ON quotes(customer_id);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_quotes_created_by_id
ON quotes(created_by_id);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_quotes_measurement_id
ON quotes(measurement_id);--> statement-breakpoint

-- Status filtering index
CREATE INDEX IF NOT EXISTS idx_quotes_status
ON quotes(status);--> statement-breakpoint

-- Valid until index (for expiry jobs)
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until
ON quotes(valid_until);--> statement-breakpoint

-- Composite index for company + status filtering
CREATE INDEX IF NOT EXISTS idx_quotes_company_status
ON quotes(company_id, status);--> statement-breakpoint

-- Composite index for RBAC filtering
CREATE INDEX IF NOT EXISTS idx_quotes_company_creator
ON quotes(company_id, created_by_id);--> statement-breakpoint

-- ==================================================================
-- MEASUREMENTS TABLE INDEXES
-- ==================================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_measurements_company_id
ON measurements(company_id);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_measurements_customer_id
ON measurements(customer_id);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_measurements_created_by_id
ON measurements(created_by_id);--> statement-breakpoint

-- Composite index for customer measurements
CREATE INDEX IF NOT EXISTS idx_measurements_customer_created
ON measurements(customer_id, created_at DESC);--> statement-breakpoint

-- ==================================================================
-- SINKS TABLE INDEXES
-- ==================================================================

-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_sinks_company_id
ON sinks(company_id);--> statement-breakpoint

-- Composite index for active catalog queries
CREATE INDEX IF NOT EXISTS idx_sinks_company_active
ON sinks(company_id, is_active);--> statement-breakpoint

-- Filter indexes for matching algorithm
CREATE INDEX IF NOT EXISTS idx_sinks_material
ON sinks(material);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_sinks_mounting_style
ON sinks(mounting_style);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_sinks_bowl_count
ON sinks(bowl_count);--> statement-breakpoint

-- SKU lookup index
CREATE INDEX IF NOT EXISTS idx_sinks_sku
ON sinks(sku);--> statement-breakpoint

-- ==================================================================
-- QUOTE LINE ITEMS INDEXES
-- ==================================================================

-- Foreign key index (critical for JOIN operations)
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id
ON quote_line_items(quote_id);--> statement-breakpoint

-- Foreign key index for sink reference
CREATE INDEX IF NOT EXISTS idx_quote_line_items_sink_id
ON quote_line_items(sink_id);--> statement-breakpoint

-- Composite index for ordered line items
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_sort
ON quote_line_items(quote_id, sort_order);--> statement-breakpoint

-- ==================================================================
-- USERS TABLE INDEXES
-- ==================================================================

-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_users_company_id
ON users(company_id);--> statement-breakpoint

-- Role filtering
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);--> statement-breakpoint

-- ==================================================================
-- EMAIL LOGS INDEXES
-- ==================================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_quote_id
ON email_logs(quote_id);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by_id
ON email_logs(sent_by_id);
