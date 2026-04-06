import google.generativeai as genai
import json
import re
from typing import List, Dict, Any
from app.config import get_settings

settings = get_settings()

# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)

STRIDE_PROMPT = """You are a cybersecurity expert performing threat analysis using the STRIDE methodology.

STRIDE Categories:
- Spoofing: Pretending to be someone/something else
- Tampering: Modifying data or code
- Repudiation: Denying actions performed
- Information Disclosure: Exposing information to unauthorized users
- Denial of Service: Making system unavailable
- Elevation of Privilege: Gaining unauthorized access levels

Analyze the following system and identify potential security threats.

SYSTEM DESCRIPTION:
{system_description}

For each threat identified, provide:
1. A clear threat name
2. Detailed description of the threat
3. STRIDE category (exactly one of: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
4. Affected component in the system
5. Risk level (Low, Medium, High, or Critical)
6. Likelihood score (1-5, where 1=rare, 5=almost certain)
7. Impact score (1-5, where 1=minimal, 5=catastrophic)
8. Specific mitigation recommendation

IMPORTANT: Return ONLY a valid JSON array with the following structure, no additional text:
[
  {{
    "name": "Threat Name",
    "description": "Detailed description",
    "stride_category": "STRIDE Category",
    "affected_component": "Component Name",
    "risk_level": "High",
    "likelihood": 4,
    "impact": 5,
    "mitigation": "Specific mitigation steps"
  }}
]

Identify at least 5-8 relevant threats. Be specific to the system described."""


class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    async def analyze_system(self, system_description: str) -> List[Dict[str, Any]]:
        """
        Analyze a system description and return identified threats.
        """
        prompt = STRIDE_PROMPT.format(system_description=system_description)
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,  # Lower temperature for consistent output
                    max_output_tokens=4096,
                )
            )
            
            # Extract JSON from response
            threats = self._parse_response(response.text)
            return threats
            
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")
    
    def _parse_response(self, response_text: str) -> List[Dict[str, Any]]:
        """
        Parse the LLM response and extract threat data.
        """
        # Try to find JSON array in the response
        json_match = re.search(r'\[[\s\S]*\]', response_text)
        
        if not json_match:
            raise ValueError("Could not find valid JSON in LLM response")
        
        json_str = json_match.group()
        
        try:
            threats = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in response: {str(e)}")
        
        # Validate and normalize each threat
        validated_threats = []
        for threat in threats:
            validated = self._validate_threat(threat)
            if validated:
                validated_threats.append(validated)
        
        return validated_threats
    
    def _validate_threat(self, threat: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and normalize a threat object.
        """
        required_fields = ['name', 'description', 'stride_category', 'affected_component', 
                          'risk_level', 'likelihood', 'impact', 'mitigation']
        
        # Check required fields
        for field in required_fields:
            if field not in threat:
                return None
        
        # Normalize STRIDE category
        valid_categories = ['Spoofing', 'Tampering', 'Repudiation', 
                          'Information Disclosure', 'Denial of Service', 
                          'Elevation of Privilege']
        
        stride = threat['stride_category']
        if stride not in valid_categories:
            # Try to match partial
            for cat in valid_categories:
                if cat.lower() in stride.lower() or stride.lower() in cat.lower():
                    threat['stride_category'] = cat
                    break
        
        # Normalize risk level
        valid_risks = ['Low', 'Medium', 'High', 'Critical']
        risk = threat['risk_level']
        if risk not in valid_risks:
            risk_lower = risk.lower()
            for r in valid_risks:
                if r.lower() in risk_lower:
                    threat['risk_level'] = r
                    break
        
        # Ensure likelihood and impact are integers in range
        threat['likelihood'] = max(1, min(5, int(threat.get('likelihood', 3))))
        threat['impact'] = max(1, min(5, int(threat.get('impact', 3))))
        
        return threat


# Singleton instance
gemini_service = GeminiService()
