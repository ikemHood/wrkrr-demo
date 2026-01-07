import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
    jobDescription: z.string().min(1),
    answers: z.array(
        z.object({
            question: z.string(),
            answer: z.string(),
        })
    ),
});

const analysisSchema = z.object({
    overallScore: z
        .number()
        .min(0)
        .max(100)
        .describe("Overall interview performance score from 0-100"),
    summary: z
        .string()
        .describe("Brief overall assessment of the interview performance"),
    strengths: z
        .array(z.string())
        .describe("Key strengths demonstrated in the interview"),
    improvements: z
        .array(z.string())
        .describe("Areas that could be improved"),
    questionFeedback: z
        .array(
            z.object({
                question: z.string(),
                score: z.number().min(0).max(100),
                feedback: z.string(),
            })
        )
        .describe("Detailed feedback for each question"),
    tips: z
        .array(z.string())
        .describe("Actionable tips for improving interview performance"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { jobDescription, answers } = requestSchema.parse(body);

        const formattedAnswers = answers
            .map(
                (a, i) => `Question ${i + 1}: ${a.question}
Answer: ${a.answer}`
            )
            .join("\n\n");

        const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: analysisSchema,
            prompt: `You are an expert interview coach analyzing a mock interview performance. Provide constructive, encouraging feedback that helps the candidate improve.

Job Description:
${jobDescription}

Interview Responses:
${formattedAnswers}

Analyze each response considering:
- Relevance to the question and job requirements
- Communication clarity and structure (STAR method usage)
- Specific examples and details provided
- Confidence and professionalism
- Technical accuracy (if applicable)

Provide balanced, actionable feedback that acknowledges strengths while identifying specific areas for improvement.`,
        });

        return NextResponse.json(object);
    } catch (error) {
        console.error("Error analyzing interview:", error);
        return NextResponse.json(
            { error: "Failed to analyze interview" },
            { status: 500 }
        );
    }
}
