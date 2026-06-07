from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.time import utc_now_for_db


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("user_id", "normalized_name", name="uq_projects_user_normalized_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_for_db, index=True)
    updated_at = Column(
        DateTime,
        default=utc_now_for_db,
        onupdate=utc_now_for_db,
        index=True,
    )

    user = relationship("User", backref="projects")
    analyses = relationship("Analysis", back_populates="project")
