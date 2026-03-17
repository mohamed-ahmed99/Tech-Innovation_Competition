import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true,
    },
    title: {
        type: String,
        default: 'Medical Scan Analysis',
    },
    // Structured result from the AI model
    tumorDetected: { type: Boolean, required: true },
    confidence:    { type: Number,  required: true },
    location:      { type: String,  default: 'none' },
    boundingBox: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        w: { type: Number, default: 0 },
        h: { type: Number, default: 0 },
    },
    rawScores: {
        no_tumor: { type: Number, default: 0 },
        tumor:    { type: Number, default: 0 },
    },
    // Human-readable formatted report
    formattedReport: { type: String, required: true },
    modality:        { type: String, default: 'mri' },
    bodyRegion:      { type: String, default: 'brain' },
    detectedOrgan:   { type: String, default: 'brain' },
    organDetectionConfidence: { type: Number, default: 0 },
    organDetectionSource:     { type: String, default: 'unknown' },
    organDetectionWarning:    { type: String, default: '' },
    urgencyLevel:    { type: String, default: 'routine' },
    nextSteps:       { type: [String], default: [] },
    redFlags:        { type: [String], default: [] },
    disclaimer:      { type: String, default: '' },
}, {
    timestamps: true,
});

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;
