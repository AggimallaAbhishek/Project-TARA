"""
Test suite for Ollama prompt optimization and threat validation.

Tests:
1. Prompt generation with examples
2. Evidence enforcement
3. Confidence threshold
4. Generic threat rejection
5. Threat deduplication
"""

import json
import pytest
from app.services.llm_internal.prompting import (
    build_stride_prompt,
    _build_stride_examples,
    estimate_target_threat_count,
)
from app.services.llm_internal.parsing import (
    validate_threat,
    parse_llm_response,
    deduplicate_threats,
)
import logging

logger = logging.getLogger(__name__)


class TestPromptGeneration:
    """Test prompt template and example generation."""

    def test_stride_examples_generated(self):
        """Verify examples are generated with good and bad threat patterns."""
        examples = _build_stride_examples()
        assert "EXAMPLE GOOD THREAT" in examples
        assert "EXAMPLES OF BAD THREATS" in examples
        assert "Unauthenticated API Access" in examples

    def test_prompt_includes_examples(self):
        """Verify final prompt includes examples section."""
        prompt = build_stride_prompt(
            system_description="A web app with API and database",
            source_context={
                "source_type": "text",
                "source_metadata": {},
                "structured_context": {},
            },
        )
        assert "EXAMPLE GOOD THREAT" in prompt
        assert "EVIDENCE REQUIREMENT" in prompt
        assert "CONFIDENCE SCORING" in prompt
        assert "confidence=0.9" in prompt
        assert "confidence=0.7" in prompt
        assert "confidence<0.5: Reject" in prompt

    def test_prompt_includes_rules(self):
        """Verify prompt includes explicit threat quality rules."""
        prompt = build_stride_prompt(
            system_description="Simple system",
            source_context={
                "source_type": "text",
                "source_metadata": {},
                "structured_context": {},
            },
        )
        assert "THREAT ANALYSIS RULES" in prompt
        assert "EVIDENCE REQUIREMENT (MANDATORY)" in prompt
        assert "AFFECTED COMPONENT GROUNDING" in prompt
        assert "THREAT QUALITY CHECKS" in prompt


