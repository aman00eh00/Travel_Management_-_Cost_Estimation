async function testEstimate() {
  try {
    const response = await fetch('http://localhost:3000/api/estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        origin: 'Delhi',
        destination: 'Mumbai',
        startDate: '2025-12-15',
        endDate: '2025-12-20',
        travelers: '2',
        accommodation: 'mid',
        transportation: 'economy'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('totalCost type:', typeof data.totalCost);
    console.log('totalCost value:', data.totalCost);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEstimate();
