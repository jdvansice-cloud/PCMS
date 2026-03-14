# PCMS - Pet Clinic Management Software
## Project Proposal

### Vision
A cloud-based, all-in-one management platform for a pet clinic, pet shop, and grooming service in Panama. Built with the LATAM veterinary market in mind (inspired by GVET, OkVet, VetPraxis, and others), with Panama-specific compliance (DGI electronic invoicing).

---

## Core Modules

### 1. Client & Patient Management (CRM)
- **Pet Owner Profiles**: name, cedula/RUC, contact info, address, preferred communication channel
- **Pet Profiles**: species, breed, sex, weight, date of birth, photo, microchip ID, allergies, special notes
- **Multi-pet per owner** support
- **Communication History**: log of calls, messages, visits
- **WATI Integration**: automated WhatsApp/Instagram reminders (vaccines, appointments, grooming)
- **Client Portal / Mobile App**: owners can view pet records, upcoming appointments, and vaccination history

### 2. Clinical / Medical Records
- **Visit History**: date, reason, attending vet, diagnosis, treatment, prescriptions
- **Vaccination Tracking**: vaccine type, date administered, next due date, automated reminders
- **Deworming Schedule**: product used, dates, reminders
- **Lab Results & Diagnostics**: attach files (images, PDFs) for X-rays, blood work, etc.
- **Surgical Records**: procedure details, anesthesia notes, pre/post-op images
- **Prescription Management**: medications prescribed, dosage, refill tracking
- **Medical Templates**: predefined templates for common visit types (wellness check, emergency, etc.)
- **Clinical Notes**: SOAP format (Subjective, Objective, Assessment, Plan)

### 3. Appointment Scheduling
- **Calendar View**: daily, weekly, monthly views per vet/groomer/service
- **Service Types**: veterinary consultation, surgery, grooming, vaccination, follow-up
- **Online Booking**: clients can request appointments via portal/app
- **Automated Reminders**: WhatsApp/SMS/email before appointment
- **Walk-in Management**: queue system for walk-in clients
- **Resource Allocation**: assign rooms, equipment, staff per appointment
- **Recurring Appointments**: for ongoing treatments or regular grooming

### 4. Grooming Services Management
- **Grooming Profiles**: pet size, coat type, temperament, preferred groomer, grooming history
- **Service Packages**: bath, haircut, nail trim, ear cleaning, teeth brushing, flea treatment, combos
- **Grooming Queue/Schedule**: separate calendar from clinical appointments
- **Before/After Photos**: attach to grooming records (shareable with owners)
- **Groomer Assignment**: track which groomer handled each pet
- **Grooming Notes**: special instructions, behavioral notes, skin conditions observed

### 5. Pet Shop / Point of Sale (POS)
- **Product Catalog**: food, accessories, medications, supplements, toys
- **ITBMS-Inclusive Pricing**: all prices stored and displayed as final (tax-included) prices
- **ITBMS Breakdown on Ticket**: checkout receipt shows subtotal (pre-tax), ITBMS amount (7%), and total — calculated back from the final price (price / 1.07 = subtotal, price - subtotal = ITBMS)
- **Barcode Scanning**: for quick checkout
- **Multiple Payment Methods**: cash, credit/debit card, Yappy (Panama mobile payment), bank transfer
- **Receipts**: printed and digital (email/WhatsApp)
- **Discounts & Promotions**: percentage/fixed discounts, loyalty programs (applied to final price, ITBMS recalculated)
- **Returns & Exchanges**: track and process returns
- **Daily Cash Register**: open/close register, cash count, reconciliation
- **Service Billing**: bill for consultations, surgeries, grooming from the same POS

### 6. Inventory Management
- **Stock Tracking**: real-time quantities per product
- **Low Stock Alerts**: configurable minimum thresholds
- **Supplier Management**: supplier profiles, contact info, lead times
- **Purchase Orders**: create, send, and track orders to suppliers
- **Batch/Lot Tracking**: for medications and perishable items (expiry dates)
- **Stock Adjustments**: manual adjustments with reason logging (damage, theft, expired)
- **Multi-location Support**: if expanding to additional branches
- **Inventory Reports**: stock valuation, movement history, slow-moving items

### 7. Billing & Electronic Invoicing (Panama DGI Compliance)
- **Invoice Generation**: for services and products
- **Panama DGI Electronic Invoice (Factura Electrónica)**: XML format per DGI specifications
- **PAC Integration**: connect to a Proveedor Autorizado Calificado for invoice certification
- **RUC Validation**: verify client tax ID
- **Credit Notes**: for returns and adjustments
- **Payment Tracking**: partial payments, payment plans
- **Tax Calculations**: ITBMS extracted from tax-inclusive prices (final_price / 1.07 = subtotal; ITBMS = final_price - subtotal)
- **Invoice ITBMS Display**: invoices show per-line and total ITBMS amounts extracted from final prices
- **Tax-Exempt Items**: flag for products/services exempt from ITBMS (subtotal = final price, ITBMS = 0)
- **Invoice History**: searchable archive of all invoices
- **Fiscal Printer Support**: optional integration with fiscal receipt printers

### 8. Financial Reports & Analytics
- **Revenue Dashboard**: daily, weekly, monthly, yearly revenue
- **Revenue by Service Type**: clinical, grooming, pet shop breakdown
- **Expense Tracking**: operational costs, supplier payments, payroll
- **Profit & Loss**: basic P&L reports
- **Top Products/Services**: best sellers, most requested services
- **Client Analytics**: new vs returning clients, visit frequency, average spend
- **Vet/Groomer Performance**: appointments handled, revenue generated
- **Exportable Reports**: PDF and Excel export

