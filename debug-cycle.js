
// Native fetch check automatically handled by Node 18+

async function run() {
    try {
        console.log('1. Creating exam...');
        const createRes = await fetch('http://localhost:3000/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'NodeTestExam' })
        });
        const createData = await createRes.json();
        console.log('Create Response:', createData);

        if (!createData.id) {
            console.error('Failed to create exam');
            return;
        }

        const id = createData.id;
        console.log(`Exam created with ID: ${id}`);

        console.log('2. Deleting exam...');
        const deleteRes = await fetch(`http://localhost:3000/api/exams/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPinInput: 'admin1234' })
        });

        console.log('Delete status:', deleteRes.status);
        const deleteData = await deleteRes.json();
        console.log('Delete Response:', deleteData);

    } catch (e) {
        console.error('Error:', e);
    }
}

// Polyfill fetch if needed (Node 18 has it global)
if (!global.fetch) {
    console.log('No global fetch, this script might fail on old Node.');
}

run();
