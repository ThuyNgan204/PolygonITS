from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import config

SQLALCHEMY_DATABASE_URL = config.DB_CONNECTION_STRING
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    """Yields a database session."""
    try:
        db = SessionLocal()
        yield db
    except Exception as e:
        # Handle or log the exception as needed
        raise e
    finally:
        db.close()
