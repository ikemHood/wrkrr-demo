/**
 * Speech utilities using Web Speech API
 * 
 * Note: Web Speech API types are extended from DOM lib
 */

// Declare Web Speech API types for TypeScript
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

// Check if speech synthesis is available
export function isSpeechSynthesisAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Check if speech recognition is available
export function isSpeechRecognitionAvailable(): boolean {
    return (
        typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
}

// Speak text using Web Speech API
export function speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!isSpeechSynthesisAvailable()) {
            reject(new Error("Speech synthesis not available"));
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to use a natural-sounding voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
            (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") || v.name.includes("Premium"))
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(new Error(e.error));

        window.speechSynthesis.speak(utterance);
    });
}

// Stop speaking
export function stopSpeaking(): void {
    if (isSpeechSynthesisAvailable()) {
        window.speechSynthesis.cancel();
    }
}

// Get speech recognition constructor
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// Create a speech recognition instance
export function createSpeechRecognition(): SpeechRecognition | null {
    const SpeechRecognitionConstructor = getSpeechRecognition();
    if (!SpeechRecognitionConstructor) return null;

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    return recognition;
}

// Start listening and return transcript
export function startListening(
    onInterimResult?: (text: string) => void,
    onFinalResult?: (text: string) => void,
    onError?: (error: Error) => void
): SpeechRecognition | null {
    const recognition = createSpeechRecognition();
    if (!recognition) {
        onError?.(new Error("Speech recognition not available"));
        return null;
    }

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result?.[0]) {
                const transcript = result[0].transcript;
                if (result.isFinal) {
                    finalTranscript += transcript + " ";
                    onFinalResult?.(finalTranscript.trim());
                } else {
                    interimTranscript += transcript;
                }
            }
        }

        if (interimTranscript) {
            onInterimResult?.(finalTranscript + interimTranscript);
        }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        onError?.(new Error(event.error));
    };

    recognition.start();
    return recognition;
}

export type { SpeechRecognition };
