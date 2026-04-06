from typing import List, Dict, Any


class RiskScoringService:
    """
    Service for calculating and managing risk scores.
    
    Risk Score = Likelihood × Impact
    
    Likelihood (1-5): How likely is the threat to occur?
    Impact (1-5): How severe would the impact be?
    
    Risk Score ranges:
    - 1-4: Low risk
    - 5-9: Medium risk  
    - 10-15: High risk
    - 16-25: Critical risk
    """
    
    RISK_THRESHOLDS = {
        'Low': (1, 4),
        'Medium': (5, 9),
        'High': (10, 15),
        'Critical': (16, 25)
    }
    
    @staticmethod
    def calculate_risk_score(likelihood: int, impact: int) -> float:
        """Calculate risk score from likelihood and impact."""
        return float(likelihood * impact)
    
    @staticmethod
    def get_risk_level_from_score(score: float) -> str:
        """Determine risk level based on calculated score."""
        if score <= 4:
            return 'Low'
        elif score <= 9:
            return 'Medium'
        elif score <= 15:
            return 'High'
        else:
            return 'Critical'
    
    @staticmethod
    def calculate_total_risk_score(threats: List[Dict[str, Any]]) -> float:
        """
        Calculate aggregate risk score for all threats.
        Uses weighted average based on individual risk scores.
        """
        if not threats:
            return 0.0
        
        total_score = sum(t.get('risk_score', 0) for t in threats)
        return round(total_score / len(threats), 2)
    
    @staticmethod
    def prioritize_threats(threats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort threats by risk score in descending order."""
        return sorted(threats, key=lambda x: x.get('risk_score', 0), reverse=True)
    
    @staticmethod
    def get_risk_summary(threats: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate a summary of risk distribution."""
        summary = {
            'total_threats': len(threats),
            'critical_count': 0,
            'high_count': 0,
            'medium_count': 0,
            'low_count': 0,
            'average_risk_score': 0.0,
            'max_risk_score': 0.0,
            'stride_distribution': {}
        }
        
        if not threats:
            return summary
        
        scores = []
        for threat in threats:
            risk_level = threat.get('risk_level', 'Low')
            score = threat.get('risk_score', 0)
            stride = threat.get('stride_category', 'Unknown')
            
            scores.append(score)
            
            # Count by risk level
            if risk_level == 'Critical':
                summary['critical_count'] += 1
            elif risk_level == 'High':
                summary['high_count'] += 1
            elif risk_level == 'Medium':
                summary['medium_count'] += 1
            else:
                summary['low_count'] += 1
            
            # Count by STRIDE category
            summary['stride_distribution'][stride] = summary['stride_distribution'].get(stride, 0) + 1
        
        summary['average_risk_score'] = round(sum(scores) / len(scores), 2)
        summary['max_risk_score'] = max(scores)
        
        return summary


# Singleton instance
risk_service = RiskScoringService()
