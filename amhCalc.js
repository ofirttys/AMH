// Set max date to today
document.getElementById('birthDate').max = luxon.DateTime.now().toISODate();

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

// Load Google Charts
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initializeChart);

let chart;
let percentileData = {};

async function loadPercentileData() {
    try {
        for (const [percentileLabel, filePath] of Object.entries(percentileDataFiles)) {
            const response = await fetch(filePath);
            percentileData[percentileLabel] = await response.json();
        }
    } catch (error) {
        console.error('Error loading percentile data:', error);
        alert('Failed to load percentile data. Please check the data files.');
    }
}

function initializeChart() {
    // Load data first
    loadPercentileData().then(() => {
        const data = new google.visualization.DataTable();
        data.addColumn('number', 'Age');
        data.addColumn('number', '10% Percentile');
        data.addColumn({type: 'boolean', role: 'certainty'});
        data.addColumn('number', '25% Percentile');
        data.addColumn({type: 'boolean', role: 'certainty'});
        data.addColumn('number', '50% Percentile');
        data.addColumn({type: 'boolean', role: 'certainty'});
        data.addColumn('number', '75% Percentile');
        data.addColumn({type: 'boolean', role: 'certainty'});
        data.addColumn('number', '90% Percentile');
        data.addColumn({type: 'boolean', role: 'certainty'});
        data.addColumn('number', 'Patient');
        data.addColumn({type: 'string', role: 'style'});

        // Populate data with 0-50 ages and add percentile data
        const rows = [];
        for (let age = 0; age <= 50; age++) {
            const row = [
                age,
                percentileData['10%'][age], true,
                percentileData['25%'][age], true,
                percentileData['50%'][age], true,
                percentileData['75%'][age], true,
                percentileData['90%'][age], true,
                null, 'point {size: 10; shape-type: star; fill-color: blue;}'
            ];
            rows.push(row);
        }
        data.addRows(rows);

        const options = {
            title: 'AMH Levels by Age',
            curveType: 'function', // creates smooth lines
            legend: { position: 'bottom' },
            interpolateNulls: true,
            series: {
                0: { color: 'red' },
                1: { color: 'orange' },
                2: { color: 'black' },
                3: { color: 'green' },
                4: { color: 'darkgreen' },
                5: { type: 'scatter' }
            },
            trendlines: {
                0: { type: 'exponential', color: 'red', opacity: 0.5 },
                1: { type: 'exponential', color: 'orange', opacity: 0.5 },
                2: { type: 'exponential', color: 'black', opacity: 0.5 },
                3: { type: 'exponential', color: 'green', opacity: 0.5 },
                4: { type: 'exponential', color: 'darkgreen', opacity: 0.5 }
            },
            hAxis: { title: 'Age' },
            vAxis: { title: 'AMH Level (pmol/L)' }
        };

        chart = new google.visualization.LineChart(document.getElementById('chart_div'));
        chart.draw(data, options);
    });
}

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

    // Modify chart data to add patient point
    const data = chart.getDataTable();
    data.setValue(Math.round(age), 10, amhValue);
    chart.draw(data, chart.getOptions());
}