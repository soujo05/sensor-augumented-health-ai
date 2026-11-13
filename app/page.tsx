"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type Values = {
  age: number;
  gender: string;
  bmi: number;
  systolic_bp: number;
  diastolic_bp: number;
  cholesterol_mg_dl: number;
  smoking: string;
  alcohol_consumption: string;
  physical_activity: string;
  family_history: string;
  heart_rate_bpm: number;
  sdnn_hrv: number;
  rmssd_hrv: number;
  spo2: number;
};

type Result = {
  risk_score: number;
  risk_level: string;
  positive_contributors: { feature: string; value: number }[];
  negative_contributors: { feature: string; value: number }[];
  insights: string[];
  recommendations: string[];
  summary_plot: string;
  bar_plot: string;
  waterfall_plot: string;
};

const presets: Record<string, Values> = {
  Custom: {
    age: 40, gender: "Male", bmi: 25, systolic_bp: 125, diastolic_bp: 80,
    cholesterol_mg_dl: 190, smoking: "No", alcohol_consumption: "No",
    physical_activity: "Medium", family_history: "No", heart_rate_bpm: 76,
    sdnn_hrv: 55, rmssd_hrv: 50, spo2: 97,
  },
  "High Risk Sample": {
    age: 55, gender: "Male", bmi: 31, systolic_bp: 145, diastolic_bp: 92,
    cholesterol_mg_dl: 250, smoking: "Yes", alcohol_consumption: "Yes",
    physical_activity: "Low", family_history: "Yes", heart_rate_bpm: 92,
    sdnn_hrv: 35, rmssd_hrv: 28, spo2: 94,
  },
  "Low Risk Sample": {
    age: 24, gender: "Female", bmi: 22, systolic_bp: 112, diastolic_bp: 72,
    cholesterol_mg_dl: 160, smoking: "No", alcohol_consumption: "No",
    physical_activity: "High", family_history: "No", heart_rate_bpm: 68,
    sdnn_hrv: 78, rmssd_hrv: 65, spo2: 99,
  },
};

function parseWearableCsv(text: string): { values: Partial<Values>; count: number } {
  const rows = text.trim().split(/\r?\n/).map((row) => row.split(",").map((cell) => cell.trim()));
  if (rows.length < 2) throw new Error("The CSV contains no readings.");
  const headers = rows[0].map((header) => header.toLowerCase().replace(/[\s-]/g, "_"));
  const aliases: Record<string, string[]> = {
    heart_rate_bpm: ["heart_rate_bpm", "heart_rate", "heartrate", "hr", "bpm"],
    sdnn_hrv: ["sdnn_hrv", "sdnn", "hrv_sdnn"],
    rmssd_hrv: ["rmssd_hrv", "rmssd", "hrv_rmssd"],
    spo2: ["spo2", "spo2_percent", "oxygen_saturation", "blood_oxygen"],
  };
  const indexes = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [
    key, headers.findIndex((header) => names.includes(header)),
  ]));
  const missing = Object.entries(indexes).filter(([, index]) => index < 0).map(([key]) => key);
  if (missing.length) throw new Error(`CSV is missing required wearable columns: ${missing.join(", ")}.`);
  const totals = { heart_rate_bpm: 0, sdnn_hrv: 0, rmssd_hrv: 0, spo2: 0 };
  let count = 0;
  rows.slice(1).forEach((row) => {
    const values = Object.fromEntries(Object.entries(indexes).map(([key, index]) => [key, Number(row[index])]));
    if (Object.values(values).every((value) => Number.isFinite(value))) {
      Object.entries(values).forEach(([key, value]) => { totals[key as keyof typeof totals] += value; });
      count += 1;
    }
  });
  if (!count) throw new Error("No rows contain valid numeric wearable readings.");
  const result = Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Number((value / count).toFixed(2))]));
  return {
    values: { ...result, heart_rate_bpm: Math.round(result.heart_rate_bpm) },
    count,
  };
}

