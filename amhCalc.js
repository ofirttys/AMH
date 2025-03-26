// Set max date to today
document.getElementById('birthDate').max = luxon.DateTime.now().toISODate();

// Add radio button for age input method
document.getElementById('inputForm').innerHTML += `
    <div class="form-group">
        <label>Input Method:</label>
        <label>
            <input type="radio" name="inputMethod" value="date" checked> Date of Birth
        </label>
        <label>
            <input type="radio" name="inputMethod" value="age"> Direct Age
        </label>
    </div>
    <div id="ageInputGroup" style="display:none;" class="form-group">
        <label for="ageInput">Age:</label>
        <input type="number" id="ageInput" step="0.1" min="0" max="50" placeholder="Enter Age">
    </div>
`;

// Toggle input method
document.querySelectorAll('input[name="inputMethod"]').forEach(radio => {
    radio.addEventListener('change', function() {
        document.getElementById('birthDate').parentElement.style.display = 
            this.value === 'date' ? 'block' : 'none';
        document.getElementById('ageInputGroup').style.display = 
            this.value === 'age' ? 'block' : 'none';
    });
});

// Percentile data file paths
const percentileDataFiles = {
    '10%': 'data/10th-percentile.json',
    '25%': 'data/25th-percentile.json',
    '50%': 'data/50th-percentile.json',
    '75%': 'data/75th-percentile.json',
    '90%': 'data/90th-percentile.json'
};

const chartConfig = {
    type: 'line',
    data: {
        labels: Array.from({length: 51}, (_, i) => i),
        datasets: [
            {
                label: '10% Percentile',
                data: [],
                borderColor: '#FF0000',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: '25% Percentile',
                data: [],
                borderColor: '#FFC000',
                backgroundColor: 'rgba(255, 192, 0, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: '50% Percentile',
                data: [],
                borderColor: 'black',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: '75% Percentile',
                data: [],
                borderColor: '#92D050',
                backgroundColor: 'rgba(146, 208, 80, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: '90% Percentile',
                data: [],
                borderColor: '#00B050',
                backgroundColor: 'rgba(0, 176, 80, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Patient',
                data: [],
                type: 'scatter',
                borderColor: 'blue',
                backgroundColor: 'blue',
                pointStyle: 'cross',
                pointRadius: 8
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'AMH Levels by Age',
                font: {
                    size: 18
                }
            },
            legend: {
                position: 'bottom'
            }
        },
        scales: {
            x: {
                type: 'linear',
                title: {
                    display: true,
                    text: 'Age'
                },
                min: 0,
                max: 50
            },
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'AMH Level (pmol/L)'
                }
            }
        }
    }
};

// Create the chart
const ctx = document.getElementById('multiLineChart').getContext('2d');
const chart = new Chart(ctx, chartConfig);

// Function to load percentile data
async function loadPercentileData() {
    try {
        for (let i = 0; i < 5; i++) {
            const percentileLabel = Object.keys(percentileDataFiles)[i];
            const response = await fetch(percentileDataFiles[percentileLabel]);
            const data = await response.json();
            
            // Update the corresponding dataset
            chart.data.datasets[i].data = data;
        }
        
        // Update the chart after loading all data
        chart.update();
    } catch (error) {
        console.error('Error loading percentile data:', error);
        alert('Failed to load percentile data. Please check the data files.');
    }
}

// Load percentile data when the page loads
loadPercentileData();

function addDataPoint() {
    // Get input method
    const dateMethod = document.querySelector('input[name="inputMethod"]:checked').value === 'date';
    
    let age, amhValue;

    // Validate AMH value
    amhValue = parseFloat(document.getElementById('valueInput').value);
    if (isNaN(amhValue) || amhValue <= 0) {
        alert('Please enter a valid AMH level greater than 0');
        return;
    }

    // Get age based on input method
    if (dateMethod) {
        // Date of Birth method
        const birthDateInput = document.getElementById('birthDate').value;
        if (!birthDateInput) {
            alert('Please select a birth date');
            return;
        }
        const birthDate = luxon.DateTime.fromISO(birthDateInput);
        const currentDate = luxon.DateTime.now();
        age = currentDate.diff(birthDate, 'years').years;
    } else {
        // Direct Age method
        const ageInput = document.getElementById('ageInput').value;
        if (ageInput === '') {
            alert('Please enter an age');
            return;
        }
        age = parseFloat(ageInput);
        if (isNaN(age) || age < 0 || age > 50) {
            alert('Please enter a valid age between 0 and 50');
            return;
        }
    }

    // Clear previous user point
    chart.data.datasets[5].data = [];

    // Add new point with correct age and AMH value
    chart.data.datasets[5].data.push({
        x: age,
        y: amhValue
    });

    // Update the chart
    chart.update();
}