from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    system_description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    total_risk_score = Column(Float, default=0.0)
    analysis_time = Column(Float, default=0.0)  # Time in seconds
    diagram_format = Column(String(32), nullable=True)
    diagram_code = Column(Text, nullable=True)
    source_type = Column(String(64), nullable=False, default="text")
    source_metadata = Column(JSON, nullable=True)
    structured_context = Column(JSON, nullable=True)
    quality_warnings = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship("User", backref="analyses")
    project = relationship("Project", back_populates="analyses")
    threats = relationship("Threat", back_populates="analysis", cascade="all, delete-orphan")

    @property
    def has_diagram(self) -> bool:
        return bool(self.diagram_format and self.diagram_code)


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
    evidence = Column(JSON, nullable=True)
    assumptions = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    owasp_tags = Column(JSON, nullable=True)
    cwe_tags = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    analysis = relationship("Analysis", back_populates="threats")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="queued", index=True)
    stage = Column(String(64), nullable=False, default="queued")
    progress_percent = Column(Float, nullable=False, default=0.0)
    source_type = Column(String(64), nullable=False, default="text")
    payload = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    staged_file_path = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        index=True,
    )

    user = relationship("User", backref="analysis_jobs")
    analysis = relationship("Analysis", backref="jobs")
