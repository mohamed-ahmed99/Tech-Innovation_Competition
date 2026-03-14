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
        default: 'Brain Scan Analysis',
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
}, {
    timestamps: true,
});

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;