class TestThreatValidation:
    """Test threat validation with enhanced rules."""

    def test_threat_with_valid_evidence(self):
        """Validate threat with 2+ evidence points is accepted."""
        threat = {
            "name": "Unencrypted Data Transfer",
            "stride_category": "Information Disclosure",
            "affected_component": "API Gateway",
            "description": "Data transmitted without TLS encryption",
            "evidence": [
                "API uses HTTP instead of HTTPS",
                "No encryption mentioned for data in transit",
            ],
            "confidence": 0.9,
            "likelihood": 4,
            "impact": 5,
            "mitigation": "1. Enable HTTPS. 2. Enforce TLS 1.2+.", "evidence": ["Point 1", "Point 2"], "confidence": 0.9,
            "assumptions": [],
            "owasp_tags": [],
            "cwe_tags": [],
        }
        result = validate_threat(threat, logger)
        assert result is not None
        assert result["name"] == "Unencrypted Data Transfer"
        assert len(result["evidence"]) == 2

    def test_threat_rejected_without_evidence(self):
        """Validate threat without evidence is rejected."""
        threat = {
            "name": "Potential Security Issue",
            "stride_category": "Information Disclosure",
            "affected_component": "API",
            "description": "Some security issue",
            "evidence": [],
            "confidence": 0.8,
            "likelihood": 3,
            "impact": 3,
            "mitigation": "Fix it", "evidence": ["Point 1", "Point 2"], "confidence": 0.9,
            "assumptions": [],
            "owasp_tags": [],
            "cwe_tags": [],
        }
        result = validate_threat(threat, logger)
        assert result is None

    def test_threat_rejected_with_single_evidence(self):
        """Validate threat with only 1 evidence point is rejected."""
        threat = {
            "name": "Missing Authentication",
            "stride_category": "Spoofing",
            "affected_component": "Database",
            "description": "Database lacks authentication",
            "evidence": ["No auth mentioned"],
            "confidence": 0.85,
            "likelihood": 4,
            "impact": 5,
            "mitigation": "Enable DB authentication", "evidence": ["Point 1", "Point 2"], "confidence": 0.9,
            "assumptions": [],
            "owasp_tags": [],
            "cwe_tags": [],
        }
        result = validate_threat(threat, logger)
        assert result is None

    def test_threat_rejected_below_confidence_threshold(self):
        """Validate threat with confidence <0.5 is rejected."""
        threat = {
            "name": "Hypothetical Data Breach",
            "stride_category": "Information Disclosure",
            "affected_component": "Storage Service",
            "description": "Data might be breached",
            "evidence": [
                "System stores data",
                "Data exists somewhere",
            ],
            "confidence": 0.3,
            "likelihood": 2,
            "impact": 4,
            "mitigation": "Implement security", "evidence": ["Point 1", "Point 2"], "confidence": 0.9,
            "assumptions": [],
            "owasp_tags": [],
            "cwe_tags": [],
        }
        result = validate_threat(threat, logger)
        assert result is None

    def test_threat_rejected_with_generic_component(self):
        """Validate threat with generic component name is rejected."""
        threat = {
            "name": "Unauthorized Access",
            "stride_category": "Spoofing",
            "affected_component": "System",
            "description": "Unauthorized access possible",
            "evidence": [
                "Authentication not explicitly mentioned",
                "No access control documented",
            ],
            "confidence": 0.7,
            "likelihood": 3,
            "impact": 4,
            "mitigation": "Add authentication", "evidence": ["Point 1", "Point 2"], "confidence": 0.9,
            "assumptions": [],
            "owasp_tags": [],
            "cwe_tags": [],
        }
        result = validate_threat(threat, logger)
        assert result is None

    def test_threat_rejected_with_generic_evidence(self):
        """Validate threat with overly generic evidence is rejected."""
        threat = {
            "name": "Data Exposure",
            "stride_category": "Information Disclosure",
            "affected_component": "Web Service",
            "description": "User data could be exposed",
            "evidence": [
                "Data",
                "System information",
            ],
            "confidence": 0.8,
            "likelihood": 3,
            "impact": 5,
            "mitigation": "Protect data", "evidence": ["Point 1", "Point 2"], "confidence": 0.9,
            "assumptions": [],
            "owasp_tags": [],
            "cwe_tags": [],
        }
        result = validate_threat(threat, logger)
        assert result is None

    def test_threat_accepted_at_minimum_confidence(self):
        """Validate threat at exactly 0.5 confidence is accepted."""
        threat = {
            "name": "Potential DoS on Message Queue",
            "stride_category": "Denial of Service",
            "affected_component": "Message Queue",
            "description": "Queue could be overwhelmed",
            "evidence": [
                "RabbitMQ used for async processing",
                "No rate limiting mentioned for queue consumers",
            ],
            "confidence": 0.5,
            "likelihood": 3,
            "impact": 3,
            "mitigation": "1. Add rate limiting. 2. Monitor queue depth.", "evidence": ["Point 1", "Point 2"], "confidence": 0.9,
            "assumptions": ["Attackers can send messages to queue"],
            "owasp_tags": [],
            "cwe_tags": [],
        }
        result = validate_threat(threat, logger)
        assert result is not None


class TestTargetThreatCount:
    """Test threat count estimation based on input size."""

    def test_small_system(self):
        """Small system description should estimate 6 threats."""
        count = estimate_target_threat_count("Simple API")
        assert count == 6

    def test_medium_system(self):
        """Medium description should estimate 10 threats."""
        text = "A web application with React frontend, Node.js backend, PostgreSQL database" * 3
        count = estimate_target_threat_count(text)
        assert count == 10

    def test_large_system(self):
        """Large description should estimate 14+ threats."""
        text = "Microservices architecture with API Gateway, Auth Service, User Service, Product Service, Order Service, Payment Service, all using PostgreSQL, Redis cache, RabbitMQ, deployed on Kubernetes" * 3
        count = estimate_target_threat_count(text)
        assert count >= 14


class TestDeduplication:
    """Test threat deduplication logic."""

    def test_deduplicate_identical_threats(self):
        """Verify identical threats are deduplicated."""
        threats = [
            {
                "name": "SQL Injection",
                "stride_category": "Tampering",
                "affected_component": "API",
                "description": "SQL injection vulnerability",
            },
            {
                "name": "SQL Injection",
                "stride_category": "Tampering",
                "affected_component": "API",
                "description": "SQL injection vulnerability",
            },
        ]
        result = deduplicate_threats(threats, logger)
        assert len(result) == 1

    def test_keep_distinct_threats(self):
        """Verify distinct threats are kept."""
        threats = [
            {
                "name": "SQL Injection",
                "stride_category": "Tampering",
                "affected_component": "API",
                "description": "SQL injection",
            },
            {
                "name": "XSS Attack",
                "stride_category": "Tampering",
                "affected_component": "Frontend",
                "description": "XSS vulnerability",
            },
        ]
        result = deduplicate_threats(threats, logger)
        assert len(result) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
