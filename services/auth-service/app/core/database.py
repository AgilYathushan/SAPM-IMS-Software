# Database Configuration and Session Management

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Database Engine Setup
# Add connection pool settings for better reliability in Docker
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=3600,   # Recycle connections after 1 hour
    pool_size=5,         # Number of connections to maintain
    max_overflow=10      # Additional connections allowed
)

# Session Factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base Model Class
Base = declarative_base()

# Database Schema Creation
@event.listens_for(engine, "connect", insert=True)
def create_schemas(dbapi_conn, connection_record):
    # Create database schemas for each microservice
    # This runs on each new connection to ensure schemas exist
    schemas = ["user_service"]
    try:
        with dbapi_conn.cursor() as cur:
            for schema in schemas:
                cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
            dbapi_conn.commit()
    except Exception as e:
        # Log error but don't fail the connection
        # Schema might already exist or connection might be in autocommit mode
        print(f"[Database] Schema creation note: {e}")
        try:
            dbapi_conn.rollback()
        except:
            pass

# Database Session Dependency
def get_db():
    # Dependency function for FastAPI routes
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

