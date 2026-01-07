"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveJobDescription } from "~/lib/storage";

export default function Home() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (!jobDescription.trim()) return;

    setIsLoading(true);
    saveJobDescription(jobDescription.trim());
    router.push("/prepare");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="glass-card w-full max-w-2xl p-8 md:p-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-2">wrkrr</h1>
          <p className="text-[--color-text-muted]">
            practice interviews with ai
          </p>
        </div>

        {/* Job Description Input */}
        <div className="space-y-5">
          <div>
            <label
              htmlFor="job-description"
              className="block text-sm text-[--color-text-muted] mb-2"
            >
              paste the job description
            </label>
            <textarea
              id="job-description"
              className="textarea-premium w-full h-56"
              placeholder="paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <button
            className="btn-primary w-full"
            onClick={handleContinue}
            disabled={!jobDescription.trim() || isLoading}
          >
            {isLoading ? "loading..." : "continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
