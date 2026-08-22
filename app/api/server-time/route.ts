import { NextResponse } from 'next/server';

// Dedicated endpoint for client/server clock-offset correction, polled independently
// from /api/exams/[id]. Keeping it separate lets that endpoint's response stay
// dedup-able by SWR (no per-request timestamp inside it), while offset correction
// can still refresh on its own (much less frequent) schedule.
export async function GET() {
    return NextResponse.json({ time: Date.now() });
}
