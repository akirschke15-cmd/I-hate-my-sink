# I Hate My Sink (IHMS) - Developer Guide

## Project Overview

IHMS is a Progressive Web App (PWA) for field sales teams to capture sink measurements, match sinks from a product catalog, and generate customer quotes. The app works offline, syncing data when connectivity returns.

## Development Commands

```bash
# Start all services (PostgreSQL, Redis) and dev servers
docker compose up -d && pnpm dev

# Install dependencies
pnpm install

# Run individual services
pnpm --filter @ihms/web dev    # Frontend only (port 3010)
pnpm --filter @ihms/server dev # Backend only (port 3011)

# Database operations
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Apply migrations
pnpm db:push      # Push schema directly (dev only)
pnpm db:studio    # Open Drizzle Studio GUI

# Quality checks
pnpm lint         # ESLint
pnpm typecheck    # TypeScript
pnpm test         # Vitest
pnpm format       # Prettier

# Build for production
pnpm build
```

## Important Development Notes

### TypeScript Project References
This monorepo uses TypeScript project references. The `packages/db` package emits declaration files (`.d.ts`) to `dist/` that other packages depend on.

**After modifying any schema file in `packages/db/src/schema/`:**
```bash
# IMPORTANT: Must use --build flag (plain tsc does NOT work)
cd packages/db && npx tsc --build
rm -rf .turbo && pnpm typecheck
```

**Note:** The db package has NO build script. `pnpm --filter @ihms/db build` will fail. Use `npx tsc --build` directly.

### Schema Change Checklist
When adding/modifying database columns:
1. Update `packages/db/src/schema/*.ts` (database schema)
2. Check `packages/shared/src/schemas/*.ts` (shared Zod schemas)
3. **Search for LOCAL Zod schemas** in router files (e.g., `measurement.ts` has local `updateMeasurementSchema`)
4. Rebuild db: `cd packages/db && npx tsc --build`
5. Clear cache: `rm -rf .turbo && pnpm typecheck`

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Property X does not exist on type" after adding column | Stale `.d.ts` files | `cd packages/db && npx tsc --build` |
| Type errors persist after fix | Turbo cache | `rm -rf .turbo` |
| dist folder not created after `npx tsc` | Wrong command | Use `npx tsc --build` (not plain `tsc`) |
| "X is assigned but never used" for destructuring | ESLint rule | Add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` |
| Unescaped entities in JSX | ESLint react rule | Use `&quot;` for `"` and `&apos;` for `'` |
| `pnpm --filter @ihms/db build` fails | No build script | Use `npx tsc --build` directly |

### Lessons Learned
For detailed documentation of development lessons learned, see `@IHMS_files/LESSONS-LEARNED.md`.

---

## Development Playbook

### Pre-Flight Checklist (Before Making Changes)
Before touching code, answer these questions:

- [ ] **Understand first**: Have I read the existing code/pattern? (Read before write)
- [ ] **Scope**: What packages/files will this change touch?
- [ ] **Dependencies**: Are there schema dependencies (db → Zod → router)?
- [ ] **Rebuild needed?**: Will this require declaration rebuilds (`npx tsc --build`)?
- [ ] **Verification**: What tests/checks should I run after?

### Post-Implementation Verification
Run this sequence after any significant change:

```bash
# The "trust but verify" sequence
cd packages/db && npx tsc --build   # If schema changed
rm -rf .turbo                        # Always clear cache
pnpm typecheck                       # Catch type issues
pnpm lint                            # Catch style issues
pnpm build                           # Catch build issues
```

**Rule**: Never skip verification to "save time" - catching issues early is always faster than debugging them later.

### Common Development Patterns

