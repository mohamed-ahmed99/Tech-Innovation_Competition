# Digital Twin Treatment Recommendation API Contract

## Purpose
This API provides treatment simulations for brain tumor management and returns a recommended treatment with explainable reasoning.

## Base Path
- `/api/v1/digital-twin`

## Endpoints

### 1) Health Check
- `GET /api/v1/digital-twin/health`

Response:
```json
{
  "status": "ok",
  "engine": "digital_twin_heuristic_v1",
  "mode": "rule-based"
}
```

### 2) Recommendation
- `POST /api/v1/digital-twin/recommend`
- `Content-Type: application/json`

Request body:
```json
{
  "age": 54,
  "gender": "male",
  "tumor_size_cm": 2.7,
  "tumor_location": "temporal",
  "tumor_grade": "high",
  "symptoms": ["headache", "seizures"],
  "previous_treatment": "none",
  "performance_status": 1
}
```

Response body:
```json
{
  "recommended_treatment": "surgery",
  "confidence": 0.81,
  "explanation": "Surgery is recommended because it achieved the highest composite score using score = (success * 0.6) + (tumor_reduction * 0.3) - (risk * 0.1). Predicted tumor reduction is 0.66, success probability is 0.74, and risk is 0.24. Score margin versus the next best option is 0.095. Key clinical factors: Small tumor size favors more complete resection. Tumor location is relatively accessible for surgery. Younger age generally improves postoperative recovery.",
  "simulations": {
    "surgery": {
      "tumor_reduction": 0.66,
      "risk": 0.24,
      "success": 0.74
    },
    "radiation": {
      "tumor_reduction": 0.43,
      "risk": 0.24,
      "success": 0.58
    },
    "chemotherapy": {
      "tumor_reduction": 0.28,
      "risk": 0.30,
      "success": 0.57
    }
  }
}
```

### 3) Contract Introspection
- `GET /api/v1/digital-twin/contract`
- Returns machine-readable JSON schema for request and response.

## Input Fields
- `age`: integer, 1..120
- `gender`: `male | female`
- `tumor_size_cm`: float, > 0
- `tumor_location`: `frontal | temporal | parietal | occipital | deep`
- `tumor_grade`: `low | medium | high`
- `symptoms`: array of `headache | seizures | vision_loss | nausea`
- `previous_treatment`: `none | surgery | radiation | chemo`
- `performance_status`: integer `0..4`

## Decision Formula
Final score per treatment:

`score = (success_probability * 0.6) + (tumor_reduction * 0.3) - (risk_score * 0.1)`

The treatment with the highest score is selected.

## Important Clinical Note
This endpoint is for decision support and education, not standalone clinical diagnosis.

## Backend Integration Requirements
Backend developers should expose and consume this contract as follows:

1. Expose a backend proxy endpoint for recommendation requests:
  - `POST /api/ai/digital-twin/recommend`
  - Forward request body to AI service endpoint `POST /api/v1/digital-twin/recommend`
2. Expose backend health endpoint:
  - `GET /api/ai/digital-twin/health`
  - Forward to AI service `GET /api/v1/digital-twin/health`
3. Preserve response fields exactly as provided by AI service:
  - `recommended_treatment`
  - `confidence`
  - `explanation`
  - `simulations.surgery|radiation|chemotherapy`
4. Validation behavior:
  - If payload is invalid, return HTTP 400 with validation details.
  - If AI service is unavailable, return HTTP 503.