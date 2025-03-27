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
    // Sort data by x (age)
    data.sort((a, b) => a.x - b.x);

    // Create an interpolation function
    return function(age) {
        // Find the two closest data points
        const lowerPoint = data.filter(point => point.x <= age).pop();
        const upperPoint = data.find(point => point.x > age);

        if (lowerPoint && upperPoint) {
            // Linear interpolation
            const t = (age - lowerPoint.x) / (upperPoint.x - lowerPoint.x);
            return lowerPoint.y + t * (upperPoint.y - lowerPoint.y);
        } else if (lowerPoint) {
            // If no upper point, use the lower point's value
            return lowerPoint.y;
        } else if (upperPoint) {
            // If no lower point, use the upper point's value
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
            
            // Create an interpolation function for each percentile
            percentileData[percentileLabel] = interpolateData(data);
        }
        return true;
    } catch (error) {
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
        chartData.addColumn({type: 'string', role: 'style'});

        const rows = [];
        for (let age = 0; age <= 50; age += 0.5) {
            const row = [
                Number(age.toFixed(3)),
                percentileData['10%'](age),
                percentileData['25%'](age),
                percentileData['50%'](age),
                percentileData['75%'](age),
                percentileData['90%'](age),
                null,
                null
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
            width: '100%',
            height: 500,
            curveType: 'function',
            legend: { position: 'none' },
            series: {
                0: { color: 'transparent' },
                1: { color: 'transparent' },
                2: { color: 'transparent' },
                3: { color: 'transparent' },
                4: { color: 'transparent' },
                6: { type: 'scatter' }
            },
            trendlines: {
                0: { type: 'polynomial', degree: 5, color: '#FF0000' },
                1: { type: 'polynomial', degree: 5, color: '#FFA500' },
                2: { type: 'polynomial', degree: 5, color: '#000000' },
                3: { type: 'polynomial', degree: 5, color: '#008000' },
                4: { type: 'polynomial', degree: 5, color: '#006400' }
            },
            hAxis: {
                title: 'Age',
                minValue: 0,
                maxValue: 50,
                gridlines: { count: 45 },
                viewWindow: {
                    max: 44
                }
            },
            vAxis: { 
                title: 'AMH Level (pmol/L)', 
                minValue: 0, 
                maxValue: 100, 
                gridlines: { count: 50 },
                viewWindow: {
                    min: 0
                }
            },
            annotations: {
                textStyle: {
                    fontSize: 12,
                    bold: true,
                    color: 'black'
                },
                alwaysOutside: true,
                highContrast: true,
                stem: {
                    color: 'gray',
                    length: 10
                }
            }

        };

        // Add annotations after the chart is drawn
        function addAnnotations() {
            const percentileLabels = ['10%', '25%', '50%', '75%', '90%'];
            const colors = ['#FF0000', '#FFA500', '#000000', '#008000', '#006400'];
            const annotationPoint = 40; // Age at which to add annotations

            // Clone the existing options to modify
            let modifiedOptions = { ...chartOptions };

            // Ensure annotations array exists
            if (!modifiedOptions.annotations) {
                modifiedOptions.annotations = [];
            }

            // Create annotations for each percentile
            percentileLabels.forEach((label, index) => {
                const y = percentileData[label](annotationPoint);

                // Add the annotation
                if (!modifiedOptions.annotations) {
                    modifiedOptions.annotations = [];
                }

                modifiedOptions.annotations.push({
                    x: annotationPoint,
                    y: y,
                    text: label + ' Percentile',
                    style: colors[index]
                });
            });

            // Redraw the chart with annotations
            chartInstance.draw(chartData, modifiedOptions);
        }

        chartInstance = new google.visualization.LineChart(document.getElementById('chart_div'));
        chartInstance.draw(chartData, chartOptions);
        
        // Add this listener to add annotations after initial draw
        google.visualization.events.addListener(chartInstance, 'ready', addAnnotations);
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
        // Age method
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
    
    // Remove the last patient point if it exists
    if (lastPatientPointAge !== null) {
        // Find and remove the existing patient point
        for (let i = 0; i < chartData.getNumberOfRows(); i++) {
            if (chartData.getValue(i, 6) !== null) {
                chartData.removeRow(i);
                break;
            }
        }
    }
    
    // Add the new patient data point
    chartData.addRow([
        Number(age.toFixed(3)),
        percentileData['10%'](age),
        percentileData['25%'](age),
        percentileData['50%'](age),
        percentileData['75%'](age),
        percentileData['90%'](age),
        inputValue,
        null
    ]);
    
    // Update the last patient point age
    lastPatientPointAge = age;
    
    // Redraw the chart with the updated data
    chartInstance.draw(chartData, chartOptions);
}