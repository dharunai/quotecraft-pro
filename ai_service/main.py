from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import ml_model

app = FastAPI(
    title="QuoteCraft AI Insights Engine",
    description="Open-source AI/ML microservice for CRM predictions and forecasting",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────

class InsightsPayload(BaseModel):
    deals: List[Dict[str, Any]] = []
    leads: List[Dict[str, Any]] = []
    tasks: List[Dict[str, Any]] = []

class LeadItem(BaseModel):
    id: Optional[str] = None
    lead_source: Optional[str] = "other"
    company_size: Optional[str] = "small"
    lead_activity_count: Optional[int] = 0
    response_time: Optional[float] = 1.0

class LeadScorePayload(BaseModel):
    leads: List[LeadItem]

class DealItem(BaseModel):
    id: Optional[str] = None
    deal_value: Optional[float] = 0
    pipeline_stage: Optional[str] = "new"
    days_in_stage: Optional[int] = 0
    interaction_count: Optional[int] = 5

class DealWinPayload(BaseModel):
    deals: List[DealItem]

class RevenuePoint(BaseModel):
    date: str       # YYYY-MM-DD
    revenue: float

class RevenueForecastPayload(BaseModel):
    revenue_history: List[RevenuePoint]
    periods: Optional[int] = 30

class ChurnItem(BaseModel):
    id: Optional[str] = None
    days_since_last_activity: Optional[int] = 30
    total_deals: Optional[int] = 0
    open_deals: Optional[int] = 0
    won_deals: Optional[int] = 0

class ChurnPayload(BaseModel):
    customers: List[ChurnItem]

class SegmentItem(BaseModel):
    id: Optional[str] = None
    purchase_frequency: Optional[float] = 1.0
    deal_value: Optional[float] = 5000.0
    engagement_score: Optional[float] = 50.0

class SegmentPayload(BaseModel):
    customers: List[SegmentItem]

# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "status": "AI Service is running",
        "version": "2.0.0",
        "models": [
            "LeadConversionPrediction (LogisticRegression)",
            "DealWinPrediction (RandomForest)",
            "RevenueForecast (Prophet/LinearFallback)",
            "CustomerSegmentation (KMeans)",
            "ChurnRiskScoring",
            "PipelineHealthScore",
        ]
    }

# ─────────────────────────────────────────────
# Endpoint 1: Full Insights + Next Best Actions
# ─────────────────────────────────────────────

@app.post("/api/generate-insights")
def generate_insights(payload: InsightsPayload):
    """Primary endpoint: returns AI insights and next-best-action recommendations."""
    result = ml_model.generate_insights_and_actions(
        deals_data=payload.deals,
        leads_data=payload.leads,
        tasks_data=payload.tasks,
    )
    return result

# Alias under new path
@app.post("/insights/generate")
def generate_insights_v2(payload: InsightsPayload):
    return generate_insights(payload)

# ─────────────────────────────────────────────
# Endpoint 2: Lead Conversion Scores
# ─────────────────────────────────────────────

@app.post("/predict/lead-score")
def predict_lead_scores(payload: LeadScorePayload):
    """
    Returns a conversion probability (0-100) for each lead.
    Higher score = more likely to convert to a deal.
    """
    results = []
    for lead in payload.leads:
        prob = ml_model.predict_lead_score(
            lead_source=lead.lead_source or "other",
            company_size=lead.company_size or "small",
            lead_activity_count=lead.lead_activity_count or 0,
            response_time=lead.response_time or 1.0,
        )
        score = int(round(prob * 100))
        label = "Hot" if score >= 70 else ("Warm" if score >= 40 else "Cold")
        results.append({
            "id": lead.id,
            "score": score,
            "label": label,
            "probability": round(prob, 3),
        })
    return {"scores": results}

# ─────────────────────────────────────────────
# Endpoint 3: Deal Win Prediction
# ─────────────────────────────────────────────

@app.post("/predict/deal-win")
def predict_deal_wins(payload: DealWinPayload):
    """
    Returns win probability (0-100) for each deal using Random Forest.
    """
    results = []
    for deal in payload.deals:
        prob = ml_model.predict_deal_win(
            deal_value=deal.deal_value or 0,
            stage=deal.pipeline_stage or "new",
            days_open=deal.days_in_stage or 0,
            interaction_count=deal.interaction_count or 5,
        )
        score = int(round(prob * 100))
        results.append({
            "id": deal.id,
            "win_probability": score,
            "probability": round(prob, 3),
        })
    return {"predictions": results}

# ─────────────────────────────────────────────
# Endpoint 4: Revenue Forecast (Prophet)
# ─────────────────────────────────────────────

@app.post("/forecast/revenue")
def revenue_forecast(payload: RevenueForecastPayload):
    """
    Returns 30-day and 90-day revenue forecasts.
    Accepts a list of {date, revenue} historical data points.
    """
    history = [{"date": r.date, "revenue": r.revenue} for r in payload.revenue_history]
    result  = ml_model.forecast_revenue(history, periods=payload.periods or 30)
    return result

# ─────────────────────────────────────────────
# Endpoint 5: Churn Risk Prediction
# ─────────────────────────────────────────────

@app.post("/predict/churn")
def predict_churn(payload: ChurnPayload):
    """
    Returns a churn risk score (0-100) and label (Low/Medium/High) per customer.
    """
    results = []
    for c in payload.customers:
        risk = ml_model.predict_churn_risk(
            days_since_last_activity=c.days_since_last_activity or 30,
            total_deals=c.total_deals or 0,
            open_deals=c.open_deals or 0,
            won_deals=c.won_deals or 0,
        )
        results.append({"id": c.id, **risk})
    return {"churn_predictions": results}

# ─────────────────────────────────────────────
# Endpoint 6: Customer Segmentation
# ─────────────────────────────────────────────

@app.post("/segment/customers")
def segment_customers(payload: SegmentPayload):
    """
    Segments customers into Low-Value / Mid-Value / High-Value using KMeans.
    """
    results = []
    for c in payload.customers:
        segment = ml_model.segment_customer(
            purchase_frequency=c.purchase_frequency or 1.0,
            deal_value=c.deal_value or 5000.0,
            engagement_score=c.engagement_score or 50.0,
        )
        results.append({"id": c.id, "segment": segment})
    return {"segments": results}

# ─────────────────────────────────────────────
# Endpoint 7: Pipeline Health
# ─────────────────────────────────────────────

@app.post("/analytics/pipeline-health")
def pipeline_health(payload: InsightsPayload):
    """
    Returns a pipeline health score 0-100 with stage breakdown.
    """
    result = ml_model.calculate_pipeline_health(payload.deals)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
