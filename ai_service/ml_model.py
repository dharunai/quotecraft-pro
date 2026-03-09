import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import LabelEncoder, StandardScaler
import warnings
warnings.filterwarnings('ignore')

# ─────────────────────────────────────────────
# 1.  DEAL WIN PREDICTION  (Random Forest)
# ─────────────────────────────────────────────
_deal_le = LabelEncoder()
_deal_le.fit(['qualified', 'proposal', 'negotiation', 'won', 'lost'])

_deal_model = RandomForestClassifier(n_estimators=50, random_state=42)
_deal_dummy = pd.DataFrame({
    'deal_value':    [1000, 5000,  200, 10000,  400,  8000, 3000, 15000,  500, 2000],
    'stage_encoded': [   0,    1,    2,     3,    2,     1,    2,     3,    0,    1],
    'days_open':     [  10,    5,   30,     2,   60,     8,   20,     3,   45,   12],
    'interaction_count': [3, 10,  1,  15,   0,    8,    5,   20,    2,    4],
})
_deal_y = [1, 1, 0, 1, 0, 1, 1, 1, 0, 1]
_deal_model.fit(_deal_dummy, _deal_y)


def predict_deal_win(deal_value: float, stage: str, days_open: int, interaction_count: int = 5) -> float:
    """Return probability (0-1) that a deal will be won."""
    try:
        if stage == 'won':  return 1.0
        if stage == 'lost': return 0.0
        if stage not in _deal_le.classes_:
            return 0.5
        enc = _deal_le.transform([stage])[0]
        X = pd.DataFrame({
            'deal_value':        [float(deal_value or 0)],
            'stage_encoded':     [enc],
            'days_open':         [int(days_open or 0)],
            'interaction_count': [int(interaction_count or 5)],
        })
        return float(_deal_model.predict_proba(X)[0][1])
    except Exception as e:
        print(f"[deal-win] error: {e}")
        return 0.5


# ─────────────────────────────────────────────
# 2.  LEAD CONVERSION PREDICTION  (Logistic Regression)
# ─────────────────────────────────────────────
_lead_scaler = StandardScaler()
_lead_model  = LogisticRegression(random_state=42, max_iter=500)

_SOURCE_MAP = {'website': 3, 'referral': 4, 'cold_call': 2, 'social': 2,
               'email': 2, 'event': 3, 'partner': 4, 'other': 1}
_SIZE_MAP   = {'small': 1, 'mid': 2, 'medium': 2, 'large': 3, 'enterprise': 4}

# Synthetic training data
np.random.seed(42)
n = 200
_lead_dummy = pd.DataFrame({
    'source_score':       np.random.choice([1, 2, 3, 4], n),
    'size_score':         np.random.choice([1, 2, 3, 4], n),
    'activity_count':     np.random.randint(0, 20, n),
    'response_time_days': np.random.uniform(0.1, 10, n),
})
# Probabilistic labels: higher source/size/activity → more likely to convert
_lead_prob = (
    0.15 * _lead_dummy['source_score'] +
    0.10 * _lead_dummy['size_score']   +
    0.05 * _lead_dummy['activity_count'] -
    0.03 * _lead_dummy['response_time_days']
)
_lead_prob = (_lead_prob - _lead_prob.min()) / (_lead_prob.max() - _lead_prob.min())
_lead_y_lr = (_lead_prob > 0.5).astype(int)
_lead_scaler.fit(_lead_dummy)
_lead_model.fit(_lead_scaler.transform(_lead_dummy), _lead_y_lr)


def predict_lead_score(lead_source: str, company_size: str,
                       lead_activity_count: int, response_time: float) -> float:
    """Return conversion probability (0-1) for a lead."""
    try:
        src  = _SOURCE_MAP.get(str(lead_source).lower(), 2)
        size = _SIZE_MAP.get(str(company_size).lower(), 2)
        X = pd.DataFrame({
            'source_score':       [src],
            'size_score':         [size],
            'activity_count':     [int(lead_activity_count or 0)],
            'response_time_days': [float(response_time or 1)],
        })
        return float(_lead_model.predict_proba(_lead_scaler.transform(X))[0][1])
    except Exception as e:
        print(f"[lead-score] error: {e}")
        return 0.5


