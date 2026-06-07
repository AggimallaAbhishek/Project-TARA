from pydantic import BaseModel, ConfigDict, Field, field_validator
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


class DiagramFormat(str, Enum):
    MERMAID = "mermaid"
    PLANTUML = "plantuml"


# Request Schemas
class AnalysisCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Title for the analysis")
    system_description: str = Field(
        ...,
        max_length=5000,
        description="Detailed description of the system architecture"
    )
    project_id: int | None = Field(default=None, ge=1, description="Project to attach this analysis to")
    project_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Optional project name used when project_id is omitted",
    )

    @field_validator("title", "system_description", "project_name")
    @classmethod
    def trim_and_validate_not_blank(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        field_name = info.field_name.replace("_", " ")
        if not cleaned:
            raise ValueError(f"{field_name} cannot be blank")
        if info.field_name == "system_description" and len(cleaned) < 10:
            raise ValueError("system description must be at least 10 characters")
        return cleaned


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
    evidence: list[str] = []
    assumptions: list[str] = []
    confidence: float | None = Field(default=None, ge=0, le=1)
    owasp_tags: list[str] = []
    cwe_tags: list[str] = []

    @field_validator("evidence", "assumptions", "owasp_tags", "cwe_tags", mode="before")
    @classmethod
    def default_list_fields(cls, value):
        return value or []


class ThreatResponse(ThreatBase):
    id: int
    analysis_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Analysis Schemas
class AnalysisBase(BaseModel):
    title: str
    system_description: str


class AnalysisProjectReference(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


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


class VersionComparisonIssue(BaseModel):
    name: str
    stride_category: str
    affected_component: str
    risk_level: str
    risk_score: float


class VersionComparisonResponse(BaseModel):
    current_analysis_id: int
    current_created_at: datetime
    previous_analysis_id: int | None = None
    previous_created_at: datetime | None = None
    has_previous_version: bool
    previous_total_issues: int
    resolved_issues_count: int
    unresolved_issues_count: int
    new_issues_count: int
    resolved_issues: list[VersionComparisonIssue] = []
    unresolved_issues: list[VersionComparisonIssue] = []
    new_issues: list[VersionComparisonIssue] = []


class AnalysisResponse(AnalysisBase):
    id: int
    project_id: int
    project: AnalysisProjectReference | None = None
    created_at: datetime
    total_risk_score: float
    analysis_time: float = 0.0
    diagram_format: DiagramFormat | None = None
    diagram_code: str | None = None
    has_diagram: bool = False
    source_type: str = "text"
    source_metadata: dict | None = None
    structured_context: dict | None = None
    quality_warnings: list[str] = []
    threats: list[ThreatResponse] = []
    risk_summary: AnalysisRiskSummary | None = None
    version_comparison: VersionComparisonResponse | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("source_metadata", "structured_context", mode="before")
    @classmethod
    def default_dict_fields(cls, value):
        return value or {}

    @field_validator("quality_warnings", mode="before")
    @classmethod
    def default_quality_warnings(cls, value):
        return value or []


class DocumentAnalysisResponse(BaseModel):
    analysis: AnalysisResponse
    version_comparison: VersionComparisonResponse


class AnalysisSummary(BaseModel):
    id: int
    project_id: int
    project: AnalysisProjectReference | None = None
    title: str
    created_at: datetime
    total_risk_score: float
    threat_count: int
    high_risk_count: int
    analysis_time: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class AnalysisListResponse(BaseModel):
    items: list[AnalysisSummary]
    total: int
    skip: int
    limit: int
    has_more: bool


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
    evidence: list[str] = []
    assumptions: list[str] = []
    confidence: float | None = Field(default=None, ge=0, le=1)
    owasp_tags: list[str] = []
    cwe_tags: list[str] = []


class AnalysisJobResponse(BaseModel):
    job_id: str
    status: str
    stage: str
    progress_percent: float
    analysis_id: int | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModelStatus(BaseModel):
    configured: bool
    available: bool
    model: str | None = None
    error: str | None = None


class ModelReadinessResponse(BaseModel):
    status: str
    text: ModelStatus
    vision: ModelStatus
    checked_at: datetime
