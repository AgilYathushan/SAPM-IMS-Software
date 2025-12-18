# Workflow Service - Main FastAPI Application Entry Point
# Handles workflow logging for all system actions

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import NoReferencedTableError
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import router
# Import models to register them with Base.metadata
from app.models import WorkflowLog

# Create tables individually to handle foreign key issues gracefully
try:
    # Create WorkflowLog table
    WorkflowLog.__table__.create(bind=engine, checkfirst=True)
    
    # Database migration - remove description, add entity_type
    from sqlalchemy import text
    with engine.begin() as conn:  # Use begin() for automatic transaction management
        # Remove description column if it exists
        try:
            conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_schema = 'workflow_service' 
                        AND table_name = 'workflow_logs' 
                        AND column_name = 'description'
                    ) THEN
                        ALTER TABLE workflow_service.workflow_logs DROP COLUMN description;
                    END IF;
                END $$;
            """))
            print("Removed 'description' column from workflow_logs table")
        except Exception as e:
            print(f"Warning removing description column: {e}")
        
        # Add entity_type column if it doesn't exist
        try:
            conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_schema = 'workflow_service' 
                        AND table_name = 'workflow_logs' 
                        AND column_name = 'entity_type'
                    ) THEN
                        CREATE TYPE workflow_service.entity_type_enum AS ENUM ('USER', 'PATIENT', 'REPORT', 'BILL', 'MEDICAL_TEST', 'IMAGE', 'NONE');
                        ALTER TABLE workflow_service.workflow_logs ADD COLUMN entity_type workflow_service.entity_type_enum;
                    END IF;
                END $$;
            """))
            print("Checked/Added 'entity_type' column to workflow_logs table")
        except Exception as e:
            # If enum type already exists, just add the column
            try:
                conn.execute(text("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = 'workflow_service' 
                            AND table_name = 'workflow_logs' 
                            AND column_name = 'entity_type'
                        ) THEN
                            ALTER TABLE workflow_service.workflow_logs ADD COLUMN entity_type workflow_service.entity_type_enum;
                        END IF;
                    END $$;
                """))
                print("Added 'entity_type' column to workflow_logs table")
            except Exception as e2:
                print(f"Warning adding entity_type column: {e2}")
        
        # Ensure relevant_id column exists
        try:
            conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_schema = 'workflow_service' 
                        AND table_name = 'workflow_logs' 
                        AND column_name = 'relevant_id'
                    ) THEN
                        ALTER TABLE workflow_service.workflow_logs ADD COLUMN relevant_id INTEGER;
                    END IF;
                END $$;
            """))
            print("Checked 'relevant_id' column in workflow_logs table")
        except Exception as e:
            print(f"Warning checking relevant_id column: {e}")
        
        # Remove report_id column if it exists (old column)
        try:
            conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_schema = 'workflow_service' 
                        AND table_name = 'workflow_logs' 
                        AND column_name = 'report_id'
                    ) THEN
                        ALTER TABLE workflow_service.workflow_logs DROP COLUMN report_id;
                    END IF;
                END $$;
            """))
            print("Checked/Removed old 'report_id' column from workflow_logs table")
        except Exception as e:
            print(f"Warning removing report_id column: {e}")
                
except Exception as e:
    print(f"Warning creating/updating WorkflowLog table: {e}")
    import traceback
    print(traceback.format_exc())

app = FastAPI(
    title="Workflow Service API",
    description="Workflow Tracking Service for IMS",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {"service": "workflow-service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "workflow-service"}

