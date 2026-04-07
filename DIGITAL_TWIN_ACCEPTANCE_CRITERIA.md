# Digital Twin Acceptance Criteria

This checklist must pass before expanding Digital Twin scope to new organs, treatment policies, or UI modules.

## 1) Contract Compliance
- Backend endpoint `POST /api/ai/digital-twin/recommend` validates payload fields against the AI contract.
- Backend forwards to AI endpoint `POST /api/v1/digital-twin/recommend`.
- Backend response includes contract fields unchanged under `data.recommendation`:
  - `recommended_treatment`
  - `confidence`
  - `explanation`
  - `simulations`

## 2) Validation and Error Behavior
- Invalid payload returns HTTP 400 with field-level validation errors.
- AI timeout returns HTTP 504 with user-readable message.
- AI unavailability returns HTTP 503.
- AI upstream 4xx/5xx is surfaced as mapped backend error with detail message.

## 3) Persistence and Retrieval
- Authenticated recommendation requests persist a Digital Twin run with:
  - patient input profile
  - recommendation and simulations
  - alternatives and score margin
  - timestamp and user id
- History endpoints are available:
  - `GET /api/ai/digital-twin/history`
  - `GET /api/ai/digital-twin/history/:id`

## 4) Frontend Decision UX
- Result panel renders:
  - recommended treatment
  - confidence percentage
  - score margin
  - ranked alternatives
  - simulation metrics per treatment
  - clinical disclaimer
- Error and loading states are visible and non-blocking.

## 5) 3D Lab Synchronization
- "Open In 3D Lab" sends recommendation context to `/simulation-3d` query params.
- 3D page initializes treatment, tumor location, and intensity from Digital Twin seed when provided.

## 6) Automated Coverage
- Backend tests cover contract validation and scoring/ranking behavior.
- Frontend tests cover form payload validation.
- CI or release flow runs both test suites before promotion.

## 7) Release Gate
- Production smoke test with a valid recommendation payload succeeds end-to-end.
- A saved run is visible in history and reloadable in the UI.
- The recommended treatment can be sent to the 3D page with seeded state.