| When you need to... | Follow this pattern |
|---------------------|---------------------|
| **Add a database column** | Schema → Zod (shared + local) → Rebuild db → Clear cache → Typecheck |
| **Add a new API endpoint** | Router procedure → Add to router index → Verify RBAC → Add frontend call |
| **Add offline support** | IndexedDB store → Sync queue entry → Conflict handling → UI indicator |
| **Add role-based feature** | Backend RBAC guard → Frontend conditional render → Test both roles |
| **Fix a type error** | Clear cache → Rebuild db → Check Zod schemas → Re-typecheck |
| **Add a new page/route** | Page component → Route in App.tsx → Navigation link → Protected if needed |

### Quality Philosophy
> **Speed through quality, not despite it.**
>
> Fast at the expense of rework and bugs is not worth it. Every lesson learned makes the next feature faster to ship correctly. Invest in understanding - it compounds.

---

## Project Documentation
Reference these files for project context:
- @IHMS_files/00-README.md
- @IHMS_files/01-BUSINESS-MODEL.md
- @IHMS_files/02-COMPETITIVE-ANALYSIS.md
- @IHMS_files/03-DEVELOPMENT-ROADMAP.md
- @IHMS_files/05-PRD.md
- @IHMS_files/06-TECHNICAL-ARCHITECTURE.md
- @IHMS_files/HYBRID_AGENT_STRATEGY.md
- @IHMS_files/project-preferences.md
- @IHMS_files/REQUIREMENT-CONFORMANCE-FRAMEWORK.md
- @IHMS_files/SINK_CONFIGURATOR_IMPLEMENTATION_PLAN.md
- @IHMS_files/LESSONS-LEARNED.md

## Architecture

### Monorepo Structure

```
IHMS/
├── apps/web/         # React 18 + Vite PWA
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations
│   ├── api/          # tRPC routers
│   └── shared/       # Zod schemas + TypeScript types
├── server/           # Express + tRPC backend
└── docker/           # PostgreSQL init scripts
```

### Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, tRPC React Query
- **Backend**: Express, tRPC, Node.js 20
- **Database**: PostgreSQL 16, Drizzle ORM
- **Auth**: JWT (access + refresh tokens)
- **Offline**: PWA with IndexedDB (idb library)
- **Tooling**: PNPM workspaces, Turborepo

## Domain Terminology

### Measurements

- **Cabinet dimensions**: Width, depth, height of the base cabinet (in inches)
- **Countertop thickness**: Standard thicknesses are 1.25", 1.5", 2"
- **Existing cutout**: Dimensions of any existing sink cutout when replacing

### Sink Types

- **Undermount**: Mounted below countertop, seamless look
- **Drop-in (Top-mount)**: Rim sits on countertop surface
- **Farmhouse (Apron-front)**: Front panel exposed, extends past cabinet
- **Flush mount**: Sits level with countertop surface

### Sink Materials

- **Stainless steel**: Most common, 16-18 gauge typical
- **Granite composite**: Quartz + resin, heat/scratch resistant
- **Cast iron**: Enamel-coated, heavy, durable
- **Fireclay**: Ceramic, glossy finish, farmhouse style
- **Copper**: Antimicrobial, develops patina
- **Porcelain**: Classic look, can chip

### Countertop Materials

- **Granite**: Natural stone, each piece unique
- **Quartz**: Engineered stone, consistent pattern
- **Marble**: Soft natural stone, requires sealing
- **Laminate**: Budget-friendly, wide variety
- **Solid surface**: Acrylic-based, seamless joins
- **Butcher block**: Wood, requires maintenance
- **Concrete**: Custom, can be stained
- **Tile**: Individual pieces, grout lines
- **Stainless steel**: Commercial kitchens

### Quote Line Items

- **Product**: The sink itself
- **Labor**: Installation charges (removal, installation, plumbing)
- **Material**: Additional materials (faucet, disposal, mounting hardware)
- **Other**: Miscellaneous charges

## Offline Behavior

The app uses a **local-first** approach:

1. **Data capture**: Measurements and quotes are saved to IndexedDB immediately
2. **Pending sync queue**: Changes are queued for sync with `localId` identifiers
3. **Auto-sync**: When online, pending changes sync automatically
4. **Conflict resolution**: Server timestamp wins; local changes prompt user review

