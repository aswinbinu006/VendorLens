# Documentation Index

Welcome to the **AI Vendor Risk & Compliance Monitor (Pharma)** documentation suite. This index maps all architecture, compliance, and design documents in their recommended reading order.

---

## 1. Executive & Product Foundations
* **[README.md](../README.md)**: Project overview, mission, core features, and quickstart instructions.
* **[PRD.md](./PRD.md)**: Product Requirements Document — problem statement, user personas, and compliance requirements.
* **[PHARMA-PRIMER.md](./PHARMA-PRIMER.md)**: Industry context — FDA regulatory enforcement, cGMP violations, Warning Letters, and 483 inspection citations.
* **[FEATURES.md](./FEATURES.md)**: Complete feature specification matrix (Must / Should / Roadmap).

---

## 2. Architecture & Technical Specifications
* **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System topology, modular monolith structure, data flow, and decoupled frontend/backend boundaries.
* **[TECH-STACK.md](./TECH-STACK.md)**: Core dependencies, framework rationale (Express, PostgreSQL, Prisma, React, Vite).
* **[TRD.md](./TRD.md)**: Technical Requirements Document — non-functional requirements, data retention, idempotency.
* **[DATABASE.md](./DATABASE.md)**: PostgreSQL relational schema, indexes, enums, migrations, and foreign key cascades.
* **[API.md](./API.md)**: REST API contract, request/response schemas, error codes, and authentication requirements.

---

## 3. Algorithmic Intelligence & Risk Models
* **[FUZZY-ENGINE.md](./FUZZY-ENGINE.md)**: Mathematical specification of the 2-Stage Mamdani Fuzzy Inference System (membership functions, fuzzification, rule matrix, defuzzification).
* **[FLAGGING-LOGIC.md](./FLAGGING-LOGIC.md)**: Rules governing the Trigram Fuzzy String Matching engine, thresholds, and human-in-the-loop review queues.

---

## 4. UI Design & Enterprise Usability
* **[Frontend Design Rules.md](./Frontend%20Design%20Rules.md)**: Primary enterprise UI design standard — IBM Plex typography, high contrast, zero animations, no drop shadows, and horizontal 4-band risk bars.
* **[DESIGN.md](./DESIGN.md)**: General user experience workflows and screen-by-screen wireframe layouts.

---

## 5. Security, Quality & Operations
* **[SECURITY.md](./SECURITY.md)**: Threat model, Content Security Policy, CSRF protection, secure cookie handling, and secret scanning.
* **[PERFORMANCE.md](./PERFORMANCE.md)**: Latency benchmarks, measured response times, and scale targets.
* **[SETUP.md](./SETUP.md)**: Local developer setup, environment variables, and PostgreSQL prerequisites.
* **[DEPLOYMENT.md](../DEPLOYMENT.md)**: Independent production deployment guides for backend (Docker / Railway / Render) and frontend (Vercel / Netlify / Nginx).
* **[PROGRESS.md](./PROGRESS.md)**: Detailed engineering audit log across all implementation phases.
* **[VIVA-QA.md](./VIVA-QA.md)**: Comprehensive evaluation Q&A guide for project presentation and technical defense.
