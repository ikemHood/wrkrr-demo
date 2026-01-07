import { NextResponse } from "next/server";
import { openai } from "~/lib/ai";


export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const audioBlob = formData.get("audio") as Blob;

        if (!audioBlob) {
            return NextResponse.json(
                { error: "Audio file is required" },
                { status: 400 }
            );
        }

        // Convert Blob to File for OpenAI API
        const audioFile = new File([audioBlob], "audio.webm", {
            type: audioBlob.type || "audio/webm",
        });

        // Use OpenAI Whisper API for transcription
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "en",
        });

        return NextResponse.json({ text: transcription.text });
    } catch (error) {
        console.error("STT Error:", error);
        return NextResponse.json(
            { error: "Failed to transcribe audio" },
            { status: 500 }
        );
    }
}
