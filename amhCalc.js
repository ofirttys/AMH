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

    // Trigger initial display state
    if (radio.checked) {
        radio.dispatchEvent(new Event('change'));
    }
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

let chartInstance = null;
let chartData = null;
let chartOptions = null;
let percentileData = {};

function interpolateData(data, minAge = 0, maxAge = 50) {
    // Create an array to store interpolated values
    const interpolatedData = new Array(maxAge + 1).fill(null);

    // Sort data by x (age)
    data.sort((a, b) => a.x - b.x);

    // Interpolate values for whole number ages
    for (let age = minAge; age <= maxAge; age++) {
        // Find the closest two data points
        const closestPoints = data.filter(point => Math.floor(point.x) === age);
        
        if (closestPoints.length > 0) {
            // If we have points exactly at this age, take the average
            const avgValue = closestPoints.reduce((sum, point) => sum + point.y, 0) / closestPoints.length;
            interpolatedData[age] = avgValue;
        } else {
            // If no exact match, do linear interpolation
            const lowerPoint = data.filter(point => point.x < age).pop();
            const upperPoint = data.find(point => point.x > age);

            if (lowerPoint && upperPoint) {
                const t = (age - lowerPoint.x) / (upperPoint.x - lowerPoint.x);
                interpolatedData[age] = lowerPoint.y + t * (upperPoint.y - lowerPoint.y);
            }
        }
    }

    return interpolatedData;
}

async function loadPercentileData() {
    try {
        for (const [percentileLabel, filePath] of Object.entries(percentileDataFiles)) {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
            }
            const data = await response.json();
            
            // Interpolate data to get values for whole number ages
            percentileData[percentileLabel] = interpolateData(data);
        }
        return true;
    } catch (error) {
        alert(`Failed to load percentile data: ${error.message}`);
        return false;
    }
}

function initializeChart() {
    // Set direct age input as default
    document.querySelector('input[name="inputMethod"][value="age"]').checked = true;
    document.getElementById('birthDate').parentElement.style.display = 'none';
    document.getElementById('ageInputGroup').style.display = 'block';

    // Add AMH units radio buttons
    document.getElementById('inputForm').innerHTML += `
        <div class="form-group">
            <label>AMH Units:</label>
            <label>
                <input type="radio" name="amhUnits" value="pmol/L" checked> pmol/L
            </label>
            <label>
                <input type="radio" name="amhUnits" value="ng/ml"> ng/ml
            </label>
        </div>
    `;

    // Load data first
    loadPercentileData().then((dataLoaded) => {
        if (!dataLoaded) return;

        chartData = new google.visualization.DataTable();
        chartData.addColumn('number', 'Age');
        chartData.addColumn('number', '10% Percentile');
        chartData.addColumn('number', '25% Percentile');
        chartData.addColumn('number', '50% Percentile');
        chartData.addColumn('number', '75% Percentile');
        chartData.addColumn('number', '90% Percentile');
        chartData.addColumn('number', 'Patient');
        chartData.addColumn({type: 'string', role: 'style'});

        // Populate data with 0-50 ages and add percentile data
        const rows = [];
        for (let age = 0; age <= 50; age++) {
            const row = [
                age,
                percentileData['10%'][age],
                percentileData['25%'][age],
                percentileData['50%'][age],
                percentileData['75%'][age],
                percentileData['90%'][age],
                null,
                'point {size: 10; shape-type: star; fill-color: blue;}'
            ];
            rows.push(row);
        }
        chartData.addRows(rows);

        chartOptions = {
            title: 'AMH Levels by Age',
            titleTextStyle: {
                fontSize: 18,
                bold: true,
                alignment: 'center'
            },
            width: 1800,  // 2x larger
            height: 1000, // 2x larger
            curveType: 'function', // creates smooth lines
            legend: { 
                position: 'bottom', 
                maxLines: 2,
                alignment: 'center'
            },
            series: {
                0: { color: 'red' },
                1: { color: 'orange' },
                2: { color: 'black' },
                3: { color: 'green' },
                4: { color: 'darkgreen' },
                5: { type: 'scatter' }
            },
            trendlines: {
                0: { type: 'polynomial', degree: 5, color: 'red', opacity: 0.5 },
                1: { type: 'polynomial', degree: 5, color: 'orange', opacity: 0.5 },
                2: { type: 'polynomial', degree: 5, color: 'black', opacity: 0.5 },
                3: { type: 'polynomial', degree: 5, color: 'green', opacity: 0.5 },
                4: { type: 'polynomial', degree: 5, color: 'darkgreen', opacity: 0.5 }
            },
            hAxis: { title: 'Age', minValue: 0, maxValue: 50 },
            vAxis: { title: 'AMH Level (pmol/L)' }
        };

        chartInstance = new google.visualization.LineChart(document.getElementById('chart_div'));
        chartInstance.draw(chartData, chartOptions);
    });
}

function addDataPoint() {
    // Ensure chart is initialized
    if (!chartInstance || !chartData) {
        alert('Chart is not yet initialized. Please wait and try again.');
        return;
    }

    // Get input method
    const dateMethod = document.querySelector('input[name="inputMethod"]:checked').value === 'date';
    
    let age, amhValue;

    // Validate AMH value
    let inputValue = parseFloat(document.getElementById('valueInput').value);
    
    // Convert units if ng/ml is selected
    const amhUnits = document.querySelector('input[name="amhUnits"]:checked').value;
    if (amhUnits === 'ng/ml') {
        inputValue *= 7.14; // Convert ng/ml to pmol/L
    }

    if (isNaN(inputValue) || inputValue <= 0) {
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

    const roundedAge = Math.round(age);
    
    // Create a copy of the existing data
    const newData = new google.visualization.DataTable(chartData);
    
    // Set the patient point at the specified age
    newData.setValue(roundedAge, 6, inputValue);
    
    // Redraw the chart with the updated data
    chartInstance.draw(newData, chartOptions);
}