### Sync Flow

```
User Action → IndexedDB → Pending Sync Queue → Online? → API → Update IndexedDB
```

### PWA Features

- **Service Worker**: Caches static assets and API responses
- **Install prompt**: Users can add to home screen
- **Background sync**: Queued operations complete when online
- **Offline indicator**: UI shows connectivity status

## Authentication

- **Access token**: Short-lived (15min), stored in localStorage
- **Refresh token**: Long-lived (7 days), stored in localStorage
- **Token refresh**: Automatic when access token expires
- **Offline auth**: Cached credentials allow offline access

### User Roles

- **admin**: Full access to company settings, user management
- **salesperson**: Can create measurements, quotes, manage own customers

## Database Schema

Key tables and relationships:

```
companies (multi-tenant root)
  └── users (salespeople, admins)
  └── customers (leads and clients)
  └── sinks (product catalog)
  └── measurements (cabinet/countertop data)
  └── quotes
        └── quote_line_items (products, labor, materials)
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://ihms:ihms@localhost:5433/ihms
REDIS_URL=redis://localhost:6380
JWT_SECRET=<generate-secure-key>
JWT_REFRESH_SECRET=<generate-secure-key>
PORT=3011
```

## Demo Company

For development, a demo company is seeded:

- **ID**: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- **Name**: Demo Company
- **Slug**: demo

Register new users with this company ID to test the app.

---

# Agent Documentation

The following sections contain the complete agent documentation from `.claude/agents/`. These agents provide specialized assistance across different phases of the Software Development Lifecycle (SDLC) and programming domains.

---

## Agents Directory Overview

This directory contains specialized agents that provide expert assistance across different phases of the Software Development Lifecycle (SDLC) and programming domains.

### Architecture

This boilerplate uses a **hybrid architecture** combining three types of specialists:

- **Product Management**: product-manager
- **Language Specialists**: python-expert, typescript-expert, terraform-expert
- **Role Specialists**: frontend-engineer, backend-engineer, fullstack-engineer, system-architect, api-designer, ui-designer, qa-engineer, test-architect, code-reviewer, security-auditor, devops-engineer, technical-writer, debugger, performance-optimizer

### Development Workflow

```
Raw Requirements
    ↓
[Product Manager] ← Creates user stories, acceptance criteria, PRDs
    ↓
[System Architect] ← Designs architecture, makes technical decisions
    ↓
┌─────────────────────────────────────┐
│  Design Phase (Parallel Activities) │
├─────────────────────────────────────┤
│ [API Designer]  ← API contracts     │
│ [UI Designer]   ← UI/UX specs       │
└─────────────────────────────────────┘
    ↓
[Implementation Teams] ← Frontend/Backend/Fullstack Engineers + Language Specialists
    ↓
[QA Engineer] ← Tests functionality, validates acceptance criteria
    ↓
[Code Reviewer] ← Reviews code quality, security, best practices
    ↓
Production Ready ✓
```

---

## Agent: Product Manager

**File**: `.claude/agents/00-product/product-manager.md`

**Description**: Requirements analysis, user stories, PRDs, product strategy

### Role Definition

Expert Product Manager specializing in translating business requirements into implementation-ready product specifications. Primary responsibility is to refine raw requirements into comprehensive user stories, acceptance criteria, and product requirements documents (PRDs).

### Core Responsibilities

1. **Requirements Analysis & Refinement**: Intake processing, clarification, context gathering, scope definition, risk assessment
2. **User Story Creation**: Using "As a / I want / So that" format with priority, effort estimates, dependencies
3. **Acceptance Criteria Development**: Given-When-Then format covering happy path, edge cases, error scenarios
4. **PRD Creation**: Executive summary, problem statement, solution overview, success metrics, dependencies
5. **Backlog Management**: Prioritization (RICE, MoSCoW), epic breakdown, story sequencing
6. **Stakeholder Communication**: Requirements validation, trade-off analysis, progress communication

### User Story Template

