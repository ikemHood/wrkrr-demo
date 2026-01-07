import { openai } from "~/lib/ai";
import { NextResponse } from "next/server";


interface TTSRequest {
    text?: unknown;
}

export async function POST(request: Request) {
    try {
        const { text } = (await request.json()) as TTSRequest;

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        // Use OpenAI TTS API
        const response = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
            response_format: "mp3",
        });

        // Get the audio as ArrayBuffer
        const audioBuffer = await response.arrayBuffer();

        // Return audio as mp3
        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
            },
        });
    } catch (error) {
        console.error("TTS Error:", error);
        return NextResponse.json(
            { error: "Failed to generate speech" },
            { status: 500 }
        );
    }
}
