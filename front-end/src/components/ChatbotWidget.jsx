import { useMemo, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';

const FAQ_ENTRIES = [
    {
        id: 'what-is-neuroguard',
        question: 'What is NeuroGuard?',
        triggers: ['what is neuroguard', 'neuroguard', 'ايه هو neuroguard', 'ما هو neuroguard'],
        answer:
            'NeuroGuard is an AI-powered platform for brain tumor analysis and treatment support. It helps doctors and teams visualize MRI findings, estimate treatment response, and review Digital Twin simulations.',
    },
    {
        id: 'how-to-use',
        question: 'How can I use it?',
        triggers: ['how can i use it', 'how to use', 'ازاي استخدم', 'كيف استخدم', 'طريقة الاستخدام'],
        answer:
            '1) Upload the MRI image from the Home page. 2) Review AI analysis and report output. 3) Open Digital Twin / 3D Lab to test treatment scenarios and compare outcomes.',
    },
    {
        id: 'is-it-diagnostic',
        question: 'Is this a final medical diagnosis?',
        triggers: ['final diagnosis', 'medical diagnosis', 'تشخيص نهائي', 'تشخيص طبي'],
        answer:
            'No. NeuroGuard is a decision-support system. Final diagnosis and treatment planning should always be confirmed by licensed medical professionals.',
    },
    {
        id: 'supported-input',
        question: 'What input does NeuroGuard need?',
        triggers: ['input', 'supported format', 'what image', 'نوع الصورة', 'المدخلات'],
        answer:
            'The core workflow expects MRI brain images (commonly PNG/JPG after conversion). Better image quality generally improves analysis reliability.',
    },
    {
        id: 'digital-twin-benefit',
        question: 'What does the Digital Twin page do?',
        triggers: ['digital twin', '3d lab', 'simulation', 'المحاكاة', 'الديجيتال توين'],
        answer:
            'It simulates potential treatment effects (surgery, radiation, chemotherapy) and visualizes estimated reduction, risk, and confidence in an interactive 3D scene.',
    },
    {
        id: 'data-privacy',
        question: 'Is my data private?',
        triggers: ['privacy', 'secure', 'private', 'الخصوصية', 'البيانات'],
        answer:
            'Access is protected by authentication, but operational privacy depends on deployment and hosting configuration. Use secure infrastructure and medical data policies in production.',
    },
];

const QUICK_QUESTIONS = [
    'What is NeuroGuard?',
    'How can I use it?',
    'What does the Digital Twin page do?',
    'Is this a final medical diagnosis?',
    'ايه هو NeuroGuard؟',
    'ازاي اقدر استخدمه؟',
];

const normalizeText = (text) =>
    text
        .toLowerCase()
        .replace(/[?.,!;:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

function findBestAnswer(userText) {
    const normalized = normalizeText(userText);
    if (!normalized) return null;

    for (const entry of FAQ_ENTRIES) {
        if (entry.triggers.some((trigger) => normalized.includes(trigger))) {
            return entry.answer;
        }
    }

    return null;
}

function BotMessage({ children }) {
    return (
        <div className="max-w-[90%] self-start rounded-2xl rounded-bl-md border border-cyan-400/20 bg-zinc-900/85 px-3 py-2 text-sm text-zinc-200">
            {children}
        </div>
    );
}

function UserMessage({ children }) {
    return (
        <div className="max-w-[90%] self-end rounded-2xl rounded-br-md bg-cyan-400 px-3 py-2 text-sm font-medium text-zinc-950">
            {children}
        </div>
    );
}

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'Hi. I am NeuroGuard Assistant. Ask me about usage, Digital Twin, or analysis workflow. / اسألني عن الاستخدام أو الـ Digital Twin أو التحليل.',
        },
    ]);

    const messagesRef = useRef(null);

    const availableQuestions = useMemo(() => QUICK_QUESTIONS, []);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            if (messagesRef.current) {
                messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
            }
        });
    };

    const pushMessage = (role, text) => {
        setMessages((prev) => [...prev, { role, text }]);
        scrollToBottom();
    };

    const askQuestion = (question) => {
        const trimmed = question.trim();
        if (!trimmed) return;

        pushMessage('user', trimmed);

        const bestAnswer = findBestAnswer(trimmed);
        if (bestAnswer) {
            pushMessage('bot', bestAnswer);
            return;
        }

        pushMessage(
            'bot',
            'I do not have a saved answer for this yet. Try one of the suggested questions below. / لسه معنديش إجابة محفوظة للسؤال ده، جرب سؤال من المقترحات بالأسفل.'
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        askQuestion(input);
        setInput('');
    };

    return (
        <>
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-5 right-5 z-[120] inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-zinc-950/95 px-4 py-3 text-sm font-semibold text-cyan-200 shadow-[0_10px_30px_rgba(8,145,178,0.3)] backdrop-blur-md transition hover:border-cyan-300/60 hover:text-cyan-100"
                    aria-label="Open NeuroGuard assistant"
                >
                    <MessageCircle size={18} />
                    Ask NeuroGuard
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-5 right-5 z-[120] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-cyan-300/20 bg-zinc-950/95 shadow-[0_16px_50px_rgba(2,6,23,0.7)] backdrop-blur-lg">
                    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-200">
                                <Bot size={16} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-zinc-100">NeuroGuard Assistant</p>
                                <p className="text-xs text-zinc-400">Saved FAQ Replies / ردود محفوظة</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                            aria-label="Close assistant"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div ref={messagesRef} className="flex max-h-[320px] min-h-[220px] flex-col gap-2 overflow-y-auto px-3 py-3">
                        {messages.map((message, index) =>
                            message.role === 'bot' ? (
                                <BotMessage key={`${message.role}-${index}`}>{message.text}</BotMessage>
                            ) : (
                                <UserMessage key={`${message.role}-${index}`}>{message.text}</UserMessage>
                            )
                        )}
                    </div>

                    <div className="border-t border-zinc-800 px-3 py-2">
                        <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">Suggested Questions</p>
                        <div className="mb-2 flex flex-wrap gap-2">
                            {availableQuestions.map((question) => (
                                <button
                                    key={question}
                                    type="button"
                                    onClick={() => askQuestion(question)}
                                    className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                                >
                                    {question}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question... / اكتب سؤالك"
                                className="h-10 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-cyan-400/60"
                            />
                            <button
                                type="submit"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/15 text-cyan-200 transition hover:border-cyan-300/70 hover:bg-cyan-400/25"
                                aria-label="Send question"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
