import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { env } from "~/env";

export const openrouter = createOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });