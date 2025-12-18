# SAPM-IMS-Software
Image Management System for ABC Healthcare Group in Software Architecture and Programming Models Module

## Architecture Overview

This is a Service-Oriented Architecture (SOA) based Image Management System built with:
- **Backend**: Python FastAPI
- **Frontend**: ReactJS
- **Database**: PostgreSQL
- **Object Storage**: MinIO

## Monorepo Structure

```
SAPM-IMS-Software/
├── backend/                 # FastAPI Backend Application
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   │   └── v1/         # API version 1
│   │   ├── core/           # Core configuration and utilities
│   │   │   ├── config.py   # Application settings
│   │   │   ├── database.py # Database connection
│   │   │   ├── security.py # JWT and password hashing
│   │   │   ├── dependencies.py # Auth dependencies
│   │   │   └── minio_client.py # MinIO client setup
│   │   ├── models/         # SQLAlchemy database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic services
│   ├── tests/              # Unit tests
│   ├── main.py             # FastAPI application entry point
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Backend container definition
│   └── pytest.ini           # Pytest configuration
│
├── frontend/               # ReactJS Frontend Application
│   ├── public/             # Static assets
│   ├── src/                # React source code
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service clients
│   │   └── utils/          # Utilities
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile          # Frontend container definition
│
├── docker-compose.yml      # Docker Compose orchestration
├── setup.ps1              # Windows setup script
└── README.md              # This file

```

## Features

### Backend Services
1. **User Service** - User management with RBAC
2. **Patient Service** - Patient record management
3. **Medical Staff Service** - Medical staff management
4. **Medical Image Service** - Image upload and management with MinIO
5. **Diagnostic Report Service** - Report creation and management
6. **Billing Service** - Bill and payment management
7. **Workflow Service** - Workflow step tracking

### Frontend Pages
1. **Login/Register** - User authentication
2. **Dashboard** - Role-based dashboard
3. **Upload Image** - Medical image upload (Technician/Radiologist/Doctor)
4. **Create Report** - Diagnostic report creation (Radiologist/Doctor)
5. **Billing** - View bills and financial summaries

### Security
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Password hashing with bcrypt
- Direct service-to-service communication

## Getting Started

### Prerequisites for New Device Setup

Before setting up the project on a new device, ensure you have the following installed:

1. **Docker Desktop** (Required)
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and ensure Docker Desktop is running
   - Verify installation: `docker --version`

2. **Git** (Required)
   - Download from: https://git-scm.com/downloads
   - Verify installation: `git --version`

3. **Node.js 18+** (Required for Frontend)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

4. **Python 3.11+** (Required for Local Development)
   - Download from: https://www.python.org/downloads/
   - Verify installation: `python --version`
   - Note: Only needed if running services locally (not in Docker)

5. **PowerShell 5.1+** (Required for Setup Scripts)
   - Usually pre-installed on Windows 10/11
   - Verify installation: `$PSVersionTable.PSVersion`

### Initial Setup Instructions

#### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd SAPM-IMS-Software
```

#### Step 2: Run Automated Setup Script
The setup script will automatically:
- Validate prerequisites
- Create `.env` files for all backend services
- Set up frontend configuration
- Provide service URLs and access information

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

This script will:
- Check if Docker is running
- Validate service structure
- Create `.env` files from `.env.example` templates for all services
- Set up frontend `.env` file
- Display service URLs and next steps

**Important**: The setup script automatically creates `.env` files with appropriate default values for your local environment.

#### Step 3: Start Backend Services (Docker)
Start all backend services, database, and MinIO:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- MinIO object storage (ports 9000, 9001)
- All backend microservices

**Verify services are running:**
```bash
docker ps
```

You should see containers for:
- `ims-postgres` (database)
- `ims-minio` (object storage)
- All backend service containers

#### Step 4: Configure MinIO Bucket (One-time setup)
Set MinIO bucket to public access for image retrieval:

**Option 1: Use PowerShell script (Recommended)**
```powershell
.\set-minio-public.ps1
```

**Option 2: Manual setup**
1. Open MinIO Console: http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Go to Buckets → `images` → Access Policy
4. Set to "Public" or "Custom" with GetObject allowed for all

#### Step 5: Start Frontend Application
The frontend runs locally (not in Docker) for better development experience.

**Option 1: Use PowerShell script (Recommended)**
```powershell
cd frontend
.\start-frontend.ps1
```

**Option 2: Manual start**
```bash
cd frontend
npm install
npm start
```

The frontend will start on http://localhost:3000

### Initial Admin Access

The system comes with a default admin account for initial setup:

- **Username**: `admin`
- **Password**: `admin#123`

