import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
    jobDescription: z.string().min(1),
});

const questionsSchema = z.object({
    questions: z
        .array(z.string())
        .min(3)
        .max(5)
        .describe("Interview questions tailored to the job description"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { jobDescription } = requestSchema.parse(body);

        const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: questionsSchema,
            prompt: `You are an experienced technical interviewer. Based on the following job description, generate 3-5 interview questions that would help assess a candidate's fit for this role.

The questions should:
- Be relevant to the specific role and requirements
- Include a mix of behavioral and technical questions
- Be open-ended to encourage detailed responses
- Progress from easier to more challenging

Job Description:
${jobDescription}

Generate thoughtful, professional interview questions.`,
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
