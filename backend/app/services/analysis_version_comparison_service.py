import logging
import re

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import Analysis, Threat

logger = logging.getLogger(__name__)


class AnalysisVersionComparisonService:
    @staticmethod
    def _normalize_text(value: str) -> str:
        return re.sub(r"\s+", " ", value).strip().lower()

    def _build_signature(self, threat: Threat) -> str:
        name_key = self._normalize_text(threat.name or "")
        stride_key = self._normalize_text(threat.stride_category or "")
        component_key = self._normalize_text(threat.affected_component or "")
        return f"{name_key}|{stride_key}|{component_key}"

    @staticmethod
    def _to_issue_payload(threat: Threat) -> dict[str, str | float]:
        return {
            "name": threat.name,
            "stride_category": threat.stride_category,
            "affected_component": threat.affected_component,
            "risk_level": threat.risk_level,
            "risk_score": threat.risk_score,
        }

    def _build_issue_lookup(self, threats: list[Threat]) -> dict[str, Threat]:
        lookup: dict[str, Threat] = {}
        for threat in threats:
            signature = self._build_signature(threat)
            existing = lookup.get(signature)
            if existing is None or threat.risk_score > existing.risk_score:
                lookup[signature] = threat
        return lookup

    @staticmethod
    def _sort_issues(issues: list[dict[str, str | float]]) -> list[dict[str, str | float]]:
        return sorted(
            issues,
            key=lambda issue: (
                -float(issue["risk_score"]),
                str(issue["name"]).lower(),
            ),
        )

    def _find_previous_version(
        self,
        db: Session,
        *,
        current_analysis: Analysis,
        normalized_title: str,
    ) -> Analysis | None:
        return (
            db.query(Analysis)
            .options(selectinload(Analysis.threats))
            .filter(
                Analysis.user_id == current_analysis.user_id,
                Analysis.id != current_analysis.id,
                func.lower(func.trim(Analysis.title)) == normalized_title,
                or_(
                    Analysis.created_at < current_analysis.created_at,
                    and_(
                        Analysis.created_at == current_analysis.created_at,
                        Analysis.id < current_analysis.id,
                    ),
                ),
            )
            .order_by(Analysis.created_at.desc(), Analysis.id.desc())
            .first()
        )

    def get_version_comparison(
        self,
        db: Session,
        *,
        analysis_id: int,
        user_id: int,
    ) -> dict:
        current_analysis = (
            db.query(Analysis)
            .options(selectinload(Analysis.threats))
            .filter(Analysis.id == analysis_id, Analysis.user_id == user_id)
            .first()
        )
        if not current_analysis:
            raise ValueError(f"Analysis with id {analysis_id} not found")
        return self.build_version_comparison(db, current_analysis=current_analysis)

    def build_version_comparison(self, db: Session, *, current_analysis: Analysis) -> dict:
        normalized_title = self._normalize_text(current_analysis.title or "")
        logger.info(
            "Version comparison start analysis_id=%s user_id=%s title_key=%s",
            current_analysis.id,
            current_analysis.user_id,
            normalized_title,
        )

        current_lookup = self._build_issue_lookup(list(current_analysis.threats or []))
        previous_analysis = self._find_previous_version(
            db,
            current_analysis=current_analysis,
            normalized_title=normalized_title,
        )

        if not previous_analysis:
            new_issues = self._sort_issues(
                [self._to_issue_payload(threat) for threat in current_lookup.values()]
            )
            result = {
                "current_analysis_id": current_analysis.id,
                "current_created_at": current_analysis.created_at,
                "previous_analysis_id": None,
                "previous_created_at": None,
                "has_previous_version": False,
                "previous_total_issues": 0,
                "resolved_issues_count": 0,
                "unresolved_issues_count": 0,
                "new_issues_count": len(new_issues),
                "resolved_issues": [],
                "unresolved_issues": [],
                "new_issues": new_issues,
            }
            logger.info(
                "Version comparison complete analysis_id=%s has_previous=false new=%s",
                current_analysis.id,
                result["new_issues_count"],
            )
            return result

        previous_lookup = self._build_issue_lookup(list(previous_analysis.threats or []))
        previous_keys = set(previous_lookup.keys())
        current_keys = set(current_lookup.keys())

        resolved_keys = previous_keys - current_keys
        unresolved_keys = previous_keys & current_keys
        new_keys = current_keys - previous_keys

        resolved_issues = self._sort_issues(
            [self._to_issue_payload(previous_lookup[key]) for key in resolved_keys]
        )
        unresolved_issues = self._sort_issues(
            [self._to_issue_payload(current_lookup[key]) for key in unresolved_keys]
        )
        new_issues = self._sort_issues(
            [self._to_issue_payload(current_lookup[key]) for key in new_keys]
        )

        result = {
            "current_analysis_id": current_analysis.id,
            "current_created_at": current_analysis.created_at,
            "previous_analysis_id": previous_analysis.id,
            "previous_created_at": previous_analysis.created_at,
            "has_previous_version": True,
            "previous_total_issues": len(previous_lookup),
            "resolved_issues_count": len(resolved_issues),
            "unresolved_issues_count": len(unresolved_issues),
            "new_issues_count": len(new_issues),
            "resolved_issues": resolved_issues,
            "unresolved_issues": unresolved_issues,
            "new_issues": new_issues,
        }
        logger.info(
            "Version comparison complete analysis_id=%s previous_id=%s previous_total=%s resolved=%s unresolved=%s new=%s",
            current_analysis.id,
            previous_analysis.id,
            result["previous_total_issues"],
            result["resolved_issues_count"],
            result["unresolved_issues_count"],
            result["new_issues_count"],
        )
        return result


analysis_version_comparison_service = AnalysisVersionComparisonService()
