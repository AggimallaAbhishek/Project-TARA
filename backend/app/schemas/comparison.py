from pydantic import BaseModel, Field
from typing import Any


class ComparisonRequest(BaseModel):
    analysis_ids: list[int] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="List of analysis IDs to compare (2-5)",
    )


class ThreatDetail(BaseModel):
    id: int
    name: str
    description: str
    risk_level: str
    risk_score: float
    likelihood: int
    impact: int
    affected_component: str
    mitigation: str


class AnalysisComparisonSummary(BaseModel):
    id: int
    title: str
    created_at: str
    total_risk_score: float
    threat_count: int
    average_risk_score: float
    max_risk_score: float
    risk_distribution: dict[str, int]
    stride_distribution: dict[str, int]
    threats_by_stride: dict[str, list[ThreatDetail]]


class CrossAnalysisMetrics(BaseModel):
    total_unique_components: int
    total_unique_threat_names: int
    common_threats: list[str]
    unique_threats_per_analysis: dict[int, list[str]]
    risk_trend: list[dict[str, Any]]


class ComparisonResponse(BaseModel):
    analyses: list[AnalysisComparisonSummary]
    cross_analysis: CrossAnalysisMetrics
