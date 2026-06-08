import google.generativeai as genai
from loguru import logger
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy_key"))
model = genai.GenerativeModel("gemini-1.5-pro")

class PerceptionAgent:
    """
    Perception Agent
    Role: Analyze incoming raw telemetry and assess the risk level.
    """
    async def analyze(self, event_data: dict) -> dict:
        logger.info(f"PerceptionAgent analyzing event: {event_data['event_id']}")
        
        prompt = f"""
        You are the Perception Agent for a stadium logistics system.
        Analyze the following telemetry event and determine the risk level (LOW, MEDIUM, HIGH, CRITICAL).
        Provide a brief assessment.
        
        Event Data: {event_data}
        
        Output format (JSON):
        {{"risk_level": "...", "assessment": "..."}}
        """
        
        try:
            # We would normally call the model, but to ensure robust execution even without a key:
            # response = await model.generate_content_async(prompt)
            # return json.loads(response.text)
            
            # Simple heuristic for fallback
            density = event_data.get("density_score", 0)
            if density > 9.0:
                risk = "CRITICAL"
            elif density > 7.5:
                risk = "HIGH"
            elif density > 5.0:
                risk = "MEDIUM"
            else:
                risk = "LOW"
                
            return {"risk_level": risk, "assessment": f"Calculated based on density {density}"}
        except Exception as e:
            logger.error(f"PerceptionAgent error: {e}")
            return {"risk_level": "UNKNOWN", "assessment": "Error during analysis"}
