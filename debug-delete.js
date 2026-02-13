
async function run() {
    try {
        console.log('Attempting to delete exam 17...');
        const res = await fetch('http://localhost:3000/api/exams/17', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPinInput: 'admin1234' })
        });

        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Response:', data);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

run();
