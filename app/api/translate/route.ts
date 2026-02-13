import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { text, target } = await request.json();
        if (!text) return NextResponse.json({ translated: '' });

        const sl = target === 'en' ? 'th' : 'en';
        const tl = target;

        // Using a public-access Google Translate endpoint (unofficial, use with caution)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;

        const res = await fetch(url);
        const data = await res.json();

        // Google Translate result format: [[["translated", "source", ...], ...]]
        const translatedText = data[0].map((s: any) => s[0]).join('');

        return NextResponse.json({ translated: translatedText });
    } catch (error) {
        console.error('Translation error:', error);
        return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }
}