```markdown
## US-001: [Feature Name]

**As a** [type of user]
**I want** [goal/desire]
**So that** [benefit/value]

### Priority: [Critical/High/Medium/Low]
### Effort Estimate: [XS/S/M/L/XL]

### Acceptance Criteria
**AC1**: Given [context] When [action] Then [outcome]
```

### Quality Checklist

- All user stories follow INVEST criteria
- Every story has acceptance criteria covering happy path, edge cases, and errors
- Success metrics are specific, measurable, and time-bound
- Dependencies documented and feasible
- Non-functional requirements specified

---

## Agent: Python Expert

**File**: `.claude/agents/01-language-specialists/python-expert.md`

**Description**: Python expertise, FastAPI, Django, async patterns, type hints

### Role

Python development expert specializing in modern Python best practices, type safety, testing, and performance optimization.

### Critical Implementation Rules

✅ **ALWAYS**: Connect to real databases, implement complete error handling, write functional code, test against real services

❌ **NEVER**: Return mock/hardcoded data in production, leave TODO comments for core functionality, create endpoints that don't persist data

### Core Responsibilities

- **Code Quality**: PEP 8, type hints, dataclasses/Pydantic, SOLID principles
- **Testing**: pytest, fixtures, parameterized tests, property-based testing
- **Modern Python**: Python 3.10+ features, async/await, context managers
- **Frameworks**: FastAPI, Django, Flask

### Tooling

- **Linting**: ruff or pylint
- **Formatting**: black or ruff format
- **Type Checking**: mypy or pyright
- **Testing**: pytest with pytest-cov

---

## Agent: Terraform Expert

**File**: `.claude/agents/01-language-specialists/terraform-expert.md`

**Description**: Terraform IaC, cloud infrastructure, state management, modules

### Role

Infrastructure as Code (IaC) expert specializing in Terraform for multi-cloud infrastructure provisioning.

### Critical Implementation Rules

✅ **ALWAYS**: Create real, functional infrastructure, implement complete resource definitions, test with `terraform plan` and `terraform apply`

❌ **NEVER**: Create incomplete resource definitions with TODO comments, use placeholder values, skip security configurations

### Core Responsibilities

- **Infrastructure Design**: Modular configurations, DRY principle, environment isolation
- **State Management**: Remote backends, state locking, encryption
- **Security**: Secrets management, least-privilege IAM, encryption at rest/transit
- **Testing**: terraform validate, tflint, Checkov, Terratest

### Cloud Provider Expertise

- **AWS**: EC2, ECS, EKS, Lambda, S3, RDS, VPC, IAM
- **Azure**: VMs, AKS, Storage Accounts, VNet, Key Vault
- **GCP**: Compute Engine, GKE, Cloud SQL, VPC, Secret Manager

---

## Agent: TypeScript Expert

**File**: `.claude/agents/01-language-specialists/typescript-expert.md`

**Description**: TypeScript expertise, type systems, advanced patterns, tooling

### Role

TypeScript development expert specializing in type-safe application development and modern JavaScript/TypeScript patterns.

### Critical Implementation Rules

✅ **ALWAYS**: Connect UI components to real APIs, implement real event handlers, write type-safe code

❌ **NEVER**: Create wireframe/mockup components, use hardcoded data instead of API calls, leave TODO comments for core functionality

### Core Responsibilities

- **Type Safety**: Strict TypeScript, advanced types, type guards, branded types
- **Code Quality**: SOLID principles, design patterns, pure functions
- **Testing**: Jest/Vitest, Testing Library, TDD
- **Frameworks**: React, Next.js, Vue, Angular, Node.js

### Design Patterns

- Repository pattern, Factory pattern, Observer pattern
- Custom hooks, Compound components, Context + useReducer
- tRPC for end-to-end type safety

---

## Agent: Backend Engineer

**File**: `.claude/agents/02-role-specialists/backend-engineer.md`

**Description**: API design, databases, microservices, performance optimization

### Role

