import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageCircle, Send, X } from 'lucide-react';

const FAQ_ENTRIES = [
    {
        id: 'what-is-neurogaurd',
        question: 'What is NeuroGaurd?',
        triggers: ['what is neurogaurd', 'neurogaurd', 'ايه هو neurogaurd', 'ما هو neurogaurd'],
        answer:
            'NeuroGaurd is an AI-powered platform for brain tumor analysis and treatment support. It helps doctors and teams visualize MRI findings, estimate treatment response, and review Digital Twin simulations.',
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
            'No. NeuroGaurd is a decision-support system. Final diagnosis and treatment planning should always be confirmed by licensed medical professionals.',
    },
    {
        id: 'supported-input',
        question: 'What input does NeuroGaurd need?',
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
    'What is NeuroGaurd?',
    'How can I use it?',
    'What does the Digital Twin page do?',
    'Is this a final medical diagnosis?',
    'ايه هو NeuroGaurd؟',
    'ازاي اقدر استخدمه؟',
];

const BOT_THINKING_DELAY_MS = 420;
const BOT_TYPING_SPEED_MS = 14;

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
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="max-w-[90%] self-start rounded-2xl rounded-bl-md border border-cyan-400/20 bg-zinc-900/85 px-3 py-2 text-sm text-zinc-200"
        >
            {children}
        </motion.div>
    );
}

function UserMessage({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="max-w-[90%] self-end rounded-2xl rounded-br-md bg-cyan-400 px-3 py-2 text-sm font-medium text-zinc-950"
        >
            {children}
        </motion.div>
    );
}

function TypingIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="max-w-[90%] self-start rounded-2xl rounded-bl-md border border-cyan-400/20 bg-zinc-900/85 px-3 py-2"
        >
                {botStatus === 'typing' && (
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <div className="flex items-end gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-bounce [animation-delay:-0.2s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-bounce [animation-delay:-0.1s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-bounce" />
                        </div>
                        NeuroGaurd is typing...
                    </div>
                )}
        </motion.div>
    );
}

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [botStatus, setBotStatus] = useState('idle');
    const [messages, setMessages] = useState([
        {
            id: 'm-1',
            role: 'bot',
            text: 'Hi. I am NeuroGaurd Assistant. Ask me about usage, Digital Twin, or analysis workflow. / اسألني عن الاستخدام أو الـ Digital Twin أو التحليل.',
        },
    ]);

    const messagesRef = useRef(null);
    const nextMessageIdRef = useRef(2);
    const typingDelayRef = useRef(null);
    const typingIntervalRef = useRef(null);

    const availableQuestions = useMemo(() => QUICK_QUESTIONS, []);

    useEffect(
        () => () => {
            if (typingDelayRef.current) {
                clearTimeout(typingDelayRef.current);
                typingDelayRef.current = null;
            }

            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
            }
        },
        []
    );

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            if (messagesRef.current) {
                messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
            }
        });
    };

    useEffect(() => {
        if (!isOpen) return;
        scrollToBottom();
    }, [messages, botStatus, isOpen]);

    const clearTypingTimers = () => {
        if (typingDelayRef.current) {
            clearTimeout(typingDelayRef.current);
            typingDelayRef.current = null;
        }

        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
        }
    };

    const pushMessage = (role, text) => {
        const id = `m-${nextMessageIdRef.current++}`;
        setMessages((prev) => [...prev, { id, role, text }]);
        return id;
    };

    const typeBotReply = (fullReply) => {
        clearTypingTimers();
        setBotStatus('thinking');

        typingDelayRef.current = setTimeout(() => {
            const botMessageId = pushMessage('bot', '');
            setBotStatus('typing');

            let cursor = 0;

            typingIntervalRef.current = setInterval(() => {
                cursor += 1;
                const nextText = fullReply.slice(0, cursor);

                setMessages((prev) =>
                    prev.map((message) =>
                        message.id === botMessageId
                            ? { ...message, text: nextText }
                            : message
                    )
                );

                if (cursor >= fullReply.length) {
                    clearInterval(typingIntervalRef.current);
                    typingIntervalRef.current = null;
                    setBotStatus('idle');
                }
            }, BOT_TYPING_SPEED_MS);
        }, BOT_THINKING_DELAY_MS);
    };

    const askQuestion = (question) => {
        if (botStatus !== 'idle') return false;

        const trimmed = question.trim();
        if (!trimmed) return false;

        pushMessage('user', trimmed);

        const bestAnswer = findBestAnswer(trimmed);
        if (bestAnswer) {
            typeBotReply(bestAnswer);
            return true;
        }

        typeBotReply(
            'I do not have a saved answer for this yet. Try one of the suggested questions below. / لسه معنديش إجابة محفوظة للسؤال ده، جرب سؤال من المقترحات بالأسفل.'
        );

        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const sent = askQuestion(input);
        if (sent) setInput('');
    };

    return (
        <>
            <AnimatePresence>
                {!isOpen && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => setIsOpen(true)}
                            className="ask-button-redesign flex items-center gap-2"
                            aria-label="Open NeuroGaurd assistant"
                        >
                            <MessageCircle size={18} />
                            Ask NeuroGaurd
                        </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 22, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        transition={{ duration: 0.24 }}
                        className="fixed bottom-7 right-7 z-[120] w-[min(92vw,390px)] overflow-hidden rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-200">
                                    <Bot size={16} />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-100">NeuroGaurd Assistant</p>
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
                            <AnimatePresence initial={false}>
                                {messages.map((message) =>
                                    message.role === 'bot' ? (
                                        <BotMessage key={message.id}>{message.text}</BotMessage>
                                    ) : (
                                        <UserMessage key={message.id}>{message.text}</UserMessage>
                                    )
                                )}
                                {botStatus === 'thinking' && <TypingIndicator key="typing-indicator" />}
                            </AnimatePresence>
                        </div>

                        <div className="border-t border-zinc-800 px-3 py-2">
                            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">Suggested Questions</p>
                            <div className="mb-2 flex flex-wrap gap-2">
                                {availableQuestions.map((question) => (
                                    <button
                                        key={question}
                                        type="button"
                                        disabled={botStatus !== 'idle'}
                                        onClick={() => askQuestion(question)}
                                        className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    disabled={botStatus !== 'idle'}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={botStatus === 'idle' ? 'Ask a question... / اكتب سؤالك' : 'NeuroGaurd is typing...'}
                                    className="h-10 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-cyan-400/60 disabled:opacity-60"
                                />
                                <motion.button
                                    whileHover={botStatus === 'idle' ? { scale: 1.05 } : {}}
                                    whileTap={botStatus === 'idle' ? { scale: 0.96 } : {}}
                                    type="submit"
                                    disabled={botStatus !== 'idle'}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/15 text-cyan-200 transition hover:border-cyan-300/70 hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-45"
                                    aria-label="Send question"
                                >
                                    <Send size={16} />
                                </motion.button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