export default function Home() {
  const [preset, setPreset] = useState("Custom");
  const [values, setValues] = useState<Values>(presets.Custom);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const riskWidth = useMemo(() => Math.max(0, Math.min(100, result?.risk_score ?? 0)), [result]);
  function update(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: ["gender", "smoking", "alcohol_consumption", "physical_activity", "family_history"].includes(key) ? value : Number(value) }));
  }
  function changePreset(event: ChangeEvent<HTMLSelectElement>) {
    setPreset(event.target.value);
    setValues(presets[event.target.value]);
    setResult(null);
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const wearable = parseWearableCsv(await file.text());
      setValues((current) => ({ ...current, ...wearable.values }));
      setUploadMessage(`Loaded ${wearable.count} valid readings. Wearable values replaced the manual metrics.`);
      setError("");
    } catch (reason) {
      setUploadMessage("");
      setError(reason instanceof Error ? reason.message : "Could not read the CSV.");
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/predict", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "Prediction failed.");
      setResult(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Prediction failed.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main>
      <nav><strong>HEALTH<span>AI</span></strong><div><small>MODEL STATUS</small><b>{result ? "Prediction Complete" : "Awaiting Input"}</b></div></nav>
      <section className="hero"><p className="eyebrow">EXPLAINABLE HEALTH ANALYTICS</p><h1>Understand your health.<br /><em>Act with confidence.</em></h1><p>AI-powered cardiovascular risk scoring with transparent, actionable insights.</p></section>
      <div className="layout">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="panel-heading"><div><p className="eyebrow">PATIENT PROFILE</p><h2>Assessment inputs</h2></div><select value={preset} onChange={changePreset}>{Object.keys(presets).map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="section"><h3>Demographics</h3><div className="fields"><Field label="Age" value={values.age} min={18} max={80} onChange={(v) => update("age", v)} /><SelectField label="Gender" value={values.gender} options={["Male", "Female"]} onChange={(v) => update("gender", v)} /></div></div>
          <div className="section"><h3>Lifestyle</h3><div className="fields"><SelectField label="Smoking" value={values.smoking} options={["Yes", "No"]} onChange={(v) => update("smoking", v)} /><SelectField label="Alcohol" value={values.alcohol_consumption} options={["Yes", "No"]} onChange={(v) => update("alcohol_consumption", v)} /><SelectField label="Physical activity" value={values.physical_activity} options={["Low", "Medium", "High"]} onChange={(v) => update("physical_activity", v)} /><SelectField label="Family history" value={values.family_history} options={["Yes", "No"]} onChange={(v) => update("family_history", v)} /></div></div>
          <div className="section"><h3>Clinical indicators</h3><div className="fields"><Field label="BMI" value={values.bmi} min={15} max={45} step={0.1} onChange={(v) => update("bmi", v)} /><Field label="Systolic BP" value={values.systolic_bp} min={90} max={200} onChange={(v) => update("systolic_bp", v)} /><Field label="Diastolic BP" value={values.diastolic_bp} min={60} max={130} onChange={(v) => update("diastolic_bp", v)} /><Field label="Cholesterol (mg/dL)" value={values.cholesterol_mg_dl} min={120} max={320} onChange={(v) => update("cholesterol_mg_dl", v)} /></div></div>
          <div className="section"><h3>Physiological metrics</h3><div className="fields"><Field label="Heart rate (BPM)" value={values.heart_rate_bpm} min={50} max={130} onChange={(v) => update("heart_rate_bpm", v)} /><Field label="SDNN (HRV)" value={values.sdnn_hrv} min={10} max={140} step={0.5} onChange={(v) => update("sdnn_hrv", v)} /><Field label="RMSSD (HRV)" value={values.rmssd_hrv} min={10} max={140} step={0.5} onChange={(v) => update("rmssd_hrv", v)} /><Field label="SpO2 (%)" value={values.spo2} min={90} max={100} step={0.5} onChange={(v) => update("spo2", v)} /></div></div>
          <label className="upload">Upload smartwatch CSV<input type="file" accept=".csv,text/csv" onChange={upload} /></label>{uploadMessage && <p className="success">{uploadMessage}</p>}{error && <p className="error">{error}</p>}<button disabled={loading}>{loading ? "Analyzing..." : "Predict health risk →"}</button>
        </form>
        <section className="results">
          <div className="panel score"><p className="eyebrow">RISK SCORE</p><div className="score-number">{result ? result.risk_score.toFixed(2) : "--"}</div><div className="risk-track"><span style={{ width: `${riskWidth}%` }} /></div><strong>{result?.risk_level ?? "Awaiting assessment"}</strong><p>Scores are generated from your clinical, lifestyle, and wearable inputs.</p></div>
          {result ? <><div className="panel"><div className="panel-heading"><div><p className="eyebrow">AI EXPLANATION</p><h2>What influenced this result</h2></div></div><div className="contributors">{[...result.positive_contributors.map((item) => ({ ...item, positive: true })), ...result.negative_contributors.map((item) => ({ ...item, positive: false }))].map((item) => <div className={item.positive ? "contributor positive" : "contributor negative"} key={`${item.feature}-${item.value}`}><span>{item.positive ? "+" : "−"}</span><div><b>{item.feature}</b><small>{Math.abs(item.value).toFixed(3)} model importance</small></div></div>)}</div><h3>Insights</h3>{result.insights.map((item) => <p className="insight" key={item}>{item}</p>)}<h3>Recommendations</h3>{result.recommendations.map((item) => <p className="recommendation" key={item}>✓ {item}</p>)}</div>{(result.summary_plot || result.bar_plot || result.waterfall_plot) && <div className="panel plots"><h2>SHAP visualizations</h2><div className="plot-grid">{[["Summary plot", result.summary_plot], ["Feature importance", result.bar_plot], ["Patient waterfall", result.waterfall_plot]].filter(([, image]) => image).map(([label, image]) => <figure key={label}><figcaption>{label}</figcaption><img src={`data:image/png;base64,${image}`} alt={label} /></figure>)}</div></div>}</> : <div className="panel empty"><span>◌</span><h2>Your assessment awaits</h2><p>Complete the patient profile and run the model to receive a transparent risk score and personalized guidance.</p></div>}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: string) => void }) {
  return <label className="field">{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} /></label>;
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