Backend engineering expert specializing in scalable, secure, and maintainable server-side applications and APIs.

### Core Responsibilities

- **API Development**: REST, GraphQL, tRPC, versioning, pagination
- **Database Architecture**: PostgreSQL, MongoDB, Redis, query optimization, N+1 prevention
- **Authentication**: JWT, OAuth 2.0, sessions, MFA, RBAC
- **Security**: OWASP Top 10, input validation, encryption
- **Scalability**: Caching, background jobs, microservices, resilience patterns

### Framework Expertise

- **Python**: FastAPI, Django, Flask
- **TypeScript**: Express, NestJS, tRPC, Hono

### Database Patterns

- N+1 query prevention with eager loading
- Transaction patterns for multi-step operations
- Connection pooling configuration

---

## Agent: Frontend Engineer

**File**: `.claude/agents/02-role-specialists/frontend-engineer.md`

**Description**: UI/UX patterns, React, accessibility, responsive design

### Role

Frontend engineering expert specializing in modern, performant, and accessible user interfaces.

### Core Responsibilities

- **UI Development**: Responsive, accessible, performant interfaces
- **Frameworks**: React 18+, Next.js 14+, Vue 3, Angular
- **State Management**: Zustand, Redux Toolkit, TanStack Query
- **Styling**: Tailwind CSS, CSS-in-JS, CSS Modules
- **Performance**: Core Web Vitals (LCP, FID, CLS), code splitting, memoization
- **Accessibility**: WCAG compliance, keyboard navigation, screen readers

### React Patterns

- Custom hooks for reusable logic
- Compound components for flexible APIs
- Server Components (Next.js App Router)
- TanStack Query with optimistic updates

---

## Agent: Fullstack Engineer

**File**: `.claude/agents/02-role-specialists/fullstack-engineer.md`

**Description**: Full-stack development, end-to-end feature implementation

### Role

Fullstack engineering expert with deep expertise in both frontend and backend development.

### Core Responsibilities

- **End-to-End Development**: Build complete features from UI to database
- **Type Safety Across Stack**: Shared types, tRPC, Zod validation
- **Authentication Patterns**: JWT with refresh tokens, session management
- **Real-Time Communication**: WebSockets, Server-Sent Events

### Implementation Workflow (MANDATORY)

**Phase 1**: Pre-Implementation Planning - Read PRD, create TodoWrite checklist, identify vertical slices

**Phase 2**: Implementation - Follow vertical integration (database → API → frontend → tests)

**Phase 3**: Pre-Completion Verification - Requirements conformance, integration completeness, functional validation

### Anti-Patterns to NEVER Do

❌ UI Shell Implementation (non-functional toggles/buttons)
❌ Mock Data Substitution (hardcoded data instead of API calls)
❌ Implicit De-Scoping (skipping requirements without approval)

---

## Agent: API Designer

**File**: `.claude/agents/03-architecture/api-designer.md`

**Description**: REST/GraphQL API design, OpenAPI specs, API versioning

### Role

API design expert specializing in well-structured, developer-friendly, and scalable APIs.

### Core Responsibilities

- **RESTful Design**: Resource naming, HTTP methods, status codes, error responses
- **GraphQL Design**: Schema design, queries, mutations, connections
- **gRPC Design**: Service definitions, streaming, protocol buffers
- **Versioning**: URL, header, or query parameter strategies
- **Pagination**: Offset-based, cursor-based, page-based
- **Security**: Authentication, rate limiting, input validation

### Response Formats

```json
{
  "data": { "id": "123", "type": "user", "attributes": {...} },
  "meta": { "timestamp": "2025-01-15T10:00:00Z" }
}
```

---

## Agent: System Architect

**File**: `.claude/agents/03-architecture/system-architect.md`

**Description**: System design, architecture patterns, scalability, technical decisions

### Role

Software architecture expert specializing in scalable, maintainable, and robust system architectures.

### Core Responsibilities

