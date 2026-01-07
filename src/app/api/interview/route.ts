import { openrouter } from "~/lib/ai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
    jobDescription: z.string().min(1),
    currentQuestion: z.string().optional(),
    userAnswer: z.string().optional(),
    questionHistory: z
        .array(
            z.object({
                question: z.string(),
                answer: z.string(),
            })
        )
        .optional(),
});

const responseSchema = z.object({
    questions: z
        .array(z.string())
        .describe("Interview questions tailored to the job description"),
    needsFollowUp: z
        .boolean()
        .describe("Whether the last answer needs a follow-up question"),
    followUpQuestion: z
        .string()
        .optional()
        .describe("Follow-up question if the answer was unsatisfactory"),
    followUpReason: z
        .string()
        .optional()
        .describe("Brief reason why a follow-up is needed"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { jobDescription, currentQuestion, userAnswer, questionHistory } =
            requestSchema.parse(body);

        // If we have a current question and answer, evaluate if follow-up is needed
        if (currentQuestion && userAnswer) {
            const { object } = await generateObject({
                model: openrouter("openai/gpt-5.2"),
                schema: responseSchema,
                prompt: `You are an experienced technical interviewer conducting a realistic interview.

Job Description:
${jobDescription}

Interview History:
${questionHistory?.map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`).join("\n\n") || "None"}

Current Question: ${currentQuestion}
Candidate's Answer: ${userAnswer}

Evaluate the answer and decide:
1. If the answer is vague, incomplete, or needs clarification - set needsFollowUp to true and provide a follow-up question
2. If the answer is satisfactory - set needsFollowUp to false

A follow-up is needed when:
- The answer is too short or lacking detail
- The candidate didn't provide concrete examples
- Important aspects of the question weren't addressed
- The answer seems rehearsed without real substance

Keep follow-up questions natural and conversational, like a real interviewer would ask.
Set questions to an empty array since we're evaluating, not generating new questions.`,
            });

            return NextResponse.json(object);
        }

        // Generate initial questions
        const { object } = await generateObject({
            model: openrouter("openai/gpt-5.2"),
            schema: responseSchema,
            prompt: `You are an experienced technical interviewer. Based on the following job description, generate 3-4 interview questions that would help assess a candidate's fit for this role.

The questions should:
- Be relevant to the specific role and requirements
- Include a mix of behavioral and technical questions
- Be open-ended to encourage detailed responses
- Progress from easier to more challenging
- Sound natural, like a real interviewer would ask

Job Description:
${jobDescription}

Generate thoughtful, professional interview questions. Set needsFollowUp to false for initial generation.`,
        });

        return NextResponse.json(object);
    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json(
            { error: "Failed to generate questions" },
            { status: 500 }
        );
    }
}
