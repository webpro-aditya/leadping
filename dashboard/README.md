# LeadPing AI — Web Dashboard

Modern React 18 & TypeScript single page application (SPA) for **LeadPing AI** sales pipeline and intelligence management.

---

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **React Router v6**
- **Axios** (with Bearer token auto-injection and 401 interception)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd dashboard
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Dashboard will be live at `http://localhost:5173` (or Vite's assigned port).

### 3. Production Build
```bash
npm run build
```
Creates optimized static bundle in `dist/`.

---

## 🖥 Application Features

1. **Authentication Flow**:
   - `/login`: Secure user login, persistent Bearer token storage.
   - `/register`: User onboarding linked to the Free tier.
   - Route guards automatically redirect unauthenticated users to `/login`.

2. **Sales Dashboard (`/`)**:
   - Summary statistics cards: Total Leads, High Potential (score ≥80), Medium Potential (50-79), Low Potential (<50).
   - Interactive ICP score distribution visualization.
   - Recent leads table with instant click-through to details.

3. **Lead Management (`/leads`)**:
   - Search by company name, industry, or domain.
   - Filters: Status (`new`, `qualified`, `contacted`, `replied`, `meeting`, `won`, `lost`), score range slider, sorting options.
   - Bulk selection and deletion.
   - Streamed CSV export.

4. **Lead Detail View (`/leads/:id`)**:
   - Company overview card (verified vs estimated details).
   - Radial ICP score and sub-fit category breakdown.
   - Buying signals with confidence markers and sources.
   - Categorized pain points and sales opportunities.
   - Editable status and notes field.
   - Generated outreach messages.

5. **Usage & Subscriptions (`/usage` & `/subscription`)**:
   - Visual progress bars comparing analyses, outreach, and leads against plan limits.
   - Tier comparison matrix: Free ($0), Pro ($19/mo), Business ($49/mo), Agency ($99/mo).
