import { createOpenAI } from "@ai-sdk/openai";
import { env } from "~/env";

export const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});