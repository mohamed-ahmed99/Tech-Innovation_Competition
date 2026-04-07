import mongoose from 'mongoose';

const simulationMetricsSchema = new mongoose.Schema(
    {
        tumor_reduction: { type: Number, default: 0 },
        risk: { type: Number, default: 0 },
        success: { type: Number, default: 0 },
    },
    { _id: false }
);

const digitalTwinRunSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true,
        },
        inputProfile: {
            age: { type: Number, required: true },
            gender: { type: String, required: true },
            tumor_size_cm: { type: Number, required: true },
            tumor_location: { type: String, required: true },
            tumor_grade: { type: String, required: true },
            symptoms: { type: [String], default: [] },
            previous_treatment: { type: String, required: true },
            performance_status: { type: Number, required: true },
        },
        recommendation: {
            recommended_treatment: { type: String, required: true },
            confidence: { type: Number, required: true },
            explanation: { type: String, default: '' },
        },
        simulations: {
            surgery: { type: simulationMetricsSchema, required: true },
            radiation: { type: simulationMetricsSchema, required: true },
            chemotherapy: { type: simulationMetricsSchema, required: true },
        },
        alternatives: {
            type: [
                {
                    treatment: { type: String, required: true },
                    score: { type: Number, required: true },
                    tumor_reduction: { type: Number, required: true },
                    risk: { type: Number, required: true },
                    success: { type: Number, required: true },
                },
            ],
            default: [],
        },
        scoreMargin: { type: Number, default: 0 },
        disclaimer: { type: String, default: '' },
        contractVersion: { type: String, default: 'digital_twin_heuristic_v1' },
    },
    {
        timestamps: true,
    }
);

digitalTwinRunSchema.index({ userId: 1, createdAt: -1 });

const DigitalTwinRun = mongoose.model('DigitalTwinRun', digitalTwinRunSchema);

export default DigitalTwinRun;
