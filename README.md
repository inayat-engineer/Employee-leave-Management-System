# LeaveOps - Employee Leave Management System

[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A production-ready full-stack employee leave management system with enterprise-grade security, real-time balance tracking, and fully containerized deployment.

> **⭐ Production Ready | 🔒 Security Hardened | 🚀 Scalable Architecture**

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Default Login](#default-login)
- [Monitoring & Health](#monitoring--health)
- [Testing](#testing)
- [Security Features](#security-features)
- [API Documentation](#api-documentation)
- [Docker Commands](#docker-commands)
- [Development Commands](#development-commands)
- [Roadmap](#roadmap)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### 🔐 Authentication & Security
- **JWT-based auth** with `httpOnly`, `SameSite=Lax` cookies (XSS-proof)
- **Invite-only onboarding** with cryptographically secure tokens
- **Two-factor email verification** for email changes
- **Step-up re-authentication** for sensitive operations
- **Rate limiting** on all auth endpoints (5/min login, 10/hr invites)
- **Session invalidation** on password reset

### 👥 Role-Based Access Control
- **HR (Superuser)** and **Employee** roles with server-side enforcement
- **Field-level allowlisting** - employees can't elevate permissions
- **Safe deletion** - employees with leave history can't be deleted
- **IDOR protection** with 404 vs 403 response strategy

### 📋 Leave Management
- Apply, approve, reject, and withdraw leave requests
- **Smart balance tracking** - deduction only on approval
- **Overlap detection** - no double-booking
- **Concurrency-safe** with `SELECT FOR UPDATE` row locks
- **Immutable approvals** - audit trail preservation

### 📊 Dashboard & Analytics
- **Role-aware dashboards** - HR sees org-wide stats
- **Real charts** - leave-type distribution and monthly trends
- **Global search** with role-based filtering

### 🔔 Notifications
- In-app notifications with polling (20s interval)
- Real-time notifications via WebSocket (coming soon)
- Email notifications for invites and approvals

### 🎨 Modern UI/UX
- **Dark/Light theme** support
- **Responsive design** for all devices
- **Skeleton loading** states
- **Error boundaries** for graceful failures
- **TypeScript** for type safety

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| Zustand | 4.x | State Management |
| React Hook Form | 7.x | Form Handling |
| Zod | 3.x | Validation |
| Axios | 1.x | HTTP Client |
| Recharts | 2.x | Charts |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.115.x | API Framework |
| SQLAlchemy | 2.0.x | ORM |
| Pydantic | 2.9.x | Data Validation |
| Python-Jose | 3.3.x | JWT Handling |
| Passlib | 1.7.x | Password Hashing |
| SlowAPI | 0.1.x | Rate Limiting |
| Alembic | 1.13.x | Migrations |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Orchestration |
| Nginx | Reverse Proxy |
| MySQL 8.0 | Database |
| Redis | Caching (optional) |
| Prometheus | Monitoring |
| Grafana | Visualization |

---

## 🏗️ Architecture
┌─────────────────────────────────────┐
Browser ───────► │ Nginx (Port 80/443) │
│ - Serves React static files │
│ - Proxies /api/* to backend │
│ - SSL/TLS termination │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ FastAPI Backend (Port 8000) │
│ - Service Layer (Business Logic) │
│ - Repository Layer (Data Access) │
│ - Rate Limiting │
│ - JWT Auth │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ MySQL 8.0 (Port 3306) │
│ - Leave requests │
│ - Employee data │
│ - Audit logs │
└─────────────────────────────────────┘

text

**Key Architectural Decisions:**
- ✅ **Service Layer Pattern** - Business logic separated from routes
- ✅ **Repository Pattern** - Data access abstraction
- ✅ **API Versioning** - `/api/v1/*` for future compatibility
- ✅ **Global Exception Handling** - Consistent error responses
- ✅ **Dependency Injection** - Decoupled, testable code
- ✅ **Redis Cache** - Optional performance boost

---

## 📁 Project Structure
Employee-leave-Management-System/
├── backend/
│ ├── app/
│ │ ├── api/
│ │ │ ├── v1/ # API version 1 routes
│ │ │ └── middleware/ # Custom middleware
│ │ ├── core/
│ │ │ ├── cache/ # Redis caching
│ │ │ ├── config.py # App configuration
│ │ │ ├── exceptions.py # Global exception handlers
│ │ │ └── security.py # Auth, JWT, password
│ │ ├── models/ # SQLAlchemy models
│ │ ├── repositories/ # Data access layer
│ │ ├── schemas/ # Pydantic schemas
│ │ ├── services/ # Business logic
│ │ ├── tasks/ # Background tasks
│ │ └── main.py # FastAPI app entry
│ ├── alembic/ # Database migrations
│ ├── tests/ # Unit & integration tests
│ ├── requirements.txt
│ ├── Dockerfile
│ └── .env.example
├── frontend/
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ ├── hooks/ # Custom React hooks
│ │ ├── pages/ # Route pages
│ │ ├── services/ # API client
│ │ ├── store/ # Zustand state stores
│ │ ├── types/ # TypeScript types
│ │ └── utils/ # Utilities & helpers
│ ├── tests/ # Frontend tests
│ ├── package.json
│ └── Dockerfile
├── nginx/
│ ├── nginx.conf
│ └── Dockerfile
├── monitoring/
│ ├── prometheus/ # Metrics collection
│ └── grafana/ # Dashboards
├── scripts/
│ ├── healthcheck.sh
│ └── backup.sh
├── .github/
│ └── workflows/ # CI/CD pipelines
├── docker-compose.yml
└── README.md

text

---

## 🚀 Quick Start

### Prerequisites
- **Docker** & **Docker Compose** (recommended)
- OR Python 3.12+, Node.js 20+ (local development)

### Option A: Docker (Production-Ready) ⭐

```bash
# 1. Clone the repository
git clone https://github.com/inayat-engineer/Employee-leave-Management-System.git
cd Employee-leave-Management-System

# 2. Create environment file
cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=change_this_root_password
MYSQL_DATABASE=leave_db
MYSQL_USER=leave_user
MYSQL_PASSWORD=change_this_db_password
JWT_SECRET=change_this_secret_64_chars_minimum
BOOTSTRAP_SUPERUSER_EMAIL=admin@company.com
BOOTSTRAP_SUPERUSER_PASSWORD=Admin@123
BOOTSTRAP_SUPERUSER_FULL_NAME=System Administrator
DEBUG=False
ENABLE_DOCS=False
REDIS_URL=redis://redis:6379/0
EOF

# 3. Build and start services
docker compose up -d --build

# 4. Wait for initialization (15 seconds)
sleep 15

# 5. Run health check
./scripts/healthcheck.sh

# 6. Access the application
# Frontend: http://localhost
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
Option B: Local Development
Backend:

bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Frontend (new terminal):

bash
cd frontend
npm install
npm run dev
🔑 Default Login
After first startup, use these credentials:

Email: admin@company.com

Password: Admin@123

⚠️ IMPORTANT: Change these credentials immediately after first login!

📊 Monitoring & Health
Health Check
bash
# Run health check
./scripts/healthcheck.sh

# Check all service status
docker compose ps

# View logs
docker compose logs -f
Monitoring (Optional)
Prometheus: http://localhost:9090

Grafana: http://localhost:3000 (admin/admin)

🧪 Testing
bash
# Backend tests
cd backend
source venv/bin/activate
pytest tests/ -v --cov=app

# Frontend tests
cd frontend
npm run test
🔒 Security Features
Security Control	Implementation
Authentication	JWT in HttpOnly cookies
Authorization	Role-based (HR/Employee)
Rate Limiting	5/min login, 10/hr invites
SQL Injection	Parameterized queries
XSS Protection	HttpOnly cookies, CSP
CSRF Protection	SameSite=Lax cookies
Password Hashing	bcrypt
Input Validation	Server-side with Pydantic
Audit Trail	Audit logs for all actions
Session Invalidation	Token version on password reset
📈 API Documentation
When ENABLE_DOCS=True (in .env), access:

Swagger UI: http://localhost:8000/docs

ReDoc: http://localhost:8000/redoc

OpenAPI Schema: http://localhost:8000/openapi.json

Key Endpoints
http
POST   /api/v1/auth/login          # Login
POST   /api/v1/auth/logout         # Logout
POST   /api/v1/auth/refresh        # Refresh token
POST   /api/v1/auth/forgot-password # Forgot password

GET    /api/v1/employees           # List employees (HR)
GET    /api/v1/employees/me        # My profile
GET    /api/v1/employees/{id}      # Get employee (HR)

GET    /api/v1/leaves              # List leaves
POST   /api/v1/leaves              # Apply for leave
PUT    /api/v1/leaves/{id}/approve # Approve leave (HR)
PUT    /api/v1/leaves/{id}/reject  # Reject leave (HR)

GET    /api/v1/dashboard           # Dashboard stats
GET    /api/v1/notifications       # My notifications
🐳 Docker Commands
bash
# Start all services
docker compose up -d

# Rebuild and start
docker compose up -d --build

# Stop services
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v

# View logs
docker compose logs -f

# Check service status
docker compose ps

# Execute command in container
docker compose exec backend bash
🛠️ Development Commands
Backend
bash
# Activate virtual environment
source venv/bin/activate

# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description"

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v --cov=app

# Code formatting
black app/
ruff check .
Frontend
bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run type check
npm run type-check
🌟 Roadmap
Docker containerization

HTTPS/SSL support

Redis caching

CI/CD pipeline

Monitoring with Prometheus/Grafana

Database migrations (Alembic)

Service/Repository pattern

State management (Zustand)

API versioning

WebSocket real-time notifications

File upload for profile pictures

Email digest notifications

Multi-tenancy support

Mobile app (React Native)

📝 Known Limitations
HTTPS - Requires Let's Encrypt setup (instructions available)

Email - Needs SMTP configuration for production

WebSockets - Currently using polling (WebSocket support coming)

File Upload - No file upload for profile pictures

🤝 Contributing
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing-feature)

Open a Pull Request

📄 License
This project is open source and available under the MIT License.

🙏 Acknowledgments
Built as a 3-week internship portfolio project

Special thanks to the security audit team

Inspired by real-world enterprise leave management systems

📧 Contact
Inayat Ali

GitHub: @inayat-engineer

Project Link: Employee-leave-Management-System

⭐ If you found this project useful, please give it a star!

https://img.shields.io/github/stars/inayat-engineer/Employee-leave-Management-System?style=social
https://img.shields.io/github/forks/inayat-engineer/Employee-leave-Management-System?style=social

text

---

## 📋 **Changes Made:**

1. ✅ Fixed **ASCII diagram** formatting (used code block with proper spacing)
2. ✅ Fixed **project structure** (used code block with proper indentation)
3. ✅ Added **Table of Contents** for easy navigation
4. ✅ Fixed **inline code formatting** for commands and endpoints
5. ✅ Added proper **code fences** around all code blocks
6. ✅ Fixed **Headers** hierarchy (## for main sections, ### for sub-sections)
7. ✅ Fixed **badge links** at the bottom
8. ✅ Added **consistent spacing** throughout
9. ✅ Fixed **bullet points** and lists
10. ✅ Added **code block language identifiers** (bash, http, etc.)

---

## 🚀 **Quick Command to Update README**

```bash
cd ~/Employee-leave-Management-System

# Copy the corrected README
cat > README.md << 'EOF'
[PASTE THE CORRECTED README CONTENT HERE]
EOF

# Verify
head -20 README.md

# Commit
git add README.md
git commit -m "📝 Updated README with professional documentation and fixed formatting"
git push origin main
