from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

@event.listens_for(engine, "connect", insert=True)
def create_schemas(dbapi_conn, connection_record):
    schemas = ["user_service"]
    with dbapi_conn.cursor() as cur:
        for schema in schemas:
            cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
        dbapi_conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

