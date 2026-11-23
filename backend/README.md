# LeadPing AI — Laravel Backend API

Production-ready Laravel 11 REST API backend for **LeadPing AI** (Chrome Extension & Web Dashboard). Handles authentication via Laravel Sanctum, AI sales intelligence orchestration (OpenAI / switchable providers), lead management, database-backed subscription tiers, usage credit tracking, and CSV exports.

---

## 🛠 Tech Stack

- **PHP**: 8.2+ (tested with PHP 8.3)
- **Framework**: Laravel 11
- **Auth**: Laravel Sanctum API tokens
- **Database**: MySQL / SQLite (with 14 indexed migrations)
- **Cache & Queues**: Redis / Database / Sync
- **AI Provider**: `openai-php/laravel` (GPT-4o-mini default, swappable via `AIProviderInterface`)

---

## 🚀 Quick Start

### 1. Requirements
Ensure PHP 8.2+, Composer 2+, and MySQL (or SQLite) are installed and running.

### 2. Install Dependencies
```bash
cd backend
composer install
```

### 3. Environment Configuration
```bash
cp .env.example .env
php artisan key:generate
```
Configure your `.env` file:
```ini
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=leadping
DB_USERNAME=root
DB_PASSWORD=

OPENAI_API_KEY=sk-your-openai-api-key-here
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
```

### 4. Database Migrations & Seeders
```bash
php artisan migrate
php artisan db:seed
```
*Seeds the 4 subscription plans (Free, Pro, Business, Agency) and a demo account:*
- **Email**: `test@leadping.ai`
- **Password**: `password123`

### 5. Run the Local Server
```bash
php artisan serve
```
Backend will be live at `http://127.0.0.1:8000`.

---

## 📡 REST API Reference

All requests and responses use JSON. Authenticated endpoints require the `Authorization: Bearer <token>` header.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user (auto-assigns Free plan + Sanctum token) |
| `POST` | `/api/auth/login` | Authenticate with email/password → returns Sanctum token |
| `POST` | `/api/auth/logout` | Revoke current user token |
| `GET` | `/api/user` | Fetch current user profile with active subscription & plan |

### Sales & Lead Intelligence
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze/company` | Analyze webpage data with AI; returns structured company profile, ICP scores, signals, and pitch |
| `POST` | `/api/leads` | Create/Save a qualified lead from analysis |
| `GET` | `/api/leads` | Paginated leads list with search, status, and score filtering |
| `GET` | `/api/leads/{id}` | Retrieve single lead with signals, pain points, and opportunities |
| `PUT` | `/api/leads/{id}` | Update lead status (`new`, `qualified`, `contacted`, etc.) and notes |
| `DELETE`| `/api/leads/{id}` | Delete lead |
| `POST` | `/api/leads/{id}/outreach` | Generate custom outreach (Email, LinkedIn, Cold Call) with tone controls |
| `POST` | `/api/leads/{id}/rescore` | Recalculate lead ICP scores |
| `GET` | `/api/leads-export` | Streamed CSV export of user leads |

### Usage & Subscriptions
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/usage` | Current billing period usage & remaining quota |
| `GET` | `/api/subscription` | Current user plan & status |
| `GET` | `/api/plans` | List available subscription tiers |

---

## 🧪 Testing

Run PHPUnit tests:
```bash
php artisan test
```
All feature and unit tests run with SQLite in-memory database.
