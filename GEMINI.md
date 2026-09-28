## Project Overview

This is a Customer Relationship Management (CRM) application built with a modern tech stack. The application is designed to manage enquiries, follow-ups, invoices, admissions, and other CRM-related activities.

**Key Technologies:**

*   **Framework:** Next.js 15 with App Router
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui + Radix UI
*   **Database:** MongoDB with Prisma ORM
*   **Package Manager:** pnpm

**Architecture:**

The project follows a modular architecture with a clear separation of concerns. The `src` directory contains the main application code, including the Next.js app, components, constants, configuration, types, and utility functions. The `prisma` directory contains the database schema and seed scripts.

## Building and Running

**1. Install Dependencies:**

```bash
pnpm install
```

**2. Run the Development Server:**

```bash
pnpm dev
```

This will start the development server with Turbopack at `http://localhost:3000`.

**3. Build for Production:**

```bash
pnpm build
```

**4. Start the Production Server:**

```bash
pnpm start
```

**5. Lint the Code:**

```bash
pnpm lint
```

**6. Seed the Database:**

```bash
pnpm db:seed
```

## Development Conventions

*   **Type Safety:** The project uses TypeScript extensively with proper type definitions located in the `src/types` directory.
*   **Configuration Management:** Application settings are centralized in `src/config/app.ts`.
*   **Constants Management:** UI data, such as navigation links and dashboard metrics, is stored in the `src/constants` directory.
*   **Component Structure:** Components are designed to be reusable and composable, following the single responsibility principle.
*   **Utility Functions:** Common functions are centralized in `src/lib/utils.ts`.
*   **Database:** The database schema is managed with Prisma in `prisma/schema.prisma`.

## Page-by-Page Functionality

This section outlines the functionality of each page within the application.

### Dashboard (`/dashboard`)

The dashboard provides a high-level overview of the CRM's key metrics. The data displayed is tailored to the user's role (admin, executive, or telecaller).

*   **Key Metrics:** Displays total enquiries, new enquiries, pending follow-ups, and total calls.
*   **Follow-up Stats:** Shows overdue, today's, and interested leads' follow-ups.
*   **Recent Activity:** Lists recent activities such as new enquiries, calls made, and enrollments.
*   **Performance Summary:** Provides a summary of the user's performance, including interest and conversion rates.

### Enquiries (`/enquiries`)

This page is for managing all customer enquiries.

*   **Enquiry List:** Displays a table of all enquiries with details like candidate name, contact, course, status, source, and assigned user.
*   **Search and Filter:** Allows users to search for specific enquiries and filter them by various criteria.
*   **Actions:** Users can view, edit, and delete enquiries.
*   **Mobile View:** A mobile-friendly card view is available for smaller screens.

### Follow-ups (`/follow-ups`)

This page helps users manage their scheduled follow-ups with potential customers.

*   **Follow-up List:** Displays a list of follow-ups with details like candidate name, phone number, scheduled time, and status.
*   **Filtering:** Follow-ups can be filtered by status (all, pending, overdue, completed).
*   **Update Status:** Users can update the status of a follow-up, add notes, and reschedule it.

### Invoices (`/invoices`)

This page is dedicated to managing invoices.

*   **Invoice List:** Shows a table of all invoices with details like invoice number, billed to, date, status, and total amount.
*   **Search and Filter:** Users can search for invoices and filter them by status.
*   **Actions:** Users can create, view, edit, delete, and generate PDFs of invoices.

### Admissions (`/admissions`)

This page is for managing student admissions.

*   **Admission List:** Displays a list of all admissions with details like admission number, candidate name, mobile number, and course.
*   **Search and Filter:** Admissions can be searched and filtered by various criteria.
*   **Actions:** Users can create, view, edit, and delete admissions.
*   **Enquiry to Admission:** Allows creating an admission directly from an enquiry.

### Expenses (`/expenses`)

This page is for tracking and managing business expenses.

*   **Expense List:** Displays a table of all expenses with details like title, description, amount, category, and date.
*   **Search and Filter:** Expenses can be searched and filtered by category.
*   **Actions:** Users can create, view, edit, and delete expenses.

### Reports (`/reports`)

This page provides access to various reports, with availability based on the user's role.

*   **Available Reports:**
    *   Telecaller Performance
    *   Branch Analytics
    *   Admission Payments
    *   Expense Analysis
    *   Invoice Reports
    *   Income Analysis
    *   Pending Payments

### Admin (`/admin`)

This is the admin panel, accessible only to users with the 'admin' role.

*   **User Management:** Add, edit, and manage user accounts.
*   **Branch Management:** Manage office branches.
*   **Course Management:** Manage available courses.
*   **Enquiry Source Management:** Manage lead sources.

### Call Register (`/call-register`)

This page displays a log of all calls made.

*   **Call Log:** Shows a table of all calls with details like date, candidate, phone number, agent, outcome, and duration.
*   **Call Statistics:** Displays statistics on total calls, answered calls, success rate, and total duration.
*   **Filtering:** Call logs can be filtered by outcome and date range.