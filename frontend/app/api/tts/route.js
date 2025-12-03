import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');

    if (!text) {
        return NextResponse.json({ error: 'Text parameter required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${BACKEND_URL}/tts?text=${encodeURIComponent(text)}`);

        if (!response.ok) {
            throw new Error(`TTS API returned ${response.status}`);
        }

        // Stream the audio response
        const audioBlob = await response.blob();

        return new NextResponse(audioBlob, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBlob.size.toString(),
            },
        });
    } catch (error) {
        console.error('TTS Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate audio' },
            { status: 500 }
        );
    }
}
