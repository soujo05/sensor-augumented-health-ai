from __future__ import annotations

import base64
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Tuple
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.feature_engineering import FEATURE_COLUMNS
from src.risk_interpreter import (
    classify_risk,
    generate_insights,
    top_contributors,
    _pretty_feature_name,
)


class PredictionInput(BaseModel):
    age: int = Field(ge=18, le=80)
    gender: str
    bmi: float = Field(ge=15, le=45)
    systolic_bp: int = Field(ge=90, le=200)
    diastolic_bp: int = Field(ge=60, le=130)
    cholesterol_mg_dl: int = Field(ge=120, le=320)
    smoking: str
    alcohol_consumption: str
    physical_activity: str
    family_history: str
    heart_rate_bpm: int = Field(ge=50, le=130)
    sdnn_hrv: float = Field(ge=10, le=140)
    rmssd_hrv: float = Field(ge=10, le=140)
    spo2: float = Field(ge=90, le=100)


class Contributor(BaseModel):
    feature: str
    value: float


class PredictionResponse(BaseModel):
    risk_score: float
    risk_level: str
    positive_contributors: List[Contributor]
    negative_contributors: List[Contributor]
    insights: List[str]
    recommendations: List[str]
    summary_plot: str
    bar_plot: str
    waterfall_plot: str


app = FastAPI(title="AI Health Risk API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8501","http://127.0.0.1:8501",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@lru_cache
def _get_paths() -> Tuple[Path, Path]:
    project_root = Path(__file__).resolve().parent
    dataset_path = project_root / "dataset" / "indian_health_risk_dataset.csv"
    model_path = project_root / "models" / "random_forest_model.pkl"
    return dataset_path, model_path


@lru_cache
def _get_pipeline():
    _, model_path = _get_paths()
    import joblib

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at: {model_path}")
    return joblib.load(model_path)


def _prepare_input_df(payload: PredictionInput):
    import pandas as pd

    data = payload.dict()
    return pd.DataFrame([data], columns=FEATURE_COLUMNS)


def _generate_recommendations(values: Dict[str, object], risk_level: str) -> List[str]:
    recommendations: List[str] = []

    if values["smoking"] == "Yes":
        recommendations.append("Reduce or stop smoking to lower cardiovascular risk.")
    if values["bmi"] >= 27:
        recommendations.append("Aim for gradual weight reduction with balanced nutrition.")
    if values["cholesterol_mg_dl"] >= 200:
        recommendations.append("Reduce saturated fats and monitor cholesterol levels.")
    if values["systolic_bp"] >= 130 or values["diastolic_bp"] >= 85:
        recommendations.append("Monitor blood pressure and limit excess sodium.")
    if values["physical_activity"] == "Low":
        recommendations.append("Add at least 30 minutes of moderate activity most days.")
    if values["spo2"] < 95:
        recommendations.append("Prioritize breathing exercises and check oxygen levels.")

    if not recommendations:
        recommendations.append("Maintain your current healthy lifestyle routines.")

    if risk_level == "High Risk":
        recommendations.append("Consult a healthcare professional for a detailed checkup.")

    return recommendations


def _model_contributors(pipeline) -> Tuple[List[Tuple[str, float]], List[Tuple[str, float]]]:
    preprocessor = pipeline.named_steps.get("preprocessor")
    model = pipeline.named_steps.get("model")
    if preprocessor is None or not hasattr(model, "feature_importances_"):
        return [], []

    try:
        names = [str(name) for name in preprocessor.get_feature_names_out()]
    except Exception:
        names = FEATURE_COLUMNS

    importances = model.feature_importances_
    ranked = sorted(
        zip(names, importances),
        key=lambda item: float(item[1]),
        reverse=True,
    )
    positive = [(name, float(value)) for name, value in ranked[:6]]
    return positive, []


@app.get("/")
def root() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}
@app.get("/history")
def history():
    from src.database import create_tables, get_assessment_history

    create_tables()

    rows = get_assessment_history()

    return [
        {
            "id": row[0],
            "age": row[1],
            "risk_score": row[2],
            "risk_level": row[3],
            "created_at": row[4]
        }
        for row in rows
    ]


@app.get("/model-metrics")
def get_model_metrics() -> Dict[str, object]:
    project_root = Path(__file__).resolve().parent
    metrics_path = project_root / "outputs" / "metrics.json"
    cm_path = project_root / "outputs" / "confusion_matrix.png"

    if not metrics_path.exists() or not cm_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Model metrics or confusion matrix image not found. Please run the evaluation pipeline script manually first."
        )

    try:
        import json
        with open(metrics_path, "r") as f:
            metrics_data = json.load(f)

        with open(cm_path, "rb") as f:
            cm_base64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "regression_metrics": metrics_data["regression_metrics"],
            "classification_metrics": metrics_data["classification_metrics"],
            "confusion_matrix": cm_base64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model metrics: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionInput) -> PredictionResponse:
    try:
        from src.database import create_tables, save_assessment
        create_tables()
        pipeline = _get_pipeline()
        input_df = _prepare_input_df(payload)

        prediction = float(pipeline.predict(input_df)[0])
        risk_level = classify_risk(prediction)
        assessment_id = save_assessment(
            payload,
            prediction,
            risk_level
        )
        positive, negative = _model_contributors(pipeline)
        insights = generate_insights(positive, negative, payload.dict())
        recommendations = _generate_recommendations(payload.dict(), risk_level)

        return PredictionResponse(
            risk_score=prediction,
            risk_level=risk_level,
            positive_contributors=[
    Contributor(
        feature=_pretty_feature_name(name),
        value=value
    )
    for name, value in positive
],
negative_contributors=[
    Contributor(
        feature=_pretty_feature_name(name),
        value=value
    )
    for name, value in negative
],
            insights=insights,
            recommendations=recommendations,
            summary_plot="",
            bar_plot="",
            waterfall_plot="",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