### 9. Staff Management
- **Employee Profiles**: role (vet, groomer, receptionist, admin), schedule, contact
- **Role-Based Access Control**: restrict features by role (admin, vet, receptionist, groomer)
- **Activity Logging**: audit trail of who did what and when
- **Schedule Management**: staff work schedules and availability
- **Commission Tracking**: optional, for services rendered

### 10. Notifications & Communication
- **WATI Integration (WhatsApp + Instagram)**: appointment reminders, vaccination alerts, promotional messages via WATI API
- **Automated Message Workflows**: triggered by events (appointment booked, vaccine due, grooming complete, etc.)
- **Template Messages**: pre-approved WhatsApp templates for reminders, confirmations, follow-ups
- **Instagram DMs**: customer inquiries and engagement via WATI's Instagram integration
- **Email Notifications**: invoices, appointment confirmations, reports
- **SMS Fallback**: for clients without WhatsApp
- **In-App Notifications**: for staff (new appointment, low stock, etc.)
- **Bulk Messaging**: promotional campaigns to client segments via WATI broadcast

---

## Technical Architecture (Proposed)

### Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js + TypeScript | Full-stack React framework, API routes, SSR |
| UI Framework | Tailwind CSS + shadcn/ui | Rapid development, consistent design |
| Database | Supabase (PostgreSQL) | Managed Postgres, auth, storage, realtime, RLS |
| ORM | Prisma | Type-safe database access, migrations |
| Auth | Supabase Auth | Built-in role-based access, secure sessions, RLS integration |
| File Storage | Supabase Storage | Medical images, documents, photos (S3-compatible) |
| Real-time | Supabase Realtime | Live appointment updates, notifications via Postgres changes |
| Mobile | PWA (Progressive Web App) | Client-facing app for pet owners, no app store needed |
| Deployment | Vercel | Optimized for Next.js, edge functions, preview deploys |

### Key Integrations
- **Panama DGI**: Electronic invoicing via PAC API
- **WATI (WhatsApp & Instagram)**: Client messaging, automated reminders, campaigns via WATI API
- **Yappy API**: Panama's popular mobile payment
- **Payment Gateway**: Credit/debit card processing
- **Email Service**: Transactional emails (SendGrid/Resend)

---

## Development Phases

### Phase 1 - Foundation (MVP)
- Project setup (monorepo, DB schema, auth)
- Client & Pet management (CRUD)
- Basic appointment scheduling (calendar view)
- Simple POS (product catalog, checkout, receipt)
- Basic inventory tracking
- User roles (admin, vet, receptionist)

### Phase 2 - Clinical Core
- Full medical records (visit history, SOAP notes)
- Vaccination & deworming tracking with reminders
- File attachments (lab results, images)
- Prescription management
- Invoice generation (basic, pre-DGI)

### Phase 3 - Grooming & Services
- Grooming module (profiles, packages, scheduling)
- Service-specific calendars
- Before/after photo management
- Groomer assignment and notes

### Phase 4 - Billing & Compliance
- Panama DGI electronic invoicing integration
- PAC provider integration
- ITBMS tax calculations
- Credit notes and payment tracking
- Fiscal reporting

### Phase 5 - Communication & CRM
- WATI API integration (WhatsApp + Instagram)
- Automated reminders (vaccines, appointments, grooming) via WATI workflows
- Email notifications
- Bulk messaging / campaigns
- Client portal (web)

### Phase 6 - Analytics & Advanced Features
- Financial dashboards and reports
- Client & service analytics
- Staff performance metrics
- Multi-location support
- Mobile app for pet owners (PWA or React Native)

---

## Panama-Specific Considerations

1. **Language**: Spanish as primary language, English optional
2. **Currency**: Balboa (B/.) / USD (at par)
3. **Tax**: ITBMS at 7% — all prices in the system are stored as **final (tax-inclusive)** prices. ITBMS is back-calculated and shown on receipts/invoices (price / 1.07 = subtotal, difference = ITBMS)
4. **Electronic Invoicing**: DGI compliance mandatory — as of Jan 2026, businesses issuing >100 invoices/month or >B/.36,000/year must use a PAC
5. **Payments**: Yappy (Banco General) is widely used — integration is a differentiator
6. **Communication**: WhatsApp is the dominant messaging platform in Panama — WATI used for WhatsApp + Instagram messaging and automation
7. **Hosting**: Vercel (frontend/API) + Supabase (database/auth/storage) — select US East region for low latency to Panama

---

## Competitive Advantage over GVET and Similar Software

| Feature | GVET | PCMS (Ours) |
|---------|------|-------------|
| Panama DGI e-invoice | Limited (Argentina, Chile, etc.) | Native Panama DGI/PAC support |
| Yappy payments | No | Yes |
| Grooming module | Basic | Full-featured (profiles, photos, packages) |
| Pet Shop POS | Basic sales | Full POS with barcode, discounts, register |
| WhatsApp + Instagram | Yes (WhatsApp only) | Yes via WATI — WhatsApp + Instagram + automated workflows |
| Language | Multi-language | Spanish-first, Panama-localized |
| Offline capability | No | Yes (sync when online) |
| Client mobile app | Basic | Full portal (records, booking, notifications) |

---

## Summary

PCMS will be a **Panama-first, full-stack pet clinic management platform** that combines veterinary clinical management, grooming services, pet shop retail, and CRM into a single system — with native compliance for Panama's electronic invoicing requirements and integration with local payment methods. The phased approach ensures an MVP can be delivered quickly while building toward a comprehensive solution.