- **Architecture Design**: System boundaries, component interactions, ADRs
- **Quality Attributes**: Scalability, reliability, performance, security, maintainability
- **Pattern Selection**: Monolith, microservices, serverless, event-driven
- **Technology Selection**: Backend, frontend, infrastructure considerations

### Design Principles

- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY, KISS, YAGNI**: Don't repeat yourself, keep it simple, you aren't gonna need it

### System Design Patterns

- Database per Service, CQRS, Event Sourcing, Saga Pattern
- API Gateway, Backend for Frontend, Service Mesh, Circuit Breaker

---

## Agent: UI Designer

**File**: `.claude/agents/03-architecture/ui-designer.md`

**Description**: UI/UX design, wireframes, design systems, accessibility

### Role

UI/UX design expert specializing in intuitive, accessible, and visually compelling user interfaces.

### Core Responsibilities

- **Design System Architecture**: Design tokens, component libraries, atomic design
- **Visual Design**: Visual hierarchy, color theory, typography, iconography
- **Responsive Design**: Mobile-first, breakpoint strategies, flexible layouts
- **Accessibility (WCAG 2.1 Level AA)**: Color contrast, keyboard navigation, screen readers

### Design Tokens

```css
/* Colors, Typography, Spacing, Shadows */
--color-primary-500: /* Base brand color */
--text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem)
--space-4: 1rem /* 16px */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
```

### Component Specifications

- **Buttons**: Variants (Primary, Secondary, Danger), Sizes (sm, md, lg), States (default, hover, focus, disabled, loading)
- **Forms**: Labels, validation, error messages, accessibility
- **Navigation**: Primary, secondary, mobile patterns

---

## Agent: Code Reviewer

**File**: `.claude/agents/04-quality/code-reviewer.md`

**Description**: Code quality review, best practices enforcement, technical debt identification

### PRIMARY DIRECTIVE

Verify that code actually implements the PRD acceptance criteria, THEN review code quality.

### Two-Phase Review Process

**Phase 1: Requirement Conformance (FIRST)**
- Does this code implement what was specified in the PRD?
- Are all acceptance criteria met?
- Is this a complete implementation or a wireframe/mockup?

**Phase 2: Code Quality (SECOND)**
- Only after Phase 1 passes, review code quality, design patterns, performance, security

### Conformance Red Flags 🚩

- Non-functional UI components (empty onClick handlers)
- Hardcoded mock data instead of real integration
- API endpoints that don't persist data
- TODO comments for core functionality

### Review Categories

1. **Correctness**: Logic errors, edge cases, error handling
2. **Design & Architecture**: SOLID principles, design patterns
3. **Performance**: Algorithm efficiency, N+1 queries
4. **Security**: Input validation, authentication, XSS/CSRF
5. **Maintainability**: Code duplication, complexity
6. **Testing**: Coverage, quality, isolation

---

## Agent: QA Engineer

**File**: `.claude/agents/04-quality/qa-engineer.md`

**Description**: Quality assurance, manual and automated testing, bug reporting

### PRIMARY DIRECTIVE

Verify that implementations meet the **ORIGINAL PRD acceptance criteria**, not just "does the code run without errors."

### Requirement Conformance Testing Workflow

**Phase 1**: Obtain the PRD, extract acceptance criteria, identify non-functional requirements

**Phase 2**: Create test cases from acceptance criteria (at minimum one test per AC)

**Phase 3**: Test against REAL implementations (not mocked)

**Phase 4**: Verify conformance before marking complete

### Testing Frameworks

- **Python**: pytest, pytest-cov, pytest-asyncio, hypothesis, Factory Boy
- **TypeScript**: Vitest, Jest, Testing Library, Playwright, MSW

### Anti-Patterns to Avoid

