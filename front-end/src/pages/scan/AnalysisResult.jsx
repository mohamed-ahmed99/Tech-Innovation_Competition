import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, Copy, CheckCircle2, Download, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';

const AnalysisResult = ({ result, structured, onReset }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        let i = 0;
        setDisplayedText('');
        setIsTyping(true);

        const baseSpeed = 20;
        const speed = result.length > 500 ? 10 : baseSpeed;

        const typingInterval = setInterval(() => {
            if (i < result.length) {
                setDisplayedText(prev => prev + result.charAt(i));
                i++;
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
            } else {
                clearInterval(typingInterval);
                setIsTyping(false);
            }
        }, speed);

        return () => clearInterval(typingInterval);
    }, [result]);

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const tumorDetected =
        structured?.tumor_detected ?? structured?.tumorDetected ?? null;

    const location = structured?.location || structured?.bodyRegion || structured?.body_region || 'brain';
    const detectedOrgan =
        structured?.detected_organ ||
        structured?.detectedOrgan ||
        structured?.body_region ||
        structured?.bodyRegion ||
        'brain';

    const organConfidence =
        typeof structured?.organ_detection_confidence === 'number'
            ? `${(structured.organ_detection_confidence * 100).toFixed(1)}%`
            : typeof structured?.organDetectionConfidence === 'number'
                ? `${(structured.organDetectionConfidence * 100).toFixed(1)}%`
                : 'Not available';

    const organWarning =
        structured?.organ_detection_warning ||
        structured?.organDetectionWarning ||
        '';

    const findings = structured?.advice?.findings ||
        (tumorDetected === null
            ? 'Analysis details are unavailable for this record.'
            : tumorDetected
                ? `Potential tumor-like finding detected in ${location}.`
                : 'No tumor-like finding detected by the current model.');

    const confidenceValue =
        typeof structured?.confidence === 'number'
            ? `${(structured.confidence * 100).toFixed(1)}%`
            : 'Not available';

    const nextSteps =
        structured?.next_steps ||
        structured?.nextSteps ||
        structured?.advice?.recommendedNextSteps ||
        [];

    const redFlags =
        structured?.red_flags ||
        structured?.redFlags ||
        structured?.advice?.urgentCareFlags ||
        [];

    const disclaimer =
        structured?.disclaimer ||
        structured?.advice?.disclaimer ||
        'This AI output is a screening aid and not a diagnosis. Please consult a licensed clinician.';

    const urgencyLevel =
        structured?.urgency_level ||
        structured?.urgencyLevel ||
        structured?.advice?.urgencyLevel ||
        'routine';

    const explanation =
        structured?.explanation ||
        structured?.advice?.explanation ||
        findings;

    const treatmentOptions =
        structured?.treatment_options ||
        structured?.treatmentOptions ||
        structured?.advice?.treatmentOptions ||
        [];

    const expectedOutlook =
        structured?.expected_outlook ||
        structured?.expectedOutlook ||
        structured?.advice?.expectedOutlook ||
        'Expected outlook is not available for this record.';

    const urgencyClass =
        urgencyLevel === 'urgent'
            ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
            : urgencyLevel === 'priority'
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';

    const buildReportText = () => {
        const lines = [
            'NeuroGuard AI - Patient Screening Report',
            '========================================',
            `Detected Organ: ${detectedOrgan}`,
            `Findings: ${findings}`,
            `Confidence: ${confidenceValue}`,
            `Urgency: ${urgencyLevel}`,
            '',
            'Explanation',
            '-----------',
            explanation,
            '',
            'Treatment Discussion Points',
            '---------------------------',
            ...(treatmentOptions.length > 0 ? treatmentOptions.map((item) => `- ${item}`) : ['- Not available']),
            '',
            'Recommended Next Steps',
            '----------------------',
            ...(nextSteps.length > 0 ? nextSteps.map((item) => `- ${item}`) : ['- Not available']),
            '',
            'Expected Outlook',
            '----------------',
            expectedOutlook,
            '',
            'Urgent Red Flags',
            '-----------------',
            ...(redFlags.length > 0 ? redFlags.map((item) => `- ${item}`) : ['- Not available']),
            '',
            'Disclaimer',
            '----------',
            disclaimer,
            '',
            'Generated by NeuroGuard AI',
        ];

        return lines.join('\n');
    };

    const handleDownloadReport = () => {
        const reportText = buildReportText();
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timeStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

        link.href = url;
        link.download = `neuroguard-report-${detectedOrgan}-${timeStamp}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const buildPdfDocument = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const reportText = buildReportText();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 40;
        const maxLineWidth = pageWidth - margin * 2;
        const lineHeight = 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('NeuroGuard AI Report', margin, margin);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 18);

        doc.setFontSize(11);
        const lines = doc.splitTextToSize(reportText, maxLineWidth);
        let y = margin + 42;

        for (const line of lines) {
            if (y > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, margin, y);
            y += lineHeight;
        }

        return doc;
    };

    const handlePrintReport = () => {
        const doc = buildPdfDocument();
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
    };

    const handleDownloadPdf = () => {
        const doc = buildPdfDocument();
        const timeStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        doc.save(`neuroguard-report-${detectedOrgan}-${timeStamp}.pdf`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-3xl mx-auto mt-4"
        >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">

                {/* Header */}
                <div className="bg-zinc-950/50 px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-zinc-100">
                        <Sparkles size={18} className="text-zinc-400" />
                        <h3 className="text-base font-semibold">AI Analysis</h3>
                    </div>

                    {!isTyping && (
                        <button
                            onClick={handleCopy}
                            className={`p-1.5 rounded-md transition-colors flex items-center gap-2 text-xs font-medium ${isCopied ? 'bg-zinc-800 text-green-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                        >
                            {isCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy Text'}</span>
                        </button>
                    )}
                </div>

                {/* Content */}
                <div
                    ref={containerRef}
                    className="p-5 sm:p-6"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Findings</p>
                            <p className="text-sm text-zinc-200 leading-relaxed">{findings}</p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Confidence</p>
                            <p className="text-sm text-zinc-100 font-semibold">{confidenceValue}</p>
                            <p className="text-xs text-zinc-400 mt-2">Detected organ: {detectedOrgan}</p>
                            <p className="text-xs text-zinc-500 mt-1">Organ routing confidence: {organConfidence}</p>
                            <div className={`inline-flex items-center mt-3 px-2.5 py-1 text-xs border rounded-full ${urgencyClass}`}>
                                Urgency: {urgencyLevel}
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Recommended Next Steps</p>
                            {nextSteps.length > 0 ? (
                                <ul className="space-y-1.5 text-sm text-zinc-200">
                                    {nextSteps.map((item, idx) => (
                                        <li key={`next-step-${idx}`} className="leading-relaxed">- {item}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-zinc-400">No follow-up guidance available for this record.</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">When to seek urgent care</p>
                            {redFlags.length > 0 ? (
                                <ul className="space-y-1.5 text-sm text-zinc-200">
                                    {redFlags.map((item, idx) => (
                                        <li key={`red-flag-${idx}`} className="leading-relaxed">- {item}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-zinc-400">No urgent warning signs available for this record.</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Explanation</p>
                            <p className="text-sm text-zinc-200 leading-relaxed">{explanation}</p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Treatment Discussion Points</p>
                            {treatmentOptions.length > 0 ? (
                                <ul className="space-y-1.5 text-sm text-zinc-200">
                                    {treatmentOptions.map((item, idx) => (
                                        <li key={`treatment-option-${idx}`} className="leading-relaxed">- {item}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-zinc-400">No treatment guidance available for this record.</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Expected Outlook</p>
                            <p className="text-sm text-zinc-200 leading-relaxed">{expectedOutlook}</p>
                        </div>
                    </div>

                    <div className="prose prose-sm sm:prose-base prose-invert max-w-none text-zinc-300">
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {displayedText}
                            {isTyping && <span className="inline-block w-1.5 sm:w-2 h-4 sm:h-5 ml-1 bg-zinc-300 animate-pulse align-middle rounded-sm"></span>}
                        </p>
                    </div>

                    {organWarning && (
                        <p className="mt-4 text-xs text-amber-400 leading-relaxed">Routing note: {organWarning}</p>
                    )}

                    <p className="mt-4 text-xs text-zinc-500 leading-relaxed">{disclaimer}</p>
                </div>

                {/* Footer Actions */}
                <AnimatePresence>
                    {!isTyping && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-5 pt-0 border-t border-zinc-800/50 mt-2"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                <button
                                    onClick={handleDownloadReport}
                                    className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border border-zinc-700/60"
                                >
                                    <Download size={16} />
                                    <span>Download text</span>
                                </button>
                                <button
                                    onClick={handleDownloadPdf}
                                    className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border border-zinc-700/60"
                                >
                                    <Download size={16} />
                                    <span>Download PDF</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 mb-2">
                                <button
                                    onClick={handlePrintReport}
                                    className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border border-zinc-700/60"
                                >
                                    <Printer size={16} />
                                    <span>Print PDF</span>
                                </button>
                            </div>
                            <button
                                onClick={onReset}
                                className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border border-zinc-700/50 group"
                            >
                                <RefreshCw size={16} className="group-hover:-rotate-180 transition-transform duration-500" />
                                <span>Analyze another image</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default AnalysisResult;
