# IHMS - Comprehensive Test Plan

**Version:** 1.0
**Date:** 2026-02-01
**Application:** I Hate My Sink (IHMS) - Field Sales PWA
**Purpose:** Define test strategy, test cases, and quality requirements for IHMS application

---

## Table of Contents

1. [Test Strategy Overview](#test-strategy-overview)
2. [Testing Pyramid](#testing-pyramid)
3. [Critical User Flows](#critical-user-flows)
4. [Test Case Catalog](#test-case-catalog)
5. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
6. [PWA-Specific Testing](#pwa-specific-testing)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Test Environment Setup](#test-environment-setup)

---

## Test Strategy Overview

### Scope

This test plan covers:
- Authentication and authorization flows
- Customer CRUD operations
- Measurement capture and management
- Sink matching algorithm
- Quote creation and lifecycle management
- Offline/online synchronization
- PWA installation and functionality
- Data integrity and security

### Testing Approach

**Local-First Application**: IHMS is a Progressive Web App designed for field sales teams working in areas with unreliable connectivity. Testing must verify:
- Offline functionality (data capture without network)
- Sync integrity (data consistency when connectivity returns)
- Conflict resolution (server timestamp wins)
- User experience (offline indicators, pending sync queues)

### Quality Gates

All features must pass the following before deployment:
- 100% of critical path tests passing
- 80%+ code coverage for business logic
- 0 critical security vulnerabilities
- E2E smoke tests passing on Chrome, Safari, Edge
- Offline functionality verified on mobile devices

---

## Testing Pyramid

### Unit Tests (70% of tests)
- **Framework**: Vitest
- **Scope**: Business logic, utilities, calculations
- **Location**: `packages/api/src/**/*.test.ts`
- **Target Coverage**: 85%+

### Integration Tests (20% of tests)
- **Framework**: Vitest + Supertest
- **Scope**: API endpoints, database operations, tRPC procedures
- **Location**: `packages/api/src/routers/**/*.test.ts`
- **Target Coverage**: 70%+

### E2E Tests (10% of tests)
- **Framework**: Playwright
- **Scope**: Critical user journeys, cross-browser compatibility
- **Location**: `tests/e2e/**/*.spec.ts`
- **Target Coverage**: All critical paths

---

## Critical User Flows

### Priority 1: Essential for MVP
1. Authentication (login, token refresh, logout)
2. Customer creation and management
3. Measurement capture
4. Sink matching workflow
5. Quote generation

### Priority 2: Core Business Features
6. Quote acceptance with signature
7. Offline data capture with sync
8. Quote PDF generation
9. Email quote to customer

### Priority 3: Enhanced Features
10. Analytics dashboard
11. Workiz integration
12. Quote modification and versioning

---

## Test Case Catalog

### 1. Authentication Flow

#### TC-AUTH-001: User Registration (Happy Path)
**Priority:** Critical
**Category:** Authentication
**Preconditions:**
- Demo company exists (ID: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
- Email is not already registered

**Test Steps:**
1. Navigate to registration page
2. Enter valid email: `test-user-{timestamp}@example.com`
3. Enter valid password: `SecurePass123!` (min 8 chars, uppercase, lowercase, number)
4. Enter first name: `John`
5. Enter last name: `Doe`
6. Select demo company ID
7. Click "Register" button

**Expected Results:**
- HTTP 201 response received
- Access token returned (JWT format)
- Refresh token returned (JWT format)
- Expires in value returned (900 seconds / 15 minutes)
- User object returned with:
  - `id` (UUID)
  - `email` (lowercase normalized)
  - `firstName`: "John"
  - `lastName`: "Doe"
  - `role`: "salesperson" (default)
  - `companyId`: Demo company ID
  - `companyName`: "Demo Company"
- Tokens stored in localStorage
- User redirected to `/dashboard`
- User appears in database with hashed password

---

#### TC-AUTH-002: Duplicate Email Registration
**Priority:** Critical
**Category:** Authentication - Error Handling
**Preconditions:**
- User with email `existing@example.com` already registered

**Test Steps:**
1. Attempt to register with email `existing@example.com`
2. Use valid password and other details

**Expected Results:**
- HTTP 409 Conflict response
- Error message: "Email already registered"
- No new user created in database
- User NOT authenticated or redirected

---

#### TC-AUTH-003: Registration with Invalid Company ID
**Priority:** Critical
**Category:** Authentication - Error Handling
**Preconditions:** None

**Test Steps:**
1. Attempt to register with non-existent company ID: `00000000-0000-0000-0000-000000000000`

**Expected Results:**
- HTTP 404 Not Found response
- Error message: "Company not found"
- No user created in database

---

#### TC-AUTH-004: Registration with Weak Password
**Priority:** High
**Category:** Authentication - Validation
**Preconditions:** None

**Test Steps:**
1. Attempt to register with password: `weak`
2. Attempt to register with password: `12345678`
3. Attempt to register with password: `password`

**Expected Results:**
- HTTP 400 Bad Request for each attempt
- Zod validation error returned
- No user created in database

---

#### TC-AUTH-005: User Login (Happy Path)
**Priority:** Critical
**Category:** Authentication
**Preconditions:**
- User registered with email `test@example.com` and password `TestPass123!`

**Test Steps:**
1. Navigate to `/login`
2. Enter email: `test@example.com`
3. Enter password: `TestPass123!`
4. Click "Login" button

**Expected Results:**
- HTTP 200 response
- Access token returned
- Refresh token returned
- User profile returned
- `lastLoginAt` timestamp updated in database
- Tokens stored in localStorage and IndexedDB
- User redirected to `/dashboard`

---

#### TC-AUTH-006: Login with Case-Insensitive Email
**Priority:** High
**Category:** Authentication
**Preconditions:**
- User registered with email `test@example.com` (lowercase)

**Test Steps:**
1. Login with email: `TEST@EXAMPLE.COM` (uppercase)
2. Enter correct password

**Expected Results:**
- Login succeeds (email normalized to lowercase)
- User authenticated successfully

---

#### TC-AUTH-007: Login with Incorrect Password
**Priority:** Critical
**Category:** Authentication - Security
**Preconditions:**
- User registered with known credentials

**Test Steps:**
1. Enter correct email
2. Enter incorrect password: `WrongPassword123!`
3. Click "Login" button

**Expected Results:**
- HTTP 401 Unauthorized
- Error message: "Invalid email or password" (generic for security)
- No tokens returned
- User NOT authenticated
- Failed login NOT logged to prevent enumeration attacks

---

#### TC-AUTH-008: Login with Non-Existent Email
**Priority:** High
**Category:** Authentication - Security
**Preconditions:** None

**Test Steps:**
1. Enter non-existent email: `nonexistent@example.com`
2. Enter any password
3. Click "Login" button

**Expected Results:**
- HTTP 401 Unauthorized
- Error message: "Invalid email or password" (same as wrong password for security)
- No tokens returned

---

#### TC-AUTH-009: Login with Inactive Account
**Priority:** High
**Category:** Authentication - Authorization
**Preconditions:**
- User account exists with `isActive = false`

**Test Steps:**
1. Enter email and password of inactive user
2. Click "Login" button

**Expected Results:**
- HTTP 403 Forbidden
- Error message: "Account is disabled"
- No tokens returned
- User NOT authenticated

---

#### TC-AUTH-010: Token Refresh (Happy Path)
**Priority:** Critical
**Category:** Authentication - Token Management
**Preconditions:**
- User has valid refresh token

**Test Steps:**
1. Call refresh endpoint with valid refresh token
2. Wait 1+ second (to ensure different `iat` timestamp)

**Expected Results:**
- HTTP 200 response
- New access token returned (different from original)
- New refresh token returned (different from original)
- Both tokens have valid JWT format
- Tokens contain correct user claims (userId, email, role, companyId)

---

#### TC-AUTH-011: Token Refresh with Invalid Token
**Priority:** High
**Category:** Authentication - Security
**Preconditions:** None

**Test Steps:**
1. Call refresh endpoint with token: `invalid-token`

**Expected Results:**
- HTTP 401 Unauthorized
- Error message: "Invalid refresh token"
- No tokens returned

---

#### TC-AUTH-012: Token Refresh with Expired Token
**Priority:** High
**Category:** Authentication - Token Management
**Preconditions:**
- Refresh token expired (7 days old)

**Test Steps:**
1. Call refresh endpoint with expired refresh token

**Expected Results:**
- HTTP 401 Unauthorized
- Error message: "Invalid refresh token"
- User must login again

---

#### TC-AUTH-013: Token Refresh for Inactive User
**Priority:** High
**Category:** Authentication - Authorization
**Preconditions:**
- User has valid refresh token
- User account set to `isActive = false`

**Test Steps:**
1. Call refresh endpoint with valid refresh token

**Expected Results:**
- HTTP 403 Forbidden
- Error message: "Account is disabled"
- No tokens returned

---

#### TC-AUTH-014: Logout
**Priority:** Critical
**Category:** Authentication
**Preconditions:**
- User is authenticated

**Test Steps:**
1. Click "Logout" button

**Expected Results:**
- Access token removed from localStorage
- Refresh token removed from localStorage
- User object removed from localStorage
- Auth cache cleared from IndexedDB
- User state set to null in React context
- User redirected to `/login`
- Subsequent API calls fail with 401 until re-login

---

#### TC-AUTH-015: Protected Route Access Without Auth
**Priority:** Critical
**Category:** Authorization
**Preconditions:**
- User NOT authenticated

**Test Steps:**
1. Navigate directly to `/dashboard`

**Expected Results:**
- User redirected to `/login`
- Original destination preserved for redirect after login

---

#### TC-AUTH-016: Offline Authentication
**Priority:** Critical (PWA Feature)
**Category:** Authentication - Offline
**Preconditions:**
- User previously authenticated
- Tokens cached in IndexedDB
- Device offline

**Test Steps:**
1. Set device to airplane mode
2. Refresh application
3. Verify authentication state

**Expected Results:**
- User remains authenticated using cached credentials
- User can access offline features
- No API calls attempted
- Offline indicator shown in UI

---

### 2. Customer Management Flow

#### TC-CUST-001: Create Customer (Happy Path)
**Priority:** Critical
**Category:** Customer Management
**Preconditions:**
- User authenticated as salesperson

**Test Steps:**
1. Navigate to `/customers/new`
2. Enter first name: `Jane`
3. Enter last name: `Smith`
4. Enter email: `jane.smith@example.com`
5. Enter phone: `(555) 123-4567`
6. Enter address:
   - Street: `123 Main St`
   - City: `Springfield`
   - State: `IL`
   - Zip: `62701`
7. Enter notes: `Interested in undermount sink for kitchen remodel`
8. Click "Save Customer" button

**Expected Results:**
- HTTP 201 response
- Customer created in database with:
  - Auto-generated UUID
  - `companyId`: Demo company ID
  - `assignedUserId`: Current user's ID
  - All entered data stored correctly
  - `createdAt` and `updatedAt` timestamps set
- User redirected to customer detail page `/customers/{id}`
- Success toast notification shown
- Customer appears in customer list

---

#### TC-CUST-002: Create Customer with Minimal Data
**Priority:** High
**Category:** Customer Management
**Preconditions:**
- User authenticated

**Test Steps:**
1. Navigate to `/customers/new`
2. Enter only required fields:
   - First name: `John`
   - Last name: `Doe`
3. Leave email, phone, address, notes blank
4. Click "Save Customer" button

**Expected Results:**
- Customer created successfully
- Optional fields stored as null/undefined
- No validation errors

---

#### TC-CUST-003: Create Customer with Invalid Email
**Priority:** High
**Category:** Customer Management - Validation
**Preconditions:**
- User authenticated

**Test Steps:**
1. Enter first and last name
2. Enter invalid email: `not-an-email`
3. Click "Save Customer" button

**Expected Results:**
- Form validation error shown
- Error message: "Invalid email format"
- Customer NOT created
- User remains on form

---

#### TC-CUST-004: List Customers with Pagination
**Priority:** Critical
**Category:** Customer Management
**Preconditions:**
- 75 customers exist in database

**Test Steps:**
1. Navigate to `/customers`
2. Verify first page loads (limit: 50)
3. Scroll to bottom
4. Click "Load More" button

**Expected Results:**
- First 50 customers displayed, ordered by `createdAt DESC`
- "Load More" button visible
- Clicking "Load More" loads next 25 customers
- Total count displayed: "Showing 75 of 75 customers"
- No "Load More" button after all loaded

---

#### TC-CUST-005: Search Customers
**Priority:** High
**Category:** Customer Management
**Preconditions:**
- Customer exists: `Jane Smith`, email `jane@example.com`, phone `(555) 123-4567`

**Test Steps:**
1. Navigate to `/customers`
2. Enter search term: `Jane`
3. Verify results
4. Clear search
5. Enter search term: `jane@example.com`
6. Verify results
7. Enter search term: `555-123`
8. Verify results

**Expected Results:**
- Search by first name returns Jane Smith
- Search by email returns Jane Smith
- Search by phone returns Jane Smith
- Search is case-insensitive
- Search uses ILIKE for partial matches
- Results update in real-time (debounced)

---

#### TC-CUST-006: Get Customer Detail
**Priority:** Critical
**Category:** Customer Management
**Preconditions:**
- Customer exists with UUID `{customer-id}`

**Test Steps:**
1. Navigate to `/customers/{customer-id}`

**Expected Results:**
- Customer detail page loads
- All customer fields displayed correctly
- Related measurements shown (if any)
- Related quotes shown (if any)
- Edit and Delete buttons visible

---

#### TC-CUST-007: Update Customer
**Priority:** Critical
**Category:** Customer Management
**Preconditions:**
- Customer exists with ID `{customer-id}`

**Test Steps:**
1. Navigate to `/customers/{customer-id}/edit`
2. Change phone from `(555) 123-4567` to `(555) 987-6543`
3. Update notes: `Customer prefers stainless steel sinks`
4. Click "Save Changes" button

**Expected Results:**
- HTTP 200 response
- Customer updated in database
- `updatedAt` timestamp changed
- User redirected to customer detail page
- Updated values displayed correctly
- Success toast shown

---

#### TC-CUST-008: Delete Customer
**Priority:** High
**Category:** Customer Management
**Preconditions:**
- Customer exists with no related measurements or quotes

**Test Steps:**
1. Navigate to customer detail page
2. Click "Delete Customer" button
3. Confirm deletion in modal

**Expected Results:**
- HTTP 200 response
- Customer deleted from database (hard delete)
- User redirected to `/customers`
- Deleted customer no longer appears in list
- Success toast shown

---

#### TC-CUST-009: Delete Customer with Related Data
**Priority:** Critical
**Category:** Customer Management - Data Integrity
**Preconditions:**
- Customer exists with related measurements and quotes

**Test Steps:**
1. Navigate to customer detail page
2. Click "Delete Customer" button
3. Confirm deletion

**Expected Results:**
- HTTP 200 response
- Customer deleted (CASCADE behavior)
- Related measurements deleted automatically
- Related quotes deleted automatically
- All associated data removed from database

---

#### TC-CUST-010: Customer Not Found
**Priority:** High
**Category:** Customer Management - Error Handling
**Preconditions:** None

**Test Steps:**
1. Navigate to `/customers/non-existent-uuid`

**Expected Results:**
- HTTP 404 response
- Error page shown: "Customer not found"
- Option to return to customer list

---

#### TC-CUST-011: Create Customer Offline
**Priority:** Critical (PWA Feature)
**Category:** Customer Management - Offline
**Preconditions:**
- User authenticated
- Device offline

**Test Steps:**
1. Set device to airplane mode
2. Navigate to `/customers/new`
3. Enter customer details
4. Click "Save Customer" button

**Expected Results:**
- Customer saved to IndexedDB immediately
- Local ID generated: `local_{timestamp}_{random}`
- Customer appears in list with offline indicator
- Added to pending sync queue
- When online, customer synced to server
- Local ID replaced with server UUID
- Offline indicator removed

---

### 3. Measurement Capture Flow

#### TC-MEAS-001: Create Measurement (Full Data)
**Priority:** Critical
**Category:** Measurement Capture
**Preconditions:**
- Customer exists with ID `{customer-id}`
- User authenticated

**Test Steps:**
1. Navigate to `/customers/{customer-id}/measurements/new`
2. Enter cabinet dimensions:
   - Width: `36` inches
   - Depth: `24` inches
   - Height: `34.5` inches
3. Select countertop material: `Quartz`
4. Enter countertop thickness: `1.5` inches
5. Enter countertop overhangs:
   - Front: `1` inch
   - Sides: `0.5` inches
6. Select mounting style: `Undermount`
7. Enter faucet configuration:
   - Hole count: `1`
   - Hole spacing: `4 inch center`
8. Enter existing sink (if replacing):
   - Width: `33` inches
   - Depth: `22` inches
   - Bowl count: `2`
9. Enter clearances:
   - Backsplash height: `4` inches
   - Window clearance: `12` inches
   - Plumbing centerline from left: `18` inches
10. Check accessories:
    - Garbage disposal: ✓
    - Dishwasher air gap: ✓
11. Enter location: `Kitchen`
12. Enter notes: `Customer wants deep single bowl sink`
13. Click "Save Measurement" button

**Expected Results:**
- HTTP 201 response
- Measurement created in database with:
  - All dimensions stored as decimal strings
  - `companyId`: Demo company ID
  - `customerId`: Customer ID
  - `createdById`: Current user ID
  - `syncedAt`: Current timestamp
  - All entered values stored correctly
- User redirected to measurement detail page
- Success toast shown
- Measurement appears in customer's measurement list

---

#### TC-MEAS-002: Create Measurement with Minimal Data
**Priority:** High
**Category:** Measurement Capture
**Preconditions:**
- Customer exists

**Test Steps:**
1. Navigate to measurement creation form
2. Enter only required fields:
   - Cabinet width: `30`
   - Cabinet depth: `24`
   - Cabinet height: `34.5`
3. Leave all optional fields blank
4. Click "Save Measurement" button

**Expected Results:**
- Measurement created successfully
- Required fields stored
- Optional fields stored as null
- No validation errors

---

#### TC-MEAS-003: Measurement Validation - Exceeds Max Dimensions
**Priority:** High
**Category:** Measurement Capture - Validation
**Preconditions:**
- User on measurement form

**Test Steps:**
1. Enter cabinet width: `150` inches (exceeds max 120)
2. Attempt to save

**Expected Results:**
- Validation error shown
- Error message: "Width must be 120 inches or less"
- Measurement NOT created
- User remains on form

---

#### TC-MEAS-004: Measurement Validation - Negative Dimensions
**Priority:** High
**Category:** Measurement Capture - Validation
**Preconditions:**
- User on measurement form

**Test Steps:**
1. Enter cabinet depth: `-5` inches
2. Attempt to save

**Expected Results:**
- Validation error shown
- Error message: "Depth must be a positive number"
- Measurement NOT created

---

#### TC-MEAS-005: Measurement with Photo Upload
**Priority:** Medium
**Category:** Measurement Capture
**Preconditions:**
- User on measurement form
- Camera permission granted

**Test Steps:**
1. Click "Add Photo" button
2. Take photo or select from gallery
3. Verify photo preview shown
4. Add second photo
5. Complete measurement form
6. Click "Save Measurement" button

**Expected Results:**
- Photos stored as array of URLs in `photos` field
- Photos uploaded to storage (S3/CloudFlare/etc)
- Measurement saved with photo URLs
- Photos displayed in measurement detail view
- Photos accessible offline (cached)

---

#### TC-MEAS-006: List Measurements for Customer
**Priority:** Critical
**Category:** Measurement Capture
**Preconditions:**
- Customer has 5 measurements

**Test Steps:**
1. Navigate to customer detail page
2. View measurements section

**Expected Results:**
- All 5 measurements listed
- Ordered by `createdAt DESC` (most recent first)
- Each measurement shows:
  - Location (if specified)
  - Cabinet dimensions
  - Mounting style
  - Created date
  - Link to detail view

---

#### TC-MEAS-007: Get Measurement Detail
**Priority:** Critical
**Category:** Measurement Capture
**Preconditions:**
- Measurement exists with ID `{measurement-id}`

**Test Steps:**
1. Navigate to `/measurements/{measurement-id}`

**Expected Results:**
- Measurement detail page loads
- All measurement fields displayed
- Photos displayed (if any)
- Customer information shown
- "Match Sinks" button visible
- Edit and Delete buttons visible

---

#### TC-MEAS-008: Update Measurement
**Priority:** Critical
**Category:** Measurement Capture
**Preconditions:**
- Measurement exists

**Test Steps:**
1. Navigate to measurement edit page
2. Change cabinet width from `36` to `33` inches
3. Change mounting style from `Undermount` to `Drop-in`
4. Click "Save Changes" button

**Expected Results:**
- HTTP 200 response
- Measurement updated in database
- `updatedAt` timestamp changed
- `syncedAt` updated to current time
- User redirected to measurement detail
- Updated values displayed

---

#### TC-MEAS-009: Delete Measurement
**Priority:** High
**Category:** Measurement Capture
**Preconditions:**
- Measurement exists with no related quotes

**Test Steps:**
1. Navigate to measurement detail page
2. Click "Delete Measurement" button
3. Confirm deletion

**Expected Results:**
- HTTP 200 response
- Measurement deleted from database
- User redirected to customer detail page
- Measurement no longer appears in list

---

#### TC-MEAS-010: Delete Measurement with Related Quotes
**Priority:** Critical
**Category:** Measurement Capture - Data Integrity
**Preconditions:**
- Measurement exists
- Quote exists linked to this measurement

**Test Steps:**
1. Attempt to delete measurement

**Expected Results:**
- Measurement deleted (measurement_id set to null in quotes)
- Quote remains in database but measurement link removed
- Quote still accessible

---

#### TC-MEAS-011: Create Measurement Offline
**Priority:** Critical (PWA Feature)
**Category:** Measurement Capture - Offline
**Preconditions:**
- User authenticated
- Customer synced locally
- Device offline

**Test Steps:**
1. Set device to airplane mode
2. Navigate to measurement form for customer
3. Enter all measurement data
4. Click "Save Measurement" button

**Expected Results:**
- Measurement saved to IndexedDB
- Local ID generated: `local_{timestamp}_{random}`
- Measurement appears in customer's list with offline indicator
- Added to pending sync queue
- When online:
  - Measurement synced to server
  - Server UUID returned
  - Local ID replaced with server UUID
  - `syncedAt` updated
  - Offline indicator removed

---

### 4. Sink Matching Flow

#### TC-SINK-001: Match Sinks to Measurement (Perfect Fit)
**Priority:** Critical
**Category:** Sink Matching
**Preconditions:**
- Measurement exists with:
  - Cabinet: 36" W x 24" D
  - Mounting style: Undermount
  - Countertop material: Quartz
- Sink exists in catalog:
  - SKU: `SINK-001`
  - Dimensions: 33" W x 22" D x 9" H
  - Mounting style: Undermount
  - Material: Stainless Steel

**Test Steps:**
1. Navigate to measurement detail page
2. Click "Match Sinks" button

**Expected Results:**
- HTTP 200 response
- Matching algorithm returns results:
  - SINK-001 included with "excellent" fit rating (score ≥ 80)
  - Reasons include:
    - "Excellent width fit with optimal clearance" (3" clearance)
    - "Excellent depth fit with optimal clearance" (2" clearance)
    - "Matches preferred mounting style: undermount"
  - Sink details displayed:
    - Name, SKU, material
    - Dimensions
    - Base price + labor cost
    - Image (if available)
- Sinks ordered by score (highest first)
- Limit: 20 results by default

---

#### TC-SINK-002: Match Sinks - Good Fit (Adequate Clearance)
**Priority:** High
**Category:** Sink Matching
**Preconditions:**
- Measurement: 36" W x 24" D cabinet
- Sink: 34" W x 22" D (2" width clearance, 2" depth clearance)

**Test Steps:**
1. Match sinks to measurement

**Expected Results:**
- Sink returned with "good" fit rating (score 50-79)
- Reasons include:
  - "Good width fit with adequate clearance"
  - "Good depth fit with adequate clearance"
- Score: ~70 points

---

#### TC-SINK-003: Match Sinks - Marginal Fit (Tight Clearance)
**Priority:** High
**Category:** Sink Matching
**Preconditions:**
- Measurement: 36" W x 24" D cabinet
- Sink: 35" W x 23" D (1" width clearance, 1" depth clearance)

**Test Steps:**
1. Match sinks to measurement

**Expected Results:**
- Sink returned with "marginal" fit rating (score < 50)
- Reasons include:
  - "Tight width fit - may require careful installation"
  - "Tight depth fit - may require careful installation"
- Warning displayed to user
- Score: ~40 points

---

#### TC-SINK-004: Match Sinks - Disqualified (Too Large)
**Priority:** Critical
**Category:** Sink Matching
**Preconditions:**
- Measurement: 30" W x 24" D cabinet
- Sink: 33" W x 22" D (sink wider than cabinet)

**Test Steps:**
1. Match sinks to measurement

**Expected Results:**
- Sink NOT returned in results (score < 0)
- Filtered out because:
  - "WARNING: Sink too wide for cabinet"
  - Negative score applied (-50 points)

---

#### TC-SINK-005: Match Sinks - Mounting Style Scoring
**Priority:** High
**Category:** Sink Matching - Algorithm
**Preconditions:**
- Measurement specifies: Undermount
- Sink A: Undermount (exact match)
- Sink B: Drop-in (different)

**Test Steps:**
1. Match sinks to measurement

**Expected Results:**
- Sink A receives +25 points for exact mounting style match
- Sink B receives +5 points (different mounting style)
- Sink A ranked higher than Sink B (all else equal)

---

#### TC-SINK-006: Match Sinks - Bowl Count Preference
**Priority:** Medium
**Category:** Sink Matching - Algorithm
**Preconditions:**
- Measurement specifies: Existing sink has 2 bowls
- Sink A: 2 bowls (exact match)
- Sink B: 1 bowl (differs by 1)
- Sink C: 3 bowls (differs by 1)

**Test Steps:**
1. Match sinks to measurement

**Expected Results:**
- Sink A receives +15 points (exact bowl count match)
- Sink B receives +8 points (differs by 1)
- Sink C receives +8 points (differs by 1)
- Sink A ranked highest

---

#### TC-SINK-007: Match Sinks - No Mounting Style Preference
**Priority:** Medium
**Category:** Sink Matching
**Preconditions:**
- Measurement does NOT specify mounting style

**Test Steps:**
1. Match sinks to measurement

**Expected Results:**
- All sinks receive +15 points (partial points for no preference)
- Sinks NOT penalized for mounting style
- Ranking based on dimensional fit

---

#### TC-SINK-008: Match Sinks - Undermount Extra Clearance
**Priority:** Medium
**Category:** Sink Matching - Algorithm
**Preconditions:**
- Measurement: 36" W cabinet, undermount preferred
- Undermount sink: 34" W (2" total clearance, but undermount needs 0.5" extra per side)

**Test Steps:**
1. Match sinks to measurement

**Expected Results:**
- Score reduced by -5 points with reason:
  - "Undermount may need extra width clearance for clips"
- Still may qualify as "good" fit if other dimensions adequate

---

#### TC-SINK-009: Match Sinks - Account for Countertop Overhangs
**Priority:** High
**Category:** Sink Matching - Algorithm
**Preconditions:**
- Measurement:
  - Cabinet: 36" W x 24" D
  - Front overhang: 1" inch
  - Side overhangs: 0.5" inches each
- Sink: 33" W x 22" D

**Test Steps:**
1. Match sinks to measurement

**Expected Results:**
- Available width calculated: 36 - (2 * 0.5) = 35"
- Available depth calculated: 24 - 1 = 23"
- Width clearance: 35 - 33 = 2"
- Depth clearance: 23 - 22 = 1"
- Score and fit rating calculated based on adjusted dimensions

---

#### TC-SINK-010: List Sinks with Filters
**Priority:** High
**Category:** Sink Catalog
**Preconditions:**
- Sink catalog contains 50+ sinks

**Test Steps:**
1. Navigate to `/sinks`
2. Apply filters:
   - Material: `Stainless Steel`
   - Mounting style: `Undermount`
   - Min width: `30` inches
   - Max width: `36` inches
   - Bowl count: `2`
3. Click "Apply Filters"

**Expected Results:**
- HTTP 200 response
- Only sinks matching ALL filters returned
- Results paginated (50 per page)
- Total count shown
- Sort options available (name, price, width, date)

---

#### TC-SINK-011: Get Sink Detail
**Priority:** High
**Category:** Sink Catalog
**Preconditions:**
- Sink exists with ID `{sink-id}`

**Test Steps:**
1. Navigate to `/sinks/{sink-id}`

**Expected Results:**
- Sink detail page loads
- All sink information displayed:
  - Name, SKU, description
  - Material, mounting style
  - Dimensions (W x D x H)
  - Bowl count
  - Base price, labor cost
  - Image
  - Active status
- "Add to Quote" button visible

---

#### TC-SINK-012: Create Sink (Admin Only)
**Priority:** Medium
**Category:** Sink Catalog - Admin
**Preconditions:**
- User authenticated with role `admin`

**Test Steps:**
1. Navigate to `/admin/sinks/new`
2. Enter sink details:
   - SKU: `SINK-TEST-001`
   - Name: `Test Undermount Sink`
   - Description: `High quality stainless steel undermount`
   - Material: `Stainless Steel`
   - Mounting style: `Undermount`
   - Width: `33` inches
   - Depth: `22` inches
   - Height: `9` inches
   - Bowl count: `2`
   - Base price: `299.99`
   - Labor cost: `150.00`
   - Image URL: `https://example.com/sink.jpg`
   - Active: ✓
3. Click "Save Sink"

**Expected Results:**
- HTTP 201 response
- Sink created in database
- User redirected to sink detail page
- Sink appears in catalog
- Available for matching

---

#### TC-SINK-013: Create Sink with Duplicate SKU
**Priority:** High
**Category:** Sink Catalog - Validation
**Preconditions:**
- Sink exists with SKU `SINK-001`
- User is admin

**Test Steps:**
1. Attempt to create sink with SKU `SINK-001`

**Expected Results:**
- HTTP 409 Conflict
- Error message: "A sink with this SKU already exists"
- Sink NOT created

---

#### TC-SINK-014: Update Sink (Admin Only)
**Priority:** Medium
**Category:** Sink Catalog - Admin
**Preconditions:**
- Sink exists
- User is admin

**Test Steps:**
1. Navigate to sink edit page
2. Update base price from `299.99` to `349.99`
3. Update description
4. Click "Save Changes"

**Expected Results:**
- HTTP 200 response
- Sink updated in database
- `updatedAt` timestamp changed
- Updated values displayed

---

#### TC-SINK-015: Toggle Sink Active Status
**Priority:** Medium
**Category:** Sink Catalog - Admin
**Preconditions:**
- Sink exists with `isActive = true`
- User is admin

**Test Steps:**
1. Navigate to sink detail page
2. Click "Deactivate" button

**Expected Results:**
- `isActive` set to false
- Sink no longer appears in customer-facing catalog
- Sink no longer returned in matching results
- Still visible in admin panel
- Can be reactivated

---

#### TC-SINK-016: Non-Admin Cannot Create Sink
**Priority:** Critical
**Category:** Sink Catalog - Authorization
**Preconditions:**
- User authenticated with role `salesperson`

**Test Steps:**
1. Attempt to access `/admin/sinks/new`
2. Attempt to call API: `sink.create()`

**Expected Results:**
- Route redirects to `/dashboard`
- API returns 403 Forbidden
- Error message: "Admin access required"

---

### 5. Quote Creation & Management Flow

#### TC-QUOTE-001: Create Quote with Line Items (Happy Path)
**Priority:** Critical
**Category:** Quote Management
**Preconditions:**
- Customer exists
- Measurement exists (optional but recommended)
- Sink exists in catalog

**Test Steps:**
1. Navigate to `/quotes/new`
2. Select customer: `Jane Smith`
3. Select measurement (optional): Kitchen measurement
4. Add line items:
   - Line Item 1 (Product):
     - Type: `Product`
     - Sink: `Kraus Undermount 33" Sink`
     - SKU: `SINK-001`
     - Quantity: `1`
     - Unit price: `299.99`
     - Discount: `0%`
   - Line Item 2 (Labor):
     - Type: `Labor`
     - Name: `Sink Installation`
     - Description: `Remove old sink, install new undermount`
     - Quantity: `1`
     - Unit price: `250.00`
     - Discount: `0%`
   - Line Item 3 (Material):
     - Type: `Material`
     - Name: `Faucet`
     - Description: `Moen Arbor Pulldown Kitchen Faucet`
     - Quantity: `1`
     - Unit price: `199.99`
     - Discount: `10%`
4. Set tax rate: `8.25%`
5. Set discount: `0.00`
6. Set valid until: 30 days from today
7. Enter notes: `Customer prefers installation on Saturday`
8. Click "Create Quote"

**Expected Results:**
- HTTP 201 response
- Quote created with:
  - Auto-generated quote number (format: `Q-{timestamp}-{random}`)
  - Status: `draft`
  - All line items created with sort order
  - Line totals calculated:
    - Line 1: $299.99
    - Line 2: $250.00
    - Line 3: $179.99 (10% discount applied)
  - Subtotal: $729.98
  - Tax: $60.22 (8.25% of subtotal)
  - Total: $790.20
  - `localId`: Generated if created offline
  - `syncedAt`: Current timestamp
- User redirected to quote detail page
- Success toast shown

---

#### TC-QUOTE-002: Quote Number Generation Uniqueness
**Priority:** Critical
**Category:** Quote Management - Data Integrity
**Preconditions:**
- Multiple concurrent quote creation requests

**Test Steps:**
1. Create 10 quotes simultaneously

**Expected Results:**
- All quotes receive unique quote numbers
- No collisions
- If collision detected, retry up to 10 times
- After 10 retries, throw error

---

#### TC-QUOTE-003: Quote Total Calculations
**Priority:** Critical
**Category:** Quote Management - Business Logic
**Preconditions:**
- Quote with line items

**Test Steps:**
1. Add line items:
   - Item 1: Qty 2, Unit $100, Discount 10%
   - Item 2: Qty 1, Unit $50, Discount 0%
2. Set tax rate: 5%
3. Set quote-level discount: $10

**Expected Results:**
- Line 1 total: 2 * $100 * 0.9 = $180
- Line 2 total: 1 * $50 = $50
- Subtotal: $230
- Quote discount applied: $230 - $10 = $220
- Tax: $220 * 0.05 = $11
- Total: $220 + $11 = $231
- All values stored as decimal strings
- Displayed with 2 decimal places

---

#### TC-QUOTE-004: List Quotes with Pagination
**Priority:** High
**Category:** Quote Management
**Preconditions:**
- 75 quotes exist

**Test Steps:**
1. Navigate to `/quotes`
2. Verify first page loads (limit: 50)
3. Click "Load More"

**Expected Results:**
- First 50 quotes displayed
- Ordered by `createdAt DESC`
- Each quote shows:
  - Quote number
  - Customer name
  - Status badge
  - Total amount
  - Valid until date
  - Created date
- "Load More" button visible
- Next 25 quotes loaded
- Total count shown

---

#### TC-QUOTE-005: Filter Quotes by Status
**Priority:** High
**Category:** Quote Management
**Preconditions:**
- Quotes exist with various statuses

**Test Steps:**
1. Navigate to `/quotes`
2. Filter by status: `Accepted`

**Expected Results:**
- Only quotes with status `accepted` shown
- Other statuses filtered out
- Count reflects filtered results

---

#### TC-QUOTE-006: List Quotes for Customer
**Priority:** High
**Category:** Quote Management
**Preconditions:**
- Customer has 3 quotes

**Test Steps:**
1. Navigate to customer detail page
2. View quotes section

**Expected Results:**
- All 3 quotes for customer displayed
- Ordered by `createdAt DESC`
- Link to each quote detail page

---

#### TC-QUOTE-007: Get Quote Detail with Full Data
**Priority:** Critical
**Category:** Quote Management
**Preconditions:**
- Quote exists with line items, customer, and measurement

**Test Steps:**
1. Navigate to `/quotes/{quote-id}`

**Expected Results:**
- Quote detail page loads with:
  - Quote header:
    - Quote number
    - Status
    - Created date
    - Valid until date
  - Customer information:
    - Name, email, phone
    - Address
  - Measurement information (if linked):
    - Cabinet dimensions
    - Mounting style
    - Location
  - Line items table:
    - All line items with type, name, description, SKU, qty, price, discount, total
  - Pricing breakdown:
    - Subtotal
    - Discount
    - Tax
    - Total (bold, large font)
  - Actions:
    - Edit Quote (if draft)
    - Send Quote (if draft)
    - Download PDF
    - Delete

---

#### TC-QUOTE-008: Update Quote (Draft Only)
**Priority:** High
**Category:** Quote Management
**Preconditions:**
- Quote exists with status `draft`

**Test Steps:**
1. Navigate to quote edit page
2. Update tax rate from 8.25% to 7%
3. Update quote-level discount from $0 to $50
4. Update notes
5. Click "Save Changes"

**Expected Results:**
- HTTP 200 response
- Quote updated in database
- Totals recalculated with new tax and discount
- `updatedAt` timestamp changed
- User redirected to quote detail
- Success toast shown

---

#### TC-QUOTE-009: Cannot Edit Non-Draft Quote
**Priority:** Critical
**Category:** Quote Management - Business Rules
**Preconditions:**
- Quote exists with status `sent`

**Test Steps:**
1. Navigate to `/quotes/{quote-id}/edit`

**Expected Results:**
- Edit button disabled or hidden
- Attempting to access edit route redirects to detail page
- Error message: "Only draft quotes can be edited"

---

#### TC-QUOTE-010: Update Quote Status
**Priority:** Critical
**Category:** Quote Management
**Preconditions:**
- Quote exists with status `draft`

**Test Steps:**
1. Navigate to quote detail page
2. Click "Send Quote" button
3. Confirm action

**Expected Results:**
- HTTP 200 response
- Status changed from `draft` to `sent`
- `emailedAt` timestamp set (if email sent)
- `emailCount` incremented
- Status badge updates in UI
- Can no longer edit quote

---

#### TC-QUOTE-011: Quote Status Workflow
**Priority:** Critical
**Category:** Quote Management - State Machine
**Preconditions:**
- Quote exists

**Test Steps:**
1. Verify valid status transitions:
   - `draft` → `sent`
   - `sent` → `viewed`
   - `viewed` → `accepted`
   - `viewed` → `rejected`
   - `sent` → `expired`

**Expected Results:**
- All valid transitions succeed
- Invalid transitions blocked (e.g., `accepted` → `draft`)
- Status history tracked (if implemented)

---

#### TC-QUOTE-012: Save Customer Signature
**Priority:** Critical
**Category:** Quote Management - Acceptance
**Preconditions:**
- Quote exists with status `sent` or `viewed`

**Test Steps:**
1. Customer navigates to quote acceptance page
2. Reviews quote details
3. Draws signature on canvas
4. Clicks "Accept Quote" button

**Expected Results:**
- HTTP 200 response
- Signature saved as data URL in `signatureUrl` field
- `signedAt` timestamp set to current time
- Status changed to `accepted`
- Quote locked for editing
- Confirmation email sent to customer and salesperson
- User redirected to confirmation page

---

#### TC-QUOTE-013: Cannot Sign Draft Quote
**Priority:** High
**Category:** Quote Management - Business Rules
**Preconditions:**
- Quote exists with status `draft`

**Test Steps:**
1. Attempt to access signature page
2. Attempt to call `saveSignature` API

**Expected Results:**
- HTTP 400 Bad Request
- Error message: "Quote must be sent before it can be signed"
- Signature not saved

---

#### TC-QUOTE-014: Cannot Sign Already Accepted Quote
**Priority:** Medium
**Category:** Quote Management - Business Rules
**Preconditions:**
- Quote exists with status `accepted`

**Test Steps:**
1. Attempt to access signature page

**Expected Results:**
- Page shows: "This quote has already been accepted"
- Signature canvas NOT shown
- Original signature displayed (read-only)

---

#### TC-QUOTE-015: Delete Quote
**Priority:** High
**Category:** Quote Management
**Preconditions:**
- Quote exists

**Test Steps:**
1. Navigate to quote detail page
2. Click "Delete Quote" button
3. Confirm deletion

**Expected Results:**
- HTTP 200 response
- Quote deleted from database
- All line items cascade deleted
- User redirected to `/quotes`
- Success toast shown

---

#### TC-QUOTE-016: Create Quote Offline
**Priority:** Critical (PWA Feature)
**Category:** Quote Management - Offline
**Preconditions:**
- Customer and measurement synced locally
- Device offline

**Test Steps:**
1. Set device to airplane mode
2. Create quote with line items
3. Click "Create Quote"

**Expected Results:**
- Quote saved to IndexedDB
- Local ID generated: `local_{timestamp}_{random}`
- Quote appears in list with offline indicator
- Added to pending sync queue
- When online:
  - Quote synced to server
  - Server-generated quote number returned
  - Local ID replaced with server ID
  - Offline indicator removed

---

### 6. Quote Line Items

#### TC-LINE-001: Add Line Item to Quote
**Priority:** Critical
**Category:** Quote Line Items
**Preconditions:**
- Quote exists in draft status

**Test Steps:**
1. Navigate to quote edit page
2. Click "Add Line Item"
3. Select type: `Product`
4. Select sink from catalog
5. Enter quantity: `1`
6. Unit price auto-populated from sink base price
7. Enter discount: `5%`
8. Click "Add"

**Expected Results:**
- Line item added to quote
- `sortOrder` set based on current line count
- Line total calculated: qty * unitPrice * (1 - discount)
- Quote subtotal recalculated
- Tax and total recalculated

---

#### TC-LINE-002: Update Line Item
**Priority:** High
**Category:** Quote Line Items
**Preconditions:**
- Quote exists with line item

**Test Steps:**
1. Edit line item
2. Change quantity from `1` to `2`
3. Change discount from `5%` to `10%`
4. Save changes

**Expected Results:**
- Line total recalculated
- Quote totals recalculated
- Changes persisted to database

---

#### TC-LINE-003: Delete Line Item
**Priority:** High
**Category:** Quote Line Items
**Preconditions:**
- Quote exists with multiple line items

**Test Steps:**
1. Delete middle line item
2. Verify remaining line items

**Expected Results:**
- Line item deleted from database
- `sortOrder` of remaining items adjusted
- Quote totals recalculated
- Line item removed from UI

---

#### TC-LINE-004: Reorder Line Items
**Priority:** Low
**Category:** Quote Line Items
**Preconditions:**
- Quote exists with 3+ line items

**Test Steps:**
1. Drag line item from position 3 to position 1

**Expected Results:**
- `sortOrder` values updated for all affected items
- New order persisted to database
- Order reflected in quote detail and PDF

---

---

## Edge Cases & Error Scenarios

### Authentication Edge Cases

#### EC-AUTH-001: Concurrent Login Sessions
**Scenario:** User logs in on two devices simultaneously
**Expected:** Both sessions valid, tokens independent

#### EC-AUTH-002: Token Expiry During Request
**Scenario:** Access token expires mid-request
**Expected:** Request fails with 401, client refreshes token, retries request

#### EC-AUTH-003: Refresh Token Rotation
**Scenario:** User refreshes token multiple times
**Expected:** Old refresh tokens invalidated, only latest valid

#### EC-AUTH-004: Password Change Invalidates Tokens
**Scenario:** User changes password on device A, still logged in on device B
**Expected:** Device B tokens remain valid (no forced logout) OR implement token revocation

---

### Customer Management Edge Cases

#### EC-CUST-001: Unicode Characters in Names
**Scenario:** Customer name contains accents, emojis, or special characters
**Expected:** Characters stored and displayed correctly (UTF-8)

#### EC-CUST-002: Extremely Long Notes Field
**Scenario:** Notes field contains 10,000+ characters
**Expected:** Validation limits notes to 2000 chars, error message shown

#### EC-CUST-003: Customer Search with Special Characters
**Scenario:** Search for `O'Brien` or `José`
**Expected:** Search handles apostrophes and accents correctly (ILIKE in PostgreSQL)

#### EC-CUST-004: Rapid Customer Creation
**Scenario:** User clicks "Create" button multiple times rapidly
**Expected:** Button disabled after first click, only one customer created

---

### Measurement Edge Cases

#### EC-MEAS-001: Decimal Precision Handling
**Scenario:** User enters dimension: `36.4567` inches
**Expected:** Stored as decimal with 2 decimal places: `36.46` (rounded)

#### EC-MEAS-002: Non-Numeric Input in Number Field
**Scenario:** User enters `abc` in cabinet width field
**Expected:** Validation error shown, cannot save

#### EC-MEAS-003: Measurement with No Matching Sinks
**Scenario:** Cabinet dimensions too small for any sink in catalog
**Expected:** Match results return empty array with message: "No sinks found that fit these dimensions"

#### EC-MEAS-004: Photo Upload Failure (Offline)
**Scenario:** User adds photo while offline
**Expected:** Photo saved to IndexedDB as data URL, uploaded when online

#### EC-MEAS-005: Photo Upload Exceeds Size Limit
**Scenario:** User uploads 10MB photo
**Expected:** Error message: "Photo must be under 5MB", photo rejected

---

### Sink Matching Edge Cases

#### EC-SINK-001: Measurement with Zero Dimensions
**Scenario:** Cabinet width: `0` inches
**Expected:** Validation prevents zero dimensions during measurement creation

#### EC-SINK-002: Sink Exactly Cabinet Size (Zero Clearance)
**Scenario:** 36" cabinet, 36" sink
**Expected:** Sink disqualified, score negative, reason: "Sink too wide for cabinet"

#### EC-SINK-003: Negative Clearance from Overhangs
**Scenario:** Cabinet 36", overhangs total 4", sink 34"
**Expected:** Available space: 32", sink too wide, disqualified

#### EC-SINK-004: All Sinks Inactive in Catalog
**Scenario:** User matches measurement when all sinks set to `isActive = false`
**Expected:** Match results empty, message: "No active sinks available"

---

### Quote Management Edge Cases

#### EC-QUOTE-001: Quote with Zero Line Items
**Scenario:** User attempts to create quote without adding any line items
**Expected:** Validation error: "Quote must have at least one line item"

#### EC-QUOTE-002: Line Item Discount Greater Than 100%
**Scenario:** User enters discount: `150%`
**Expected:** Validation error: "Discount cannot exceed 100%"

#### EC-QUOTE-003: Negative Unit Price
**Scenario:** User enters unit price: `-50.00`
**Expected:** Validation error: "Price must be positive"

#### EC-QUOTE-004: Tax Rate Greater Than 100%
**Scenario:** User enters tax rate: `125%`
**Expected:** Validation error: "Tax rate must be between 0% and 100%"

#### EC-QUOTE-005: Quote Total Exceeds Decimal Precision
**Scenario:** Quote with total: `9,999,999.999`
**Expected:** Stored as `9999999.99` (2 decimal places), displayed correctly

#### EC-QUOTE-006: Expired Quote Automatic Status Change
**Scenario:** Quote with `validUntil` date in past
**Expected:** Cron job or query filters set status to `expired`, cannot be accepted

#### EC-QUOTE-007: Quote Referencing Deleted Sink
**Scenario:** Sink used in quote line item is deleted from catalog
**Expected:** Line item retains sink data (name, SKU, price) even if sink deleted

---

### Offline/Sync Edge Cases

#### EC-SYNC-001: Conflicting Updates (Same Entity)
**Scenario:** User A and User B both edit Customer X offline, then sync
**Expected:** Server timestamp wins (last write wins), earlier change overwritten

#### EC-SYNC-002: Sync Fails Partway Through
**Scenario:** 10 pending changes, sync fails after 5
**Expected:** 5 changes synced, 5 remain in queue, retry on next sync attempt

#### EC-SYNC-003: Local Entity Deleted, Remote Entity Updated
**Scenario:** User A deletes customer offline, User B updates same customer
**Expected:** When User A syncs, deletion processed, User B's update lost (or conflict resolution dialog)

#### EC-SYNC-004: Measurement References Deleted Customer
**Scenario:** Customer deleted on device A (synced), measurement for customer exists on device B (offline)
**Expected:** Sync fails for measurement (foreign key constraint), error logged, user notified

#### EC-SYNC-005: Extremely Long Offline Period (30+ Days)
**Scenario:** Device offline for 30 days, user has 100+ pending changes
**Expected:** All changes synced in batches, no data loss, may take several minutes

---

### Security Edge Cases

#### EC-SEC-001: SQL Injection in Search
**Scenario:** User searches for: `'; DROP TABLE users; --`
**Expected:** Parameterized queries prevent SQL injection, search returns no results

#### EC-SEC-002: XSS in Customer Notes
**Scenario:** User enters notes: `<script>alert('XSS')</script>`
**Expected:** Content sanitized on display, script not executed

#### EC-SEC-003: Access Other Company's Data
**Scenario:** User A (Company A) tries to access Customer ID from Company B
**Expected:** 404 Not Found (data scoped by companyId), no data leak

#### EC-SEC-004: JWT Token Tampering
**Scenario:** User modifies JWT payload to change role from `salesperson` to `admin`
**Expected:** Signature validation fails, 401 Unauthorized

---

---

## PWA-Specific Testing

### PWA-001: Service Worker Installation
**Priority:** Critical
**Test Steps:**
1. Open app in Chrome
2. Open DevTools > Application > Service Workers
3. Verify service worker registered and active

**Expected Results:**
- Service worker installed successfully
- Status: "activated and running"
- Scope: `/`

---

### PWA-002: App Install Prompt
**Priority:** High
**Test Steps:**
1. Visit app in Chrome (mobile or desktop)
2. Meet install criteria (HTTPS, manifest, service worker)
3. Trigger install prompt

**Expected Results:**
- Install prompt appears
- User can add to home screen
- App opens in standalone window (no browser chrome)

---

### PWA-003: Offline Page Load
**Priority:** Critical
**Test Steps:**
1. Load app while online
2. Set device to airplane mode
3. Refresh page

**Expected Results:**
- App loads from cache
- Static assets (HTML, CSS, JS) served from cache
- Offline indicator shown in UI
- User can navigate cached pages

---

### PWA-004: Offline Data Capture and Sync
**Priority:** Critical
**Test Steps:**
1. Go offline
2. Create customer
3. Create measurement
4. Create quote
5. Return online
6. Verify sync

**Expected Results:**
- All entities saved to IndexedDB while offline
- Offline indicators shown
- When online, pending sync queue processed
- Local IDs replaced with server UUIDs
- Data appears on server
- Sync status indicators update

---

### PWA-005: Background Sync
**Priority:** Medium
**Test Steps:**
1. Create entity offline
2. Close app
3. Device comes online (background)
4. Reopen app

**Expected Results:**
- Background Sync API triggers sync in background
- Data synced even with app closed
- Sync status updated when app reopened

---

### PWA-006: Push Notifications (Future)
**Priority:** Low
**Test Steps:**
1. Grant notification permission
2. Quote accepted by customer
3. Verify notification received

**Expected Results:**
- Push notification received
- Notification shows quote details
- Click opens app to quote detail page

---

### PWA-007: Cache Invalidation on Update
**Priority:** High
**Test Steps:**
1. App version 1.0 installed
2. Deploy version 1.1 to server
3. User opens app

**Expected Results:**
- Service worker detects new version
- User prompted to reload for update
- New assets downloaded
- Old cache cleared
- App runs on version 1.1

---

### PWA-008: IndexedDB Storage Quota
**Priority:** Medium
**Test Steps:**
1. Store large amounts of data (1000+ customers, measurements, quotes)
2. Verify storage usage

**Expected Results:**
- Data stored successfully up to browser quota (typically 50MB-100MB)
- If quota exceeded, oldest cached data evicted
- User notified if critical data at risk

---

---

## Non-Functional Requirements

### Performance Testing

#### NFR-PERF-001: API Response Time
**Requirement:** 95% of API requests complete in < 500ms
**Test:**
- Load test with 100 concurrent users
- Measure P95 response time for each endpoint
- Verify < 500ms

---

#### NFR-PERF-002: Page Load Time
**Requirement:** Time to Interactive (TTI) < 3 seconds on 3G
**Test:**
- Use Lighthouse or WebPageTest
- Simulate 3G network throttling
- Measure TTI

---

#### NFR-PERF-003: Sink Matching Performance
**Requirement:** Match algorithm completes in < 1 second for 1000 sinks
**Test:**
- Seed database with 1000 sinks
- Call matchToMeasurement endpoint
- Measure execution time

---

#### NFR-PERF-004: Quote PDF Generation
**Requirement:** PDF generation completes in < 3 seconds
**Test:**
- Create quote with 20 line items
- Generate PDF
- Measure generation time

---

### Security Testing

#### NFR-SEC-001: HTTPS Enforcement
**Requirement:** All traffic encrypted with TLS 1.2+
**Test:**
- Verify HTTPS certificate valid
- Attempt HTTP access
- Verify redirect to HTTPS

---

#### NFR-SEC-002: Password Hashing
**Requirement:** Passwords hashed with bcrypt (12 rounds)
**Test:**
- Register user
- Inspect database
- Verify password NOT stored in plain text
- Verify bcrypt hash format

---

#### NFR-SEC-003: JWT Token Expiry
**Requirement:** Access tokens expire in 15 minutes
**Test:**
- Login, get access token
- Wait 16 minutes
- Attempt API call
- Verify 401 Unauthorized

---

#### NFR-SEC-004: Rate Limiting
**Requirement:** Login endpoint limited to 5 attempts per minute per IP
**Test:**
- Attempt 6 login requests in 1 minute
- Verify 6th request returns 429 Too Many Requests

---

#### NFR-SEC-005: SQL Injection Prevention
**Requirement:** All database queries use parameterized statements
**Test:**
- Code review: verify no string concatenation in SQL
- Penetration testing: attempt SQL injection in all input fields
- Verify no queries succeed

---

#### NFR-SEC-006: XSS Prevention
**Requirement:** All user input sanitized before display
**Test:**
- Enter malicious script in all text fields
- Verify scripts NOT executed
- Verify content escaped in DOM

---

### Accessibility Testing

#### NFR-A11Y-001: Keyboard Navigation
**Requirement:** All features accessible via keyboard only
**Test:**
- Navigate entire app using Tab, Enter, Escape, Arrow keys
- Verify focus indicators visible
- Verify all actions completable

---

#### NFR-A11Y-002: Screen Reader Compatibility
**Requirement:** App usable with NVDA, JAWS, VoiceOver
**Test:**
- Navigate app with screen reader
- Verify all content announced
- Verify form labels read correctly
- Verify error messages announced

---

#### NFR-A11Y-003: Color Contrast
**Requirement:** WCAG 2.1 AA contrast ratio (4.5:1 for text)
**Test:**
- Use axe DevTools or Lighthouse
- Verify all text meets contrast requirements
- Test with color blindness simulators

---

### Usability Testing

#### NFR-UX-001: Offline Indicator Visibility
**Requirement:** Users must be aware of offline status within 2 seconds
**Test:**
- Go offline
- Verify offline indicator appears < 2 seconds
- Verify color, icon, and text clear

---

#### NFR-UX-002: Form Validation Feedback
**Requirement:** Validation errors shown inline within 500ms
**Test:**
- Enter invalid data in form
- Verify error appears immediately
- Verify error message actionable

---

#### NFR-UX-003: Mobile Responsiveness
**Requirement:** App usable on screens 320px - 1920px wide
**Test:**
- Test on iPhone SE (375px), iPad (768px), Desktop (1920px)
- Verify no horizontal scrolling
- Verify touch targets ≥ 44px
- Verify readable font sizes

---

---

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Setup database
docker compose up -d  # PostgreSQL + Redis
pnpm db:migrate       # Apply migrations
pnpm db:seed          # Seed demo data

# Environment variables
cp .env.example .env
# Configure DATABASE_URL, JWT_SECRET, etc.
```

---

### Running Tests

```bash
# Unit tests (packages/api)
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test -- --coverage

# Integration tests
pnpm test packages/api/src/routers

# E2E tests (Playwright)
pnpm test:e2e

# E2E in UI mode
pnpm test:e2e --ui

# Specific browser
pnpm test:e2e --project=chromium
```

---

### Test Database

- Use separate test database: `ihms_test`
- Reset database before each test suite
- Use transactions for test isolation
- Clean up test data after each test

---

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:e2e
```

---

### Test Data Factories

```typescript
// Use factories for consistent test data
import { createUserFactory, createCustomerFactory, createMeasurementFactory } from './factories';

const user = createUserFactory({ role: 'salesperson' });
const customer = createCustomerFactory({ assignedUserId: user.id });
const measurement = createMeasurementFactory({ customerId: customer.id });
```

---

## Test Execution Priority

### Phase 1: Critical Path (Must Pass for MVP)
1. TC-AUTH-001, TC-AUTH-005, TC-AUTH-010 (Login, Logout, Refresh)
2. TC-CUST-001, TC-CUST-006 (Create, View Customer)
3. TC-MEAS-001, TC-MEAS-007 (Create, View Measurement)
4. TC-SINK-001 (Sink Matching)
5. TC-QUOTE-001, TC-QUOTE-007 (Create, View Quote)

### Phase 2: Core Features
6. All other TC-AUTH tests (Authentication edge cases)
7. All TC-CUST tests (Customer CRUD)
8. All TC-MEAS tests (Measurement CRUD)
9. All TC-SINK tests (Sink matching variations)
10. All TC-QUOTE tests (Quote lifecycle)

### Phase 3: Offline & Advanced
11. All offline test cases (TC-*-011 series)
12. PWA-specific tests
13. Edge cases (EC-*)
14. Non-functional requirements

---

## Sign-Off Criteria

Before production deployment, the following must be verified:

- [ ] 100% of Phase 1 tests passing
- [ ] 95%+ of Phase 2 tests passing
- [ ] 80%+ of Phase 3 tests passing
- [ ] Unit test coverage ≥ 85%
- [ ] Integration test coverage ≥ 70%
- [ ] All critical security tests passing
- [ ] Performance benchmarks met
- [ ] Accessibility audit passing (WCAG 2.1 AA)
- [ ] Cross-browser testing complete (Chrome, Safari, Edge)
- [ ] Mobile testing complete (iOS Safari, Android Chrome)
- [ ] Offline functionality verified on real devices

---

## Defect Severity Levels

**Critical (P0):**
- App crashes
- Data loss
- Security vulnerabilities
- Cannot login
- Cannot create quotes

**High (P1):**
- Feature completely broken
- Incorrect data calculations
- Cannot sync offline data
- Major UI issues

**Medium (P2):**
- Feature partially broken
- Workaround available
- Minor UI issues
- Performance degradation

**Low (P3):**
- Cosmetic issues
- Enhancement requests
- Documentation errors

---

**End of Test Plan**
