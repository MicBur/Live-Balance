import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export async function GET(request, { params }) {
    const path = params.path.join('/');
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/${path}${queryString ? `?${queryString}` : ''}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('API Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from backend' },
            { status: 500 }
        );
    }
}

export async function POST(request, { params }) {
    const path = params.path.join('/');
    const url = `${BACKEND_URL}/${path}`;

    try {
        const contentType = request.headers.get('content-type') || '';

        // Handle FormData (file uploads)
        if (contentType.includes('multipart/form-data') || path === 'transcribe-prompt' || path === 'upload') {
            const formData = await request.formData();

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            // Check if response is actually JSON before parsing
            const responseContentType = response.headers.get('content-type') || '';
            if (responseContentType.includes('application/json')) {
                const data = await response.json();
                return NextResponse.json(data, { status: response.status });
            } else {
                // Return text response for non-JSON
                const text = await response.text();
                return new NextResponse(text, { status: response.status });
            }
        }

        // Handle JSON
        const body = await request.json();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('API Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from backend' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    const path = params.path.join('/');
    const body = await request.json();
    const url = `${BACKEND_URL}/${path}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('API Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from backend' },
            { status: 500 }
        );
    }
}
