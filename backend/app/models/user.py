from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base
from app.utils.time import utc_now_for_db


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    picture = Column(String(500), nullable=True)
    google_id = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=utc_now_for_db)
    last_login = Column(DateTime, default=utc_now_for_db, onupdate=utc_now_for_db)
