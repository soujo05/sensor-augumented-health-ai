# AI Health Risk Scoring System

## Overview

The AI Health Risk Scoring System is an intelligent healthcare analytics platform that predicts an individual's cardiovascular health risk using machine learning techniques. The system combines a trained Random Forest model with explainable AI (SHAP) visualizations and an interactive dashboard to provide risk predictions and actionable health insights.

---

## Features

### Machine Learning Risk Prediction

* Random Forest based health risk prediction model
* Predicts cardiovascular risk score from patient health parameters
* Supports real-time risk assessment

### Explainable AI

* SHAP (SHapley Additive Explanations) integration
* Displays feature contributions influencing predictions
* Improves transparency and interpretability

### Interactive Dashboard

* Built using Streamlit
* Modern responsive user interface
* Dynamic patient input forms
* Real-time prediction updates

### Health Insights

* Risk categorization:

  * Low Risk
  * Medium Risk
  * High Risk
* Personalized health recommendations
* Key contributing factors analysis

### Data Processing Pipeline

* Data loading and preprocessing
* Feature engineering
* Model training and evaluation
* Prediction generation

---

## Technology Stack

### Frontend

* Streamlit

### Backend

* FastAPI
* Python

### Machine Learning

* Scikit-learn
* Random Forest Classifier
* SHAP

### Data Processing

* Pandas
* NumPy

---

## Project Structure

```text
app/                    Frontend dashboard
database/               Database files
dataset/                Dataset files
docs/                   Project documentation
models/                 Trained ML models
src/
├── data_loader.py
├── preprocessing.py
├── feature_engineering.py
├── train_model.py
├── predict.py
├── shap_explainer.py
├── visualization.py
└── model_evaluation.py

api_server.py           FastAPI backend
main.py                 Main execution script
requirements.txt        Python dependencies
```

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd AI-Health-Risk-Scoring-System
```

### Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Install Frontend Dependencies

```bash
npm install
```

---

## Running the Application

### Start Backend

```bash
python api_server.py
```

or

```bash
uvicorn api_server:app --reload
```

### Start Frontend

```bash
npm run dev
```

Open:

```text
http://localhost:8501
```

### Deploy the API to Vercel

Vercel uses the FastAPI application in `api_server.py` as its deployment entrypoint:

```text
api_server:app
```

The entrypoint is configured in `pyproject.toml`. The Streamlit dashboard is intended
to run locally or on a Streamlit-compatible hosting service.

Vercel's build configuration is also defined in `vercel.json` so the deployment uses
`api.py` and installs the dependencies from `requirements.txt`.

---

## Model Outputs

* Risk Score Prediction
* Risk Category Classification
* SHAP Feature Importance
* Personalized Health Insights
* Actionable Recommendations

---

## Future Enhancements

* User authentication
* Health record integration
* Advanced clinical analytics
* Deployment on cloud infrastructure
* Enhanced visualization modules

---

## Authors

Developed as part of the AI Health Risk Scoring System academic project.


## Streamlit demo: upload smartwatch export

The Streamlit dashboard supports CSV upload under **Smartwatch Data Import**.

1. Install dependencies: `pip install -r requirements.txt`
2. Run from the project root: `streamlit run app.py`
3. Upload `sample_data/smartwatch_export_demo.csv` (or a compatible CSV export).
4. Enter the patient's static health information in the sidebar.
5. Click **Predict Health Risk**.

The CSV must contain numeric columns for heart rate, SDNN, RMSSD and SpO2. The app also recognizes common header variants such as `heart_rate`, `sdnn`, `rmssd`, and `oxygen_saturation`. It averages valid rows and uses those four aggregate values in place of the manual physiological inputs for that prediction.

**Demo-data note:** the included CSV is synthetic sample data for demonstrating the file-upload workflow. It is not a real Noise/boAt device export and must not be represented as one. Live device synchronization and validation against real wearable exports remain future work.
