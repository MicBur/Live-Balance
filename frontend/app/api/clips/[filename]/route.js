import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export async function GET(request, { params }) {
    const filename = params.filename;

    try {
        const response = await fetch(`${BACKEND_URL}/clips/${filename}`);

        if (!response.ok) {
            throw new Error(`Clips API returned ${response.status}`);
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
        console.error('Clips Error:', error);
        return NextResponse.json(
            { error: 'Failed to get audio clip' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    const filename = params.filename;

    try {
        const response = await fetch(`${BACKEND_URL}/clips/${filename}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Backend returned ${response.status}: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Delete Clip Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete clip' },
            { status: 500 }
        );
    }
}
