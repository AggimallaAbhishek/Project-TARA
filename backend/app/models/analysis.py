from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    system_description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    total_risk_score = Column(Float, default=0.0)
    analysis_time = Column(Float, default=0.0)  # Time in seconds
    
    # Relationships
    user = relationship("User", backref="analyses")
    threats = relationship("Threat", back_populates="analysis", cascade="all, delete-orphan")


class Threat(Base):
    __tablename__ = "threats"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    stride_category = Column(String(50), nullable=False)
    affected_component = Column(String(255), nullable=False)
    
    # Risk assessment
    risk_level = Column(String(20), nullable=False)
    likelihood = Column(Integer, default=1)  # 1-5 scale
    impact = Column(Integer, default=1)       # 1-5 scale
    risk_score = Column(Float, default=0.0)   # likelihood * impact
    
    # Mitigation
    mitigation = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    analysis = relationship("Analysis", back_populates="threats")