**Important**: 
- Use these credentials to log in and activate other user accounts
- New user registrations are inactive by default and require admin activation
- Change the admin password in production by updating `ADMIN_PASSWORD_HASH` in `services/auth-service/app/core/config.py` or via environment variables

### Access Points

Once all services are running, access the application at:

- **Frontend Application**: http://localhost:3000
- **MinIO Console**: http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin`
- **PostgreSQL Database**: `localhost:5432`
  - Database: `ims_db`
  - User: `ims_user`
  - Password: `ims_password`

**Backend Services (Direct Access):**
- **auth-service**: http://localhost:5001
- **user-service**: http://localhost:5002
- **patient-service**: http://localhost:5003
- **medical-staff-service**: http://localhost:5004
- **medical-image-service**: http://localhost:5005
- **diagnostic-report-service**: http://localhost:5006
- **billing-service**: http://localhost:5007
- **workflow-service**: http://localhost:5008

### Service Ports

Backend services run on the following ports:
- **auth-service**: 5001
- **user-service**: 5002
- **patient-service**: 5003
- **medical-staff-service**: 5004
- **medical-image-service**: 5005
- **diagnostic-report-service**: 5006
- **billing-service**: 5007
- **workflow-service**: 5008

### Troubleshooting

#### Docker Issues
- **Docker not running**: Ensure Docker Desktop is started
- **Port conflicts**: Check if ports 3000, 5432, 5001-5008, 9000, 9001 are available
- **Container errors**: Check logs with `docker-compose logs [service-name]`

#### Frontend Issues
- **npm install fails**: Ensure Node.js 18+ is installed
- **Port 3000 in use**: Change port in `frontend/package.json` or stop conflicting service

#### Database Issues
- **Connection errors**: Ensure PostgreSQL container is running: `docker ps | grep postgres`
- **Tables not created**: Tables are created automatically on first service startup via SQLAlchemy

#### MinIO Issues
- **Images not accessible**: Run `.\set-minio-public.ps1` to configure bucket permissions
- **Bucket not found**: MinIO creates buckets automatically on first upload

### Development Setup

#### Running Services Locally (Without Docker)

For local development, you can run services individually outside Docker:

**Option 1: Use automated script (Recommended)**
```powershell
.\start-all-services-local.ps1
```
This opens separate PowerShell windows for each service.

**Option 2: Manual setup**

1. **Start database services (Docker)**
   ```powershell
   .\start-local.ps1
   ```
   This starts PostgreSQL and MinIO in Docker.

2. **Start each backend service manually**
   ```powershell
   cd services\auth-service
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 5001 --reload
   ```
   Repeat for each service in separate terminal windows.

3. **Start frontend**
   ```powershell
   cd frontend
   npm install
   npm start
   ```

#### Frontend Development
The frontend runs locally (not in Docker) for better development experience.

```bash
cd frontend
npm install
npm start
```

Or use the provided startup scripts:
- **Windows CMD**: `start-frontend.bat`
- **PowerShell**: `.\start-frontend.ps1`

The frontend will:
- Start on http://localhost:3000
- Connect directly to backend services (ports 5001-5008)
- Automatically handle JWT authentication via axios interceptors
- Hot reload on code changes

**Note**: Update `frontend/.env` or `frontend/src/services/api.js` to configure the API base URL for direct service access.

#### Running Tests
```bash
cd backend
pytest
```

## API Endpoints

Backend services are accessed directly. Each service has its own base URL:

- **Auth Service**: `http://localhost:5001/api/v1`
- **User Service**: `http://localhost:5002/api/v1`
- **Patient Service**: `http://localhost:5003/api/v1`
- **Medical Staff Service**: `http://localhost:5004/api/v1`
- **Medical Image Service**: `http://localhost:5005/api/v1`
- **Diagnostic Report Service**: `http://localhost:5006/api/v1`
- **Billing Service**: `http://localhost:5007/api/v1`
- **Workflow Service**: `http://localhost:5008/api/v1`

