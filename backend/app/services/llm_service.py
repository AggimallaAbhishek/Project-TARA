import ollama
import json
import re
import time
from typing import List, Dict, Any, Tuple
from app.config import get_settings

settings = get_settings()

# Optimized prompt - more concise for faster response
STRIDE_PROMPT = """Analyze this system for security threats using STRIDE. Return JSON only.

System: {system_description}

Return a JSON array with 5 threats. Each threat must have:
- name: short threat name
- description: brief description (1-2 sentences)
- stride_category: one of [Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege]
- affected_component: component name
- risk_level: Low/Medium/High/Critical
- likelihood: 1-5
- impact: 1-5
- mitigation: brief fix (1-2 sentences)

Output ONLY valid JSON array, no other text:"""


class LLMService:
    def __init__(self):
        self.model = settings.ollama_model
    
    async def analyze_system(self, system_description: str) -> Tuple[List[Dict[str, Any]], float]:
        """
        Analyze a system description and return identified threats with timing.
        Returns: (threats, analysis_time_seconds)
        """
        prompt = STRIDE_PROMPT.format(system_description=system_description)
        
        start_time = time.time()
        
        try:
            response = ollama.chat(
                model=self.model,
                messages=[
                    {
                        'role': 'system',
                        'content': 'You are a security expert. Output valid JSON only, no explanations.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                options={
                    'temperature': 0.2,  # Lower for faster, more deterministic output
                    'num_predict': 2048,  # Reduced from 4096 - 5 threats don't need more
                }
            )
            
            elapsed_time = time.time() - start_time
            
            # Extract JSON from response
            response_text = response['message']['content']
            threats = self._parse_response(response_text)
            
            return threats, round(elapsed_time, 2)
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            raise Exception(f"Ollama API error after {elapsed_time:.1f}s: {str(e)}")
    
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
llm_service = LLMService()
