from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class StrideCategory(str, Enum):
    SPOOFING = "Spoofing"
    TAMPERING = "Tampering"
    REPUDIATION = "Repudiation"
    INFORMATION_DISCLOSURE = "Information Disclosure"
    DENIAL_OF_SERVICE = "Denial of Service"
    ELEVATION_OF_PRIVILEGE = "Elevation of Privilege"


# Request Schemas
class AnalysisCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Title for the analysis")
    system_description: str = Field(..., min_length=10, description="Detailed description of the system architecture")


# Threat Schemas
class ThreatBase(BaseModel):
    name: str
    description: str
    stride_category: str
    affected_component: str
    risk_level: str
    likelihood: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    risk_score: float
    mitigation: str


class ThreatResponse(ThreatBase):
    id: int
    analysis_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Analysis Schemas
class AnalysisBase(BaseModel):
    title: str
    system_description: str


class AnalysisResponse(AnalysisBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_risk_score: float
    analysis_time: float = 0.0
    threats: List[ThreatResponse] = []
    
    class Config:
        from_attributes = True


class AnalysisSummary(BaseModel):
    id: int
    title: str
    created_at: datetime
    total_risk_score: float
    threat_count: int
    high_risk_count: int
    analysis_time: float = 0.0
    
    class Config:
        from_attributes = True


class AnalysisRiskSummary(BaseModel):
    analysis_id: int
    title: str
    total_threats: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    average_risk_score: float
    max_risk_score: float
    stride_distribution: dict[str, int]


# LLM Response Schema (for parsing)
class LLMThreatResponse(BaseModel):
    name: str
    description: str
    stride_category: str
    affected_component: str
    risk_level: str
    likelihood: int
    impact: int
    mitigation: str
