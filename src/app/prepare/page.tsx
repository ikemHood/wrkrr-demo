"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInterviewData } from "~/lib/storage";

export default function PreparePage() {
  const router = useRouter();
  const [micEnabled, setMicEnabled] = useState(false);
  const [speakerTested, setSpeakerTested] = useState(false);
  const [micPermission, setMicPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);

  useEffect(() => {
    const data = getInterviewData();
    if (!data?.jobDescription) {
      router.push("/");
    }
  }, [router]);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
      setMicEnabled(true);
    } catch {
      setMicPermission("denied");
      setMicEnabled(false);
    }
  };

  const testSpeaker = async () => {
    setIsTestingSpeaker(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Hello! I will be your interviewer today.",
        }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setSpeakerTested(true);
        setIsTestingSpeaker(false);
      };

      audio.onerror = () => {
        setIsTestingSpeaker(false);
      };

      await audio.play();
    } catch (error) {
      console.error("Speaker test failed:", error);
      setIsTestingSpeaker(false);
      setSpeakerTested(true);
    }
  };

  const canStart = micEnabled && speakerTested;

  const handleStartInterview = () => {
    if (canStart) {
      router.push("/interview");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="glass-card w-full max-w-lg p-8 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">before we start</h1>
          <p className="text-[--color-text-muted] text-sm">
            make sure your mic and speakers work
          </p>
        </div>

        {/* What to expect */}
        <div className="mb-8 p-4 rounded-lg bg-[--color-border]/30">
          <p className="text-sm text-[--color-text-muted] mb-3">what to expect:</p>
          <ul className="space-y-2 text-sm">
            <li>• 3-5 questions based on the job</li>
            <li>• ai will speak, you answer verbally</li>
            <li>• get feedback at the end</li>
          </ul>
        </div>

        {/* Permission toggles */}
        <div className="space-y-4 mb-8">
          {/* Microphone */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-[--color-surface] border border-[--color-border]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[--color-border] flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">microphone</p>
                <p className="text-xs text-[--color-text-muted]">
                  {micPermission === "granted"
                    ? "ready"
                    : micPermission === "denied"
                      ? "denied"
                      : "click to enable"}
                </p>
              </div>
            </div>
            <button
              onClick={requestMicPermission}
              className={`toggle-switch ${micEnabled ? "active" : ""}`}
            />
          </div>

          {/* Speaker */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-[--color-surface] border border-[--color-border]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[--color-border] flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">speaker</p>
                <p className="text-xs text-[--color-text-muted]">
                  {isTestingSpeaker
                    ? "playing..."
                    : speakerTested
                      ? "working"
                      : "click to test"}
                </p>
              </div>
            </div>
            <button
              onClick={testSpeaker}
              disabled={isTestingSpeaker}
              className={`toggle-switch ${speakerTested ? "active" : ""}`}
            />
          </div>
        </div>

        <button
          className="btn-primary w-full"
          onClick={handleStartInterview}
          disabled={!canStart}
        >
          start interview
        </button>

        {!canStart && (
          <p className="text-center text-xs text-[--color-text-muted] mt-4">
            enable both to continue
          </p>
        )}

        <button
          onClick={() => router.push("/")}
          className="w-full text-center text-[--color-text-muted] hover:text-[--color-text] text-sm mt-6"
        >
          ← back
        </button>
      </div>
    </main>
  );
}
