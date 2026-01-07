"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getInterviewData, clearInterviewData } from "~/lib/storage";

interface QuestionFeedback {
  question: string;
  score: number;
  feedback: string;
}

interface AnalysisResult {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  questionFeedback: QuestionFeedback[];
  tips: string[];
}

export default function AnalysisPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;

    const loadAnalysis = async () => {
      const data = getInterviewData();
      if (!data?.jobDescription || !data.answers?.length) {
        router.push("/");
        return;
      }

      hasLoadedRef.current = true;

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription: data.jobDescription,
            answers: data.answers,
          }),
        });

        if (!response.ok) throw new Error("Failed to analyze interview");

        const result = await response.json();
        setAnalysis(result);
      } catch (err) {
        setError("Failed to analyze your interview.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [router]);


  const handleTryAgain = () => {
    clearInterviewData();
    router.push("/");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[--color-success]";
    if (score >= 60) return "text-[--color-warning]";
    return "text-[--color-accent]";
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="interview-orb processing mb-8 mx-auto" />
          <p className="text-[--color-text-muted]">analyzing your responses...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-[--color-text-muted] mb-4">{error}</p>
          <button className="btn-primary" onClick={handleTryAgain}>
            try again
          </button>
        </div>
      </main>
    );
  }

  if (!analysis) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header with score */}
        <div className="glass-card p-6 mb-6 text-center animate-fade-in">
          <h1 className="text-xl font-medium mb-4">your results</h1>

          <div className="flex justify-center mb-4">
            <div
              className="score-circle"
              style={{ "--score-percent": `${analysis.overallScore}%` } as React.CSSProperties}
            >
              <span className={getScoreColor(analysis.overallScore)}>
                {analysis.overallScore}
              </span>
            </div>
          </div>

          <p className="text-sm text-[--color-text-muted]">{analysis.summary}</p>
        </div>

        {/* Strengths */}
        <div className="glass-card p-5 mb-4 animate-fade-in">
          <p className="text-sm text-[--color-success] mb-3">strengths</p>
          <ul className="space-y-2 text-sm">
            {analysis.strengths.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div className="glass-card p-5 mb-4 animate-fade-in">
          <p className="text-sm text-[--color-warning] mb-3">to improve</p>
          <ul className="space-y-2 text-sm">
            {analysis.improvements.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>

        {/* Question breakdown */}
        <div className="glass-card p-5 mb-4 animate-fade-in">
          <p className="text-sm text-[--color-text-muted] mb-4">breakdown</p>
          <div className="space-y-4">
            {analysis.questionFeedback.map((qf, i) => (
              <div key={i} className="p-3 rounded-lg bg-[--color-border]/30">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className="text-sm font-medium">q{i + 1}</p>
                  <span className={`text-sm ${getScoreColor(qf.score)}`}>
                    {qf.score}%
                  </span>
                </div>
                <p className="text-xs text-[--color-text-muted]">{qf.feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="glass-card p-5 mb-6 animate-fade-in">
          <p className="text-sm text-[--color-text-muted] mb-3">tips</p>
          <ul className="space-y-2 text-sm">
            {analysis.tips.map((tip, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[--color-accent]">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="btn-primary flex-1" onClick={handleTryAgain}>
            try another
          </button>
          <button className="btn-secondary flex-1" onClick={() => router.push("/")}>
            home
          </button>
        </div>
      </div>
    </main>
  );
}
