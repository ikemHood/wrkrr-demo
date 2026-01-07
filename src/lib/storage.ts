/**
 * Session storage utilities for interview data
 */

export interface InterviewQuestion {
    question: string;
    answer: string;
}

export interface InterviewData {
    jobDescription: string;
    questions: string[];
    answers: InterviewQuestion[];
}

const STORAGE_KEY = "wrkrr_interview";

export function saveJobDescription(jobDescription: string): void {
    if (typeof window === "undefined") return;

    const data: InterviewData = {
        jobDescription,
        questions: [],
        answers: [],
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getInterviewData(): InterviewData | null {
    if (typeof window === "undefined") return null;

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored) as InterviewData;
    } catch {
        return null;
    }
}

export function saveQuestions(questions: string[]): void {
    if (typeof window === "undefined") return;

    const data = getInterviewData();
    if (!data) return;

    data.questions = questions;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveAnswer(question: string, answer: string): void {
    if (typeof window === "undefined") return;

    const data = getInterviewData();
    if (!data) return;

    data.answers.push({ question, answer });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearInterviewData(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEY);
}