### Authentication (auth-service:5001)
- `POST http://localhost:5001/api/v1/auth/register` - Register new user
- `POST http://localhost:5001/api/v1/auth/login` - Login and get JWT token
- `GET http://localhost:5001/api/v1/auth/me` - Get current user info

### Users (user-service:5002, Admin only)
- `GET http://localhost:5002/api/v1/users` - Get all users
- `GET http://localhost:5002/api/v1/users/{id}` - Get user by ID
- `POST http://localhost:5002/api/v1/users` - Create user
- `PUT http://localhost:5002/api/v1/users/{id}` - Update user
- `DELETE http://localhost:5002/api/v1/users/{id}` - Delete user

### Patients (patient-service:5003)
- `GET http://localhost:5003/api/v1/patients` - Get all patients
- `GET http://localhost:5003/api/v1/patients/{id}` - Get patient by ID
- `POST http://localhost:5003/api/v1/patients` - Create patient (Admin only)
- `PUT http://localhost:5003/api/v1/patients/{id}` - Update patient (Admin only)

### Medical Images (medical-image-service:5005)
- `POST http://localhost:5005/api/v1/medical-images/upload` - Upload image (Staff only)
- `GET http://localhost:5005/api/v1/medical-images` - Get all images
- `GET http://localhost:5005/api/v1/medical-images/patient/{id}` - Get patient images

### Diagnostic Reports (diagnostic-report-service:5006)
- `POST http://localhost:5006/api/v1/diagnostic-reports` - Create report (Radiologist/Doctor)
- `GET http://localhost:5006/api/v1/diagnostic-reports/patient/{id}` - Get patient reports
- `POST http://localhost:5006/api/v1/diagnostic-reports/{id}/finalize` - Finalize report

### Billing (billing-service:5007)
- `GET http://localhost:5007/api/v1/billing/bills/patient/{id}` - Get patient bills
- `POST http://localhost:5007/api/v1/billing/payments` - Create payment
- `GET http://localhost:5007/api/v1/billing/summary/patient/{id}` - Get financial summary

## Database Setup

The system uses SQLAlchemy to automatically create tables from models on startup. When you start the services for the first time:

- **Schemas are created automatically** - Each service creates its own database schema
- **Tables are created automatically** - All tables are created from SQLAlchemy models
- **No manual setup required** - The database is ready to use after starting services

**Note**: For new installations, simply start the services and the database will be initialized automatically. No migration scripts or manual setup is needed.

## Role-Based Access Control

The system implements RBAC with the following roles:
- **Admin**: Full system access
- **Patient**: View own records, bills, and reports
- **Radiologist**: Upload images, create reports
- **Doctor**: Upload images, create reports
- **Technician**: Upload images

## Functional Requirements Implementation

✅ Admin can create, update, and delete accounts for patients and medical staff
✅ System generates unique numeric IDs for users
✅ Role-based access control implemented
✅ Medical staff can upload medical images (MRI, CT, X-Ray)
✅ Images are associated with patient records
✅ Radiologists/doctors can view images and generate reports
✅ Workflow steps are time-stamped
✅ System computes total cost per patient diagnosis
✅ System generates patient histories, diagnostic report summaries, workflow summaries, and financial summaries

## License

See LICENSE file for details.