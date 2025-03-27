// Set max date to today
document.getElementById('birthDate').max = luxon.DateTime.now().toISODate();

// Toggle input method
document.querySelectorAll('input[name="inputMethod"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const birthDateInput = document.getElementById('birthDate');
        const birthDateGroup = document.getElementById('birthDateGroup');
        const birthDateLabel = document.getElementById('birthDateLabel');
        const ageInputGroup = document.getElementById('ageInputGroup');

        if (this.value === 'date') {
            birthDateInput.style.display = 'block';
            birthDateGroup.style.display = 'block';
            birthDateLabel.style.display = 'block';
            ageInputGroup.style.display = 'none';
        } else {
            birthDateInput.style.display = 'none';
            birthDateGroup.style.display = 'none';
            birthDateLabel.style.display = 'none';
            ageInputGroup.style.display = 'block';
        }
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

let chartInstance = null;
let chartData = null;
let chartOptions = null;
let percentileData = {};
let lastPatientPointAge = null;

function interpolateData(data) {
    data.sort((a, b) => a.x - b.x);

    return function(age) {
        const lowerPoint = data.filter(point => point.x <= age).pop();
        const upperPoint = data.find(point => point.x > age);

        if (lowerPoint && upperPoint) {
            const t = (age - lowerPoint.x) / (upperPoint.x - lowerPoint.x);
            return lowerPoint.y + t * (upperPoint.y - lowerPoint.y);
        } else if (lowerPoint) {
            return lowerPoint.y;
        } else if (upperPoint) {
            return upperPoint.y;
        }

        return null;
    };
}

async function loadPercentileData() {
    try {
        for (const [percentileLabel, filePath] of Object.entries(percentileDataFiles)) {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
            }
            const data = await response.json();
            percentileData[percentileLabel] = interpolateData(data);
        }
        return true;
    } catch (error) {
        console.error(`Failed to load percentile data: ${error.message}`);
        alert(`Failed to load percentile data: ${error.message}`);
        return false;
    }
}

function initializeChart() {
    document.querySelector('input[name="inputMethod"][value="age"]').checked = true;
    document.getElementById('birthDate').style.display = 'none';
    document.getElementById('birthDateGroup').style.display = 'none';
    document.getElementById('birthDateLabel').style.display = 'none';
    document.getElementById('ageInputGroup').style.display = 'block';

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

        const rows = [];
        for (let age = 0; age <= 50; age += 0.5) {
            const row = [
                Number(age.toFixed(3)),
                percentileData['10%'](age),
                percentileData['25%'](age),
                percentileData['50%'](age),
                percentileData['75%'](age),
                percentileData['90%'](age),
                null
            ];

            rows.push(row);
        }
        chartData.addRows(rows);

        chartOptions = {
            // Remove title - it's now in HTML
            width: '100%',
            height: 500,
            curveType: 'function',
            legend: { position: 'none' },
            // Configure tooltip - we'll make it work only for the patient point
            tooltip: { 
                trigger: 'focus'
            },
            series: {
                0: { color: 'transparent' },
                1: { color: 'transparent' },
                2: { color: 'transparent' },
                3: { color: 'transparent' },
                4: { color: 'transparent' },
                // Change patient point to star & enable tooltip
                5: { 
                    type: 'scatter',
                    pointShape: { 
                        type: 'star', 
                        sides: 5, 
                        dent: 0.5
                    },
                    pointSize: 8,
                    color: '#703593',
                    enableInteractivity: true
                }
            },
            trendlines: {
                0: { type: 'polynomial', degree: 5, color: '#FF0000', enableInteractivity: false, tooltip: false },
                1: { type: 'polynomial', degree: 5, color: '#FFA500', enableInteractivity: false, tooltip: false },
                2: { type: 'polynomial', degree: 5, color: '#000000', enableInteractivity: false, tooltip: false },
                3: { type: 'polynomial', degree: 5, color: '#008000', enableInteractivity: false, tooltip: false },
                4: { type: 'polynomial', degree: 5, color: '#006400', enableInteractivity: false, tooltip: false }
            },
            hAxis: {
                // Remove title - it's now in HTML
                minValue: 0,
                maxValue: 50,
                gridlines: { count: 45 },
                viewWindow: { max: 44 }
            },
            vAxis: { 
                // Remove title - it's now in HTML
                minValue: 0, 
                maxValue: 100, 
                gridlines: { count: 50 },
                viewWindow: { min: 0 }
            }
        };

        chartInstance = new google.visualization.LineChart(document.getElementById('chart_div'));
        chartInstance.draw(chartData, chartOptions);
        
        // Add percentile labels after chart is drawn
        setTimeout(() => {
            const chartElement = document.getElementById('chart_div');
            
            // Add all percentile labels
            addPercentileLabel(chartElement, '90%', '#006400', 0.65, 0.5);
            addPercentileLabel(chartElement, '75%', '#008000', 0.625, 0.55);
            addPercentileLabel(chartElement, '50%', '#000000', 0.6, 0.625);
            addPercentileLabel(chartElement, '25%', '#FFA500', 0.575, 0.675);
            addPercentileLabel(chartElement, '10%', '#FF0000', 0.55, 0.71);
        }, 100);
    });
}

