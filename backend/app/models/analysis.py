from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class RiskLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class StrideCategory(str, enum.Enum):
    SPOOFING = "Spoofing"
    TAMPERING = "Tampering"
    REPUDIATION = "Repudiation"
    INFORMATION_DISCLOSURE = "Information Disclosure"
    DENIAL_OF_SERVICE = "Denial of Service"
    ELEVATION_OF_PRIVILEGE = "Elevation of Privilege"


class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    system_description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    total_risk_score = Column(Float, default=0.0)
    analysis_time = Column(Float, default=0.0)  # Time in seconds
    
    # Relationships
    user = relationship("User", backref="analyses")
    threats = relationship("Threat", back_populates="analysis", cascade="all, delete-orphan")


class Threat(Base):
    __tablename__ = "threats"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    
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
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    analysis = relationship("Analysis", back_populates="threats")