# ─────────────────────────────────────────────
# 3.  REVENUE FORECASTING  (Prophet or statsmodels fallback)
# ─────────────────────────────────────────────
def forecast_revenue(revenue_history: list, periods: int = 30) -> dict:
    """
    Accepts list of {"date": "YYYY-MM-DD", "revenue": float}.
    Returns {"forecast_30": float, "forecast_90": float, "series": [...]}
    Falls back to linear trend if Prophet is not installed.
    """
    try:
        if len(revenue_history) < 2:
            return {"forecast_30": 0, "forecast_90": 0, "series": []}

        df = pd.DataFrame(revenue_history)
        df.columns = [c.lower() for c in df.columns]
        df['ds'] = pd.to_datetime(df['date' if 'date' in df.columns else 'ds'])
        df['y']  = pd.to_numeric(df['revenue' if 'revenue' in df.columns else 'y'], errors='coerce').fillna(0)
        df = df[['ds', 'y']].sort_values('ds').drop_duplicates('ds')

        # ── Try Prophet ──
        try:
            from prophet import Prophet
            m = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
            m.fit(df)
            fut_30  = m.make_future_dataframe(periods=30,  freq='D')
            fut_90  = m.make_future_dataframe(periods=90,  freq='D')
            p30 = m.predict(fut_30)
            p90 = m.predict(fut_90)
            f30 = max(0, float(p30['yhat'].iloc[-1]))
            f90 = max(0, float(p90['yhat'].iloc[-1]))
            series = p30[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(30)
            series = series.rename(columns={'ds': 'date', 'yhat': 'value',
                                            'yhat_lower': 'lower', 'yhat_upper': 'upper'})
            series['date'] = series['date'].dt.strftime('%Y-%m-%d')
            return {"forecast_30": round(f30), "forecast_90": round(f90),
                    "series": series.to_dict(orient='records')}
        except ImportError:
            pass

        # ── Linear Trend Fallback ──
        from scipy.stats import linregress
        df['t'] = np.arange(len(df))
        slope, intercept, *_ = linregress(df['t'], df['y'])
        n = len(df)
        f30 = max(0, intercept + slope * (n + 30))
        f90 = max(0, intercept + slope * (n + 90))
        series = []
        base_date = df['ds'].iloc[-1]
        for i in range(1, 31):
            d = base_date + timedelta(days=i)
            series.append({'date': d.strftime('%Y-%m-%d'),
                           'value': round(max(0, intercept + slope * (n + i)))})
        return {"forecast_30": round(f30), "forecast_90": round(f90), "series": series}

    except Exception as e:
        print(f"[forecast] error: {e}")
        return {"forecast_30": 0, "forecast_90": 0, "series": []}


# ─────────────────────────────────────────────
# 4.  CUSTOMER SEGMENTATION  (KMeans)
# ─────────────────────────────────────────────
_seg_scaler = StandardScaler()
_kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)

# Pre-train with synthetic 3-cluster data
np.random.seed(7)
_seg_dummy = pd.DataFrame({
    'purchase_frequency': np.concatenate([
        np.random.uniform(0, 2,  40),
        np.random.uniform(2, 6,  40),
        np.random.uniform(6, 12, 40),
    ]),
    'deal_value': np.concatenate([
        np.random.uniform(500,  5000,  40),
        np.random.uniform(5000, 20000, 40),
        np.random.uniform(20000, 100000, 40),
    ]),
    'engagement_score': np.concatenate([
        np.random.uniform(0, 30,  40),
        np.random.uniform(30, 70, 40),
        np.random.uniform(70, 100, 40),
    ]),
})
_seg_scaler.fit(_seg_dummy)
_kmeans.fit(_seg_scaler.transform(_seg_dummy))
_SEGMENT_LABELS = {0: 'Low-Value', 1: 'Mid-Value', 2: 'High-Value'}

