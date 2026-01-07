"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getInterviewData,
  saveQuestions,
  saveAnswer,
  type InterviewQuestion,
} from "~/lib/storage";

type InterviewState =
  | "loading"
  | "asking"
  | "listening"
  | "processing"
  | "complete";

interface QuestionHistory {
  question: string;
  answer: string;
}

export default function InterviewPage() {
  const router = useRouter();
  const [state, setState] = useState<InterviewState>("loading");
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionHistory, setQuestionHistory] = useState<QuestionHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [followUpCount, setFollowUpCount] = useState(0);
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const hasLoadedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Load interview data and generate questions
  useEffect(() => {
    if (hasLoadedRef.current) return;

    const loadInterview = async () => {
      const data = getInterviewData();
      if (!data?.jobDescription) {
        router.push("/");
        return;
      }

      hasLoadedRef.current = true;
      setJobDescription(data.jobDescription);

      try {
        const response = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobDescription: data.jobDescription }),
        });

        if (!response.ok) throw new Error("Failed to generate questions");

        const result = await response.json();
        setQuestions(result.questions);
        saveQuestions(result.questions);

        // Set the first question
        if (result.questions.length > 0) {
          setCurrentQuestion(result.questions[0]);
          setState("asking");
        }
      } catch (err) {
        setError("Failed to load interview questions. Please try again.");
        console.error(err);
      }
    };

    loadInterview();
  }, [router]);

  // Speak the current question using OpenAI TTS
  const speakQuestion = useCallback(async (text: string) => {
    try {
      // Reset displayed text and start fetching audio
      setDisplayedText("");
      setIsAudioPlaying(false);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Start typewriter effect when audio starts
      audio.onplay = () => {
        setIsAudioPlaying(true);
        const duration = audio.duration || 5; // fallback 5 seconds
        const charDelay = (duration * 1000) / text.length;
        
        let index = 0;
        const typeInterval = setInterval(() => {
          if (index < text.length) {
            setDisplayedText(text.slice(0, index + 1));
            index++;
          } else {
            clearInterval(typeInterval);
          }
        }, charDelay);

        // Store interval to clear on audio end
        audio.dataset.typeInterval = String(typeInterval);
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsAudioPlaying(false);
        setDisplayedText(""); // Hide text when audio ends
        // Clear any remaining interval
        if (audio.dataset.typeInterval) {
          clearInterval(Number(audio.dataset.typeInterval));
        }
        setState("listening");
        startRecording();
      };

      audio.onerror = () => {
        setError("Failed to play audio");
      };

      await audio.play();
    } catch (err) {
      console.error("TTS Error:", err);
      setError("Failed to generate speech. Please try again.");
    }
  }, []);

  // Start when state changes to "asking"
  useEffect(() => {
    if (state === "asking" && currentQuestion) {
      speakQuestion(currentQuestion);
    }
  }, [state, currentQuestion, speakQuestion]);

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
    } catch (err) {
      console.error("Recording Error:", err);
      setError("Failed to access microphone");
    }
  };

  // Stop recording and transcribe
  const stopRecordingAndTranscribe = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error("No recording in progress"));
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          const formData = new FormData();
          formData.append("audio", audioBlob);

          const response = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("Transcription failed");

          const result = await response.json();
          resolve(result.text || "");
        } catch (err) {
          reject(err);
        }
      };

      mediaRecorder.stop();
    });
  };

  // Evaluate answer and check if follow-up is needed
  const evaluateAnswer = async (
    question: string,
    answer: string
  ): Promise<{ needsFollowUp: boolean; followUpQuestion?: string }> => {
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          currentQuestion: question,
          userAnswer: answer,
          questionHistory,
        }),
      });

      if (!response.ok) throw new Error("Evaluation failed");

      const result = await response.json();
      return {
        needsFollowUp: result.needsFollowUp,
        followUpQuestion: result.followUpQuestion,
      };
    } catch (err) {
      console.error("Evaluation error:", err);
      return { needsFollowUp: false };
    }
  };

  const handleDoneAnswering = useCallback(async () => {
    setState("processing");

    try {
      const transcribedText = await stopRecordingAndTranscribe();

      // Save to history
      const newHistoryEntry = { question: currentQuestion, answer: transcribedText };
      setQuestionHistory((prev) => [...prev, newHistoryEntry]);
      saveAnswer(currentQuestion, transcribedText);

      // Evaluate if follow-up is needed
      const { needsFollowUp, followUpQuestion } = await evaluateAnswer(
        currentQuestion,
        transcribedText
      );

      setTimeout(() => {
        if (needsFollowUp && followUpQuestion && followUpCount < 2) {
          // Ask follow-up question
          setFollowUpCount((prev) => prev + 1);
          setCurrentQuestion(followUpQuestion);
          setState("asking");
        } else if (currentQuestionIndex < questions.length - 1) {
          // Move to next main question
          setFollowUpCount(0);
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          setCurrentQuestion(questions[nextIndex]!);
          setState("asking");
        } else {
          // Interview complete
          setState("complete");
          router.push("/analysis");
        }
      }, 1000);
    } catch (err) {
      console.error("Processing Error:", err);
      setError("Failed to process your answer. Please try again.");
    }
  }, [currentQuestion, currentQuestionIndex, questions, router, jobDescription, questionHistory, followUpCount]);

  const getOrbClass = () => {
    switch (state) {
      case "listening":
        return "interview-orb listening";
      case "processing":
        return "interview-orb processing";
      default:
        return "interview-orb";
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case "loading":
        return "Preparing your interview...";
      case "asking":
        return "Interviewer speaking...";
      case "listening":
        return "Recording your answer...";
      case "processing":
        return "Analyzing response...";
      case "complete":
        return "Interview complete!";
    }
  };

  // Calculate progress including potential follow-ups
  const progressPercent =
    questions.length > 0
      ? Math.min(((questionHistory.length + 0.5) / (questions.length + 2)) * 100, 95)
      : 0;

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Error</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <button className="btn-primary" onClick={() => router.push("/")}>
            Start Over
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>
              {state === "loading"
                ? "Starting..."
                : `Question ${questionHistory.length + 1}`}
            </span>
            <span>{getStateLabel()}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main interview area */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl text-center">
        {/* Animated orb */}
        <div className="mb-12">
          <div className={getOrbClass()} />
        </div>

        {/* Current question - only show during audio playback */}
        {state === "asking" && isAudioPlaying && displayedText && (
          <div className="animate-fade-in mb-8">
            <p className="text-xl md:text-2xl font-medium text-white/90 leading-relaxed">
              {displayedText}
              <span className="animate-pulse">|</span>
            </p>
          </div>
        )}

        {/* Recording indicator */}
        {state === "listening" && (
          <div className="w-full mb-8 animate-fade-in">
            <div className="flex items-center justify-center gap-3 text-green-400 mb-4">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span>Recording...</span>
            </div>
          </div>
        )}

        {/* Done button */}
        {state === "listening" && (
          <button
            className="btn-primary animate-fade-in"
            onClick={handleDoneAnswering}
          >
            I'm Done Answering
          </button>
        )}

        {/* Loading spinner */}
        {(state === "loading" || state === "processing") && (
          <div className="flex items-center gap-3 text-white/60">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>
              {state === "loading"
                ? "Generating interview questions..."
                : "Analyzing your response..."}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
