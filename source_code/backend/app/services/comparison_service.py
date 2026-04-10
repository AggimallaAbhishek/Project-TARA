import logging
from typing import Any

from sqlalchemy.orm import Session, selectinload

from app.models.analysis import Analysis, Threat

logger = logging.getLogger(__name__)


class ComparisonService:
    """Compare threats across multiple analyses."""

    def compare_analyses(
        self,
        db: Session,
        *,
        analysis_ids: list[int],
        user_id: int,
    ) -> dict[str, Any]:
        analyses = (
            db.query(Analysis)
            .options(selectinload(Analysis.threats))
            .filter(Analysis.id.in_(analysis_ids), Analysis.user_id == user_id)
            .all()
        )

        found_ids = {a.id for a in analyses}
        missing = [aid for aid in analysis_ids if aid not in found_ids]
        if missing:
            raise ValueError(f"Analyses not found or not owned by user: {missing}")

        stride_categories = [
            "Spoofing",
            "Tampering",
            "Repudiation",
            "Information Disclosure",
            "Denial of Service",
            "Elevation of Privilege",
        ]

        # Build per-analysis summaries
        analysis_summaries = []
        for analysis in analyses:
            threats_by_stride: dict[str, list[dict]] = {cat: [] for cat in stride_categories}
            for threat in analysis.threats:
                cat = threat.stride_category
                if cat in threats_by_stride:
                    threats_by_stride[cat].append(
                        {
                            "id": threat.id,
                            "name": threat.name,
                            "description": threat.description,
                            "risk_level": threat.risk_level,
                            "risk_score": threat.risk_score,
                            "likelihood": threat.likelihood,
                            "impact": threat.impact,
                            "affected_component": threat.affected_component,
                            "mitigation": threat.mitigation,
                        }
                    )

            risk_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
            for threat in analysis.threats:
                if threat.risk_level in risk_counts:
                    risk_counts[threat.risk_level] += 1

            stride_counts = {cat: 0 for cat in stride_categories}
            for threat in analysis.threats:
                if threat.stride_category in stride_counts:
                    stride_counts[threat.stride_category] += 1

            scores = [t.risk_score for t in analysis.threats]
            analysis_summaries.append(
                {
                    "id": analysis.id,
                    "title": analysis.title,
                    "created_at": analysis.created_at.isoformat(),
                    "total_risk_score": analysis.total_risk_score,
                    "threat_count": len(analysis.threats),
                    "average_risk_score": round(sum(scores) / len(scores), 2)
                    if scores
                    else 0.0,
                    "max_risk_score": max(scores) if scores else 0.0,
                    "risk_distribution": risk_counts,
                    "stride_distribution": stride_counts,
                    "threats_by_stride": threats_by_stride,
                }
            )

        # Cross-analysis metrics
        all_components = set()
        all_threat_names = set()
        for analysis in analyses:
            for threat in analysis.threats:
                all_components.add(threat.affected_component.lower().strip())
                all_threat_names.add(threat.name.lower().strip())

        # Shared threats: threats with the same name appearing in multiple analyses
        threat_name_counts: dict[str, int] = {}
        for analysis in analyses:
            seen_names = set()
            for threat in analysis.threats:
                name_key = threat.name.lower().strip()
                if name_key not in seen_names:
                    seen_names.add(name_key)
                    threat_name_counts[name_key] = threat_name_counts.get(name_key, 0) + 1

        common_threats = [name for name, count in threat_name_counts.items() if count > 1]
        unique_threats_per_analysis: dict[int, list[str]] = {}
        for analysis in analyses:
            unique = []
            for threat in analysis.threats:
                name_key = threat.name.lower().strip()
                if threat_name_counts.get(name_key, 0) == 1:
                    unique.append(threat.name)
            unique_threats_per_analysis[analysis.id] = unique

        # Risk trend (sorted by created_at)
        sorted_analyses = sorted(analyses, key=lambda a: a.created_at)
        risk_trend = [
            {
                "analysis_id": a.id,
                "title": a.title,
                "created_at": a.created_at.isoformat(),
                "total_risk_score": a.total_risk_score,
            }
            for a in sorted_analyses
        ]

        return {
            "analyses": analysis_summaries,
            "cross_analysis": {
                "total_unique_components": len(all_components),
                "total_unique_threat_names": len(all_threat_names),
                "common_threats": common_threats,
                "unique_threats_per_analysis": unique_threats_per_analysis,
                "risk_trend": risk_trend,
            },
        }


comparison_service = ComparisonService()