# Determine correct cluster → label mapping by centroid deal_value order
_centroid_order = np.argsort(_kmeans.cluster_centers_[:, 1])
_CLUSTER_TO_LABEL = {int(c): _SEGMENT_LABELS[i] for i, c in enumerate(_centroid_order)}


def segment_customer(purchase_frequency: float, deal_value: float, engagement_score: float) -> str:
    try:
        X = _seg_scaler.transform([[purchase_frequency, deal_value, engagement_score]])
        cluster = int(_kmeans.predict(X)[0])
        return _CLUSTER_TO_LABEL.get(cluster, 'Unknown')
    except Exception as e:
        print(f"[segmentation] error: {e}")
        return 'Unknown'


# ─────────────────────────────────────────────
# 5.  CHURN RISK SCORING
# ─────────────────────────────────────────────
def predict_churn_risk(days_since_last_activity: int, total_deals: int,
                       open_deals: int, won_deals: int) -> dict:
    """
    Returns churn_risk_score (0-100) and a label: Low / Medium / High.
    Higher score = higher churn risk.
    """
    try:
        # Inactivity is the primary signal
        inactivity_score = min(100, days_since_last_activity * 2)

        # Engagement ratio: won deals to total, lower = riskier
        if total_deals > 0:
            win_ratio = won_deals / total_deals
            engagement_penalty = (1 - win_ratio) * 30
        else:
            engagement_penalty = 40

        open_deal_bonus = min(20, open_deals * 5)

        raw = inactivity_score + engagement_penalty - open_deal_bonus
        score = int(max(0, min(100, raw)))
        label = 'High' if score >= 65 else ('Medium' if score >= 35 else 'Low')
        return {"churn_risk_score": score, "risk_label": label}
    except Exception as e:
        print(f"[churn] error: {e}")
        return {"churn_risk_score": 50, "risk_label": "Medium"}


# ─────────────────────────────────────────────
# 6.  PIPELINE HEALTH SCORE
# ─────────────────────────────────────────────
def calculate_pipeline_health(deals_data: list) -> dict:
    """
    Returns a health score 0-100 and a breakdown of sub-scores.
    """
    if not deals_data:
        return {"score": 0, "label": "No Data", "breakdown": {}}

    deals = pd.DataFrame(deals_data)
    # Actual DB stages: qualified, proposal, negotiation (no 'new')
    active = deals[~deals['stage'].isin(['won', 'lost'])]

    stage_order = ['qualified', 'proposal', 'negotiation']
    stage_counts = {s: int((active['stage'] == s).sum()) for s in stage_order}
    total_active = max(len(active), 1)

    # Balance Score: prefer deals distributed across stages
    proportions = np.array([stage_counts[s] / total_active for s in stage_order])
    ideal       = np.array([0.40, 0.35, 0.25])
    balance_score = max(0, 100 - int(np.sum(np.abs(proportions - ideal)) * 100))

    # Velocity Score: deals not stuck for >14 days
    if 'updated_at' in deals.columns and len(active) > 0:
        today = pd.Timestamp.today()
        active2 = active.copy()
        active2['updated_at'] = pd.to_datetime(active2['updated_at'], errors='coerce', utc=True).dt.tz_localize(None)
        stalled = (active2['updated_at'] < today - pd.Timedelta(days=14)).sum()
        velocity_score = max(0, 100 - int((stalled / total_active) * 100))
    else:
        velocity_score = 70 if len(active) > 0 else 50

    # Value Score: pipeline not over-concentrated in a single deal
    if 'deal_value' in deals.columns and total_active > 1:
        values = active['deal_value'].fillna(0).values
        total_val = float(np.sum(values))
        if total_val > 0:
            gini = 1 - float(np.sum(values**2)) / (total_val**2 + 1e-9) * total_active
            value_score = int(max(0, min(100, gini * 100)))
        else:
            value_score = 70
    else:
        value_score = 70

    # No active deals = low health
    if len(active) == 0:
        overall = 0
        label = 'No Active Deals'
    else:
        overall = int(0.4 * balance_score + 0.4 * velocity_score + 0.2 * value_score)
        label = 'Excellent' if overall >= 80 else ('Good' if overall >= 60 else ('Fair' if overall >= 40 else 'Poor'))

    return {
        "score": overall,
        "label": label,
        "breakdown": {
            "balance_score":  balance_score,
            "velocity_score": velocity_score,
            "value_score":    value_score,
        },
        "stage_counts": stage_counts,
        "active_count": len(active),
    }