❌ Vanity Testing (tests that don't validate requirements)
❌ Happy Path Only (ignoring edge cases)
❌ Mock Everything (not testing real integration)
❌ Green Lights Everywhere (approving partial implementations)

---

## Agent: Security Auditor

**File**: `.claude/agents/04-quality/security-auditor.md`

**Description**: Security vulnerability assessment, compliance auditing, threat modeling

### Role

Security expert specializing in identifying vulnerabilities and ensuring compliance with security standards.

### OWASP Top 10 Coverage

1. **Broken Access Control**: Authorization checks, IDOR prevention
2. **Cryptographic Failures**: Encryption at rest/transit, key management
3. **Injection**: SQL/NoSQL/Command injection prevention
4. **Insecure Design**: Threat modeling, security controls
5. **Security Misconfiguration**: Default credentials, security headers
6. **Vulnerable Components**: Dependency scanning, updates
7. **Authentication Failures**: Strong passwords, MFA, session management
8. **Data Integrity Failures**: Verified updates, secure CI/CD
9. **Logging Failures**: Audit logging, monitoring, alerting
10. **SSRF**: URL validation, allowlists

### Security Testing Tools

- **SAST**: Bandit, ESLint security plugins, tfsec
- **DAST**: OWASP ZAP, Burp Suite
- **Dependency Scanning**: pip-audit, npm audit, Snyk

---

## Agent: Test Architect

**File**: `.claude/agents/04-quality/test-architect.md`

**Description**: Test strategy design, test architecture, testing approach optimization

### Role

Testing expert specializing in test strategy, test automation, and quality assurance best practices.

### Testing Pyramid

- **Unit Tests (70%)**: Fast, isolated, mock external dependencies
- **Integration Tests (20%)**: Test component interaction, real databases
- **E2E Tests (10%)**: Complete user workflows, production-like environment

### Integration Testing Safety Rails

**Golden Rules**:
1. Test against REAL services (Testcontainers, docker-compose)
2. Mock ONLY external third-party APIs (Stripe, SendGrid)
3. If integration is complex, STOP and communicate
4. Test isolation ≠ Fake services

### Anti-Patterns (FORBIDDEN)

❌ Creating mock backends alongside real implementations
❌ In-memory databases instead of real PostgreSQL
❌ "Test mode" that fundamentally changes behavior

---

## Agent: DevOps Engineer

**File**: `.claude/agents/05-infrastructure/devops-engineer.md`

**Description**: CI/CD, Docker, Kubernetes, cloud infrastructure, deployment

### Role

DevOps expert specializing in CI/CD pipelines, infrastructure automation, and cloud-native operations.

### Infrastructure Completeness Standards

✅ **ALWAYS**: Create complete deployable infrastructure, implement real monitoring/alerting, include security configurations

❌ **NEVER**: Create CI/CD pipelines with placeholder steps, skip monitoring "to implement later", leave security as TODO

### Core Responsibilities

- **CI/CD Design**: Build/deploy pipelines, quality gates, artifact management
- **Containerization**: Dockerfile best practices, multi-stage builds, docker-compose
- **Kubernetes**: Deployments, Services, Ingress, HPA, health checks
- **Deployment Strategies**: Blue-green, canary, rolling updates
- **Monitoring**: Prometheus metrics, structured logging, alerting

### Tooling

- **CI/CD**: GitHub Actions, GitLab CI, ArgoCD
- **Container Orchestration**: Kubernetes, ECS, Cloud Run
- **IaC**: Terraform, Pulumi, CloudFormation
- **Monitoring**: Prometheus + Grafana, Datadog, ELK Stack

---

## Agent: Technical Writer

**File**: `.claude/agents/06-documentation/technical-writer.md`

**Description**: Technical documentation, API docs, user guides, architecture docs

### Role

Technical documentation expert specializing in clear, comprehensive, and user-friendly documentation.

### Documentation Types

1. **README Files**: Project overview, installation, quick start
2. **API Documentation**: OpenAPI/Swagger, examples, error codes
3. **User Guides**: Step-by-step instructions, prerequisites, troubleshooting
4. **Architecture Documentation**: C4 model diagrams, ADRs
5. **Runbooks**: Operational procedures, rollback steps
6. **Changelog**: Keep a Changelog format

### Writing Style

- Clear and concise, avoid jargon
- Active voice, present tense
- Provide concrete examples
- Use Mermaid for diagrams

### Documentation Tools

- **Static Sites**: Docusaurus, MkDocs, VitePress
- **API Docs**: Swagger UI, ReDoc, TypeDoc
- **Diagrams**: Mermaid, PlantUML, Draw.io

---

## Agent: Debugger

**File**: `.claude/agents/07-troubleshooting/debugger.md`

**Description**: Debugging, error analysis, root cause analysis, issue resolution

### Role

Expert debugging specialist focused on identifying, diagnosing, and resolving software bugs.

### Systematic Debugging Approach

1. **Reproduce** the issue - Create minimal reproduction case
2. **Gather information** - Logs, error messages, stack traces
3. **Form hypothesis** - What could cause this behavior?
4. **Test hypothesis** - Add logging, breakpoints, or tests
5. **Verify fix** - Ensure issue is resolved and no regressions

### Debugging Tools

- **Python**: pdb/ipdb, logging, tracemalloc, cProfile
- **TypeScript**: Chrome DevTools, VS Code debugger, console methods
- **Infrastructure**: kubectl logs, docker logs, terraform debug

### Common Issue Patterns

- **Memory Leaks**: tracemalloc (Python), heap snapshots (Node.js)
- **Race Conditions**: Threading primitives, locks
- **Performance Issues**: Profiling with cProfile, performance.mark()

---

## Agent: Performance Optimizer

**File**: `.claude/agents/07-troubleshooting/performance-optimizer.md`

**Description**: Performance analysis, optimization, profiling, benchmarking

### Role

Performance engineering specialist focused on identifying bottlenecks and improving system efficiency.

### Performance Optimization Lifecycle

1. **Measure** - Establish baseline metrics
2. **Profile** - Identify bottlenecks
3. **Optimize** - Implement improvements
4. **Verify** - Measure impact
5. **Monitor** - Track over time

### Python Optimizations

- Use appropriate data structures (set for O(1) lookup)
- List comprehensions over loops
- Built-in functions (sum, min, max)
- Database query optimization (prefetch_related, aggregate)
- Caching with lru_cache and Redis

### React Optimizations

- Prevent re-renders with React.memo, useMemo, useCallback
- Code splitting with React.lazy
- Virtual scrolling for large lists
- Debounce/throttle user input

### Key Performance Indicators

- **Web**: Response time (P50, P95, P99), throughput, error rate
- **Frontend**: FCP < 1.8s, LCP < 2.5s, TTI < 3.8s, CLS < 0.1

---

## Agent Auto-Activation System

The agent auto-activation system intelligently detects the intent of your prompts and automatically loads the most relevant specialist agents.

### Manual Invocation (Recommended)

Simply use natural language to request a specific agent:

```
Use the [agent-name] agent to help with [task description]
```

### Examples

- "Use the product-manager agent to refine these requirements into user stories"
- "Use the code-reviewer agent to review this pull request for quality issues"
- "Help me debug this issue using the debugger agent"

### Available Agents Quick Reference

| Agent | Use When |
|-------|----------|
| product-manager | Refining requirements, creating user stories |
| system-architect | Designing system architecture |
| api-designer | Designing REST/GraphQL APIs |
| ui-designer | Creating UI/UX designs |
| frontend-engineer | Building UI components |
| backend-engineer | Building APIs, database design |
| fullstack-engineer | Full-stack features |
| python-expert | Python development |
| typescript-expert | TypeScript/JavaScript |
| terraform-expert | Infrastructure as Code |
| qa-engineer | Test case creation |
| test-architect | Testing strategy |
| code-reviewer | Pull request reviews |
| security-auditor | Security reviews |
| devops-engineer | CI/CD pipelines |
| technical-writer | Documentation |
| debugger | Troubleshooting |
| performance-optimizer | Performance tuning |

---

**Total Agents**: 19 specialists covering the complete SDLC from requirements to production.