// Function to add percentile labels
function addPercentileLabel(chartElement, text, color, xPosition, yPosition) {
    // Create unique ID for each percentile label
    const labelId = 'percentile-' + text.replace('%', '');
    
    // Check if label already exists
    let labelElement = document.getElementById(labelId);
    if (!labelElement) {
        // Create the label if it doesn't exist
        labelElement = document.createElement('div');
        labelElement.id = labelId;
        labelElement.className = 'percentile-label percentile-' + text.replace('%', '');
        labelElement.style.position = 'absolute';
        labelElement.style.color = color;
        labelElement.innerHTML = text;
        
        // Append to the chart container
        chartElement.style.position = 'relative'; // Ensure the container allows absolute positioning
        chartElement.appendChild(labelElement);
    }
    
    // Position the label
    const chartRect = chartElement.getBoundingClientRect();
    const chartWidth = chartRect.width;
    const chartHeight = chartRect.height;
    
    labelElement.style.left = (chartWidth * xPosition) + 'px';
    labelElement.style.top = (chartHeight * yPosition) + 'px';
}

function addDataPoint() {
    if (!chartInstance || !chartData) {
        alert('Chart is not yet initialized. Please wait and try again.');
        return;
    }

    const dateMethod = document.querySelector('input[name="inputMethod"]:checked').value === 'date';
    
    let age, amhValue;

    let inputValue = parseFloat(document.getElementById('valueInput').value);

    const amhUnits = document.querySelector('input[name="amhUnits"]:checked').value;
    if (amhUnits === 'ng/ml') {
        inputValue *= 7.14;
    }

    if (isNaN(inputValue) || inputValue <= 0) {
        alert('Please enter a valid AMH level greater than 0');
        return;
    }

    if (dateMethod) {
        const birthDateInput = document.getElementById('birthDate').value;
        if (!birthDateInput) {
            alert('Please select a birth date');
            return;
        }
        const birthDate = luxon.DateTime.fromISO(birthDateInput);
        const currentDate = luxon.DateTime.now();
        age = currentDate.diff(birthDate, 'years').years;
    } else {
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

    if (lastPatientPointAge !== null) {
        for (let i = 0; i < chartData.getNumberOfRows(); i++) {
            if (chartData.getValue(i, 6) !== null) {
                chartData.removeRow(i);
                break;
            }
        }
    }

    chartData.addRow([
        Number(age.toFixed(3)),
        percentileData['10%'](age),
        percentileData['25%'](age),
        percentileData['50%'](age),
        percentileData['75%'](age),
        percentileData['90%'](age),
        inputValue
    ]);

    lastPatientPointAge = age;

    // Update the chartOptions to ensure the patient point is visible with correct styling
    chartOptions.series[5] = { 
        type: 'scatter',
        pointShape: { 
            type: 'star', 
            sides: 5, 
            dent: 0.5
        },
        pointSize: 8,
        color: '#703593',
        enableInteractivity: true
    };

    // Draw the main chart with the updated data
    chartInstance.draw(chartData, chartOptions);
    
    // Re-add percentile labels after chart is updated
    setTimeout(() => {
        const chartElement = document.getElementById('chart_div');
        
        // Add all percentile labels
        addPercentileLabel(chartElement, '90%', '#006400', 0.65, 0.5);
        addPercentileLabel(chartElement, '75%', '#008000', 0.625, 0.55);
        addPercentileLabel(chartElement, '50%', '#000000', 0.6, 0.625);
        addPercentileLabel(chartElement, '25%', '#FFA500', 0.575, 0.675);
        addPercentileLabel(chartElement, '10%', '#FF0000', 0.55, 0.71);
    }, 100);
}