# ─────────────────────────────────────────────
# UTILITY
# ─────────────────────────────────────────────
def strip_tz(series):
    try:
        if hasattr(series.dt, 'tz') and series.dt.tz is not None:
            return series.dt.tz_localize(None)
        return series
    except Exception:
        return series


# ─────────────────────────────────────────────
# 7.  MAIN INSIGHTS & NEXT BEST ACTIONS ENGINE
# ─────────────────────────────────────────────
def generate_insights_and_actions(deals_data, leads_data, tasks_data):
    today = pd.Timestamp.today()

    deals = pd.DataFrame(deals_data) if deals_data else pd.DataFrame(
        columns=['id', 'stage', 'deal_value', 'won_date', 'expected_close_date', 'updated_at', 'probability'])
    leads = pd.DataFrame(leads_data) if leads_data else pd.DataFrame(columns=['id', 'status'])
    tasks = pd.DataFrame(tasks_data) if tasks_data else pd.DataFrame(columns=['id', 'status', 'due_date'])

    insights = []
    actions  = []

    # Pre-process dates
    if not deals.empty:
        for col in ['won_date', 'expected_close_date', 'updated_at', 'created_at']:
            if col in deals.columns:
                deals[col] = strip_tz(pd.to_datetime(deals[col], errors='coerce', utc=True))
            else:
                deals[col] = pd.NaT
        deals['days_open'] = (today - deals['created_at']).dt.days.fillna(0).astype(int)

    if not tasks.empty:
        tasks['due_date'] = strip_tz(pd.to_datetime(tasks['due_date'], errors='coerce', utc=True))

    # ── Insight 1: ML Deal Closing Prediction ──
    if not deals.empty:
        active_deals   = deals[~deals['stage'].isin(['won', 'lost'])]
        likely_count   = 0
        likely_value   = 0
        for _, row in active_deals.iterrows():
            prob = predict_deal_win(row['deal_value'], row['stage'], row['days_open'])
            if prob > 0.65 or row.get('probability', 0) >= 70:
                if pd.notna(row['expected_close_date']) and row['expected_close_date'] <= today + pd.Timedelta(days=7):
                    likely_count += 1
                    likely_value += (row['deal_value'] or 0)
        if likely_count > 0:
            insights.append({
                "id": "closing_soon_ml",
                "type": "closing_soon",
                "message": f"ML Model Predicts: **{likely_count} deal{'s' if likely_count>1 else ''}** will close this week worth **₹{likely_value:,.0f}**.",
                "priority": "high",
            })

    # ── Insight 2: Revenue Trend ──
    if not deals.empty:
        cm, cy = today.month, today.year
        lm = cm - 1 if cm > 1 else 12
        ly = cy if cm > 1 else cy - 1
        won = deals[deals['stage'] == 'won'].dropna(subset=['won_date'])
        if not won.empty:
            curr_rev = won[(won['won_date'].dt.month == cm) & (won['won_date'].dt.year == cy)]['deal_value'].sum()
            last_rev = won[(won['won_date'].dt.month == lm) & (won['won_date'].dt.year == ly)]['deal_value'].sum()
            if last_rev > 0:
                pct = ((curr_rev - last_rev) / last_rev) * 100
                direction = "up" if pct >= 0 else "down"
                insights.append({
                    "id": "revenue_trend",
                    "type": "revenue_trend",
                    "message": f"Revenue is trending **{direction} {abs(pct):.0f}%** this month vs last month.",
                    "priority": "high",
                })

    # ── Insight 3: Stalled Deals ──
    if not deals.empty and 'updated_at' in deals.columns:
        stalled = deals[(~deals['stage'].isin(['won', 'lost'])) & (deals['updated_at'] < today - pd.Timedelta(days=5))]
        if not stalled.empty:
            insights.append({
                "id": "stalled_deals",
                "type": "stalled_deals",
                "message": f"**{len(stalled)} active deal{'s' if len(stalled)>1 else ''}** have not been updated in over 5 days.",
                "priority": "medium",
            })
            for _, deal in stalled.iterrows():
                actions.append({
                    "id": f"nba-stalled-{deal['id']}",
                    "entityType": "deal",
                    "entityId": str(deal['id']),
                    "action": "Follow-up required",
                    "reason": "Deal has stalled for more than 5 days.",
                    "priority": "medium",
                })

    # ── Insight 4: Pipeline Health ──
    if not deals.empty:
        health = calculate_pipeline_health(deals_data)
        score  = health["score"]
        active_count = health.get("active_count", 0)
        if active_count == 0:
            # All deals are closed — actionable message
            insights.append({
                "id": "pipeline_health",
                "type": "health_score",
                "message": "No active deals in the pipeline right now. Add new opportunities to keep your pipeline healthy.",
                "priority": "medium",
            })
        elif score > 0:
            vel = health['breakdown'].get('velocity_score', 0)
            vel_note = "deals are moving well" if vel >= 70 else "some deals may be stalling"
            insights.append({
                "id": "pipeline_health",
                "type": "health_score",
                "message": f"Pipeline health: **{score}/100** ({health['label']}). You have **{active_count} active deal{'s' if active_count > 1 else ''}** — {vel_note}.",
                "priority": "medium" if score < 60 else "low",
            })

    # ── Insight 5: Follow-ups Due Today ──
    if not tasks.empty:
        due_today = tasks[(~tasks['status'].isin(['completed', 'cancelled'])) & (tasks['due_date'].dt.date == today.date())]
        if not due_today.empty:
            insights.append({
                "id": "follow_ups",
                "type": "follow_ups",
                "message": f"You have **{len(due_today)} task{'s' if len(due_today)>1 else ''}** due today.",
                "priority": "medium",
            })

    # ── Action: High-Value Negotiation Deals ──
    if not deals.empty:
        hot = deals[(deals['stage'] == 'negotiation') & (deals['deal_value'] > 50000)]
        for _, deal in hot.iterrows():
            actions.append({
                "id": f"nba-hot-{deal['id']}",
                "entityType": "deal",
                "entityId": str(deal['id']),
                "action": "Schedule closing meeting",
                "reason": "High-value deal in negotiation stage.",
                "priority": "high",
            })

    # ── Action: Uncontacted New Leads ──
    if not leads.empty:
        for _, lead in leads[leads['status'] == 'new'].head(3).iterrows():
            actions.append({
                "id": f"nba-lead-{lead['id']}",
                "entityType": "lead",
                "entityId": str(lead['id']),
                "action": "Initial outreach",
                "reason": "New lead pending first contact.",
                "priority": "high",
            })

    # Sort & deduplicate
    priority_map = {"high": 3, "medium": 2, "low": 1}
    sorted_insights = sorted(insights, key=lambda x: priority_map.get(x["priority"], 0), reverse=True)

    seen = set()
    deduped_actions = []
    for a in sorted(actions, key=lambda x: priority_map.get(x["priority"], 0), reverse=True):
        if a['id'] not in seen:
            deduped_actions.append(a)
            seen.add(a['id'])

    if not sorted_insights:
        sorted_insights.append({
            "id": "no_data",
            "type": "health_score",
            "message": "Gathering more data to run Machine Learning predictions...",
            "priority": "low",
        })

    return {
        "insights":       sorted_insights[:5],
        "nextBestActions": deduped_actions[:5],
    }
