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
        
        // Remove annotation column since it doesn't work
        // chartData.addColumn({ type: 'string', role: 'annotation' });

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
                // Removed null annotation
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
            // Disable tooltips
            tooltip: { trigger: 'none' },
            series: {
                0: { color: 'transparent' },
                1: { color: 'transparent' },
                2: { color: 'transparent' },
                3: { color: 'transparent' },
                4: { color: 'transparent' },
                // Change patient point to star
                5: { 
                    type: 'scatter',
                    pointShape: { 
                        type: 'star', 
                        sides: 5, 
                        dent: 0.5
                    },
                    pointSize: 15,
                    color: '#703593'
                }
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
                viewWindow: { max: 44 }
            },
            vAxis: { 
                title: 'AMH Level (pmol/L)', 
                minValue: 0, 
                maxValue: 100, 
                gridlines: { count: 50 },
                viewWindow: { min: 0 }
            },
            // Remove annotations config since it doesn't work
            annotations: {
                // Add "90%" text overlay
                datum: {
                    stem: {
                        color: 'transparent'
                    },
                    textStyle: {
                        fontSize: 14,
                        bold: true,
                        color: '#006400' // Same color as 90% trendline
                    }
                }
            }
        };

        chartInstance = new google.visualization.LineChart(document.getElementById('chart_div'));
        chartInstance.draw(chartData, chartOptions);
        
        // Add "90%" text overlay after chart is drawn
        // We'll add it directly to the chart using the 90% data point at age 30
        // The 90% percentile is the 5th data column (index 4)
        const age = 30;
        const ninetieth_percentile_value = percentileData['90%'](age);
        
        // Add an annotation data point for the 90% label
        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('number', 'x');
        dataTable.addColumn('number', 'y');
        dataTable.addColumn({type: 'string', role: 'annotation'});
        dataTable.addRow([age, ninetieth_percentile_value, '90%']);
        
        const annotationOptions = {
            width: '100%',
            height: 500,
            legend: { position: 'none' },
            series: {
                0: { 
                    color: 'transparent',
                    enableInteractivity: false,
                    visibleInLegend: false
                }
            },
            hAxis: { viewWindow: { min: 0, max: 44 } },
            vAxis: { viewWindow: { min: 0, max: 100 } },
            annotations: {
                stem: {
                    color: 'transparent'
                },
                textStyle: {
                    fontSize: 14,
                    bold: true,
                    color: '#006400'
                }
            },
            tooltip: { trigger: 'none' }
        };
        
        // Draw the annotation over the main chart
        const annotationChart = new google.visualization.LineChart(document.getElementById('chart_div'));
        google.visualization.events.addListener(chartInstance, 'ready', function() {
            annotationChart.draw(dataTable, annotationOptions);
        });
    });
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

    // Updated to match columns without annotation
    chartData.addRow([
        Number(age.toFixed(3)),
        percentileData['10%'](age),
        percentileData['25%'](age),
        percentileData['50%'](age),
        percentileData['75%'](age),
        percentileData['90%'](age),
        inputValue
        // Removed annotation
    ]);

    lastPatientPointAge = age;

    chartInstance.draw(chartData, chartOptions);
    
    // Redraw the 90% label after updating the chart
    const age30 = 30;
    const ninetieth_percentile_value = percentileData['90%'](age30);
    
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('number', 'x');
    dataTable.addColumn('number', 'y');
    dataTable.addColumn({type: 'string', role: 'annotation'});
    dataTable.addRow([age30, ninetieth_percentile_value, '90%']);
    
    const annotationOptions = {
        width: '100%',
        height: 500,
        legend: { position: 'none' },
        series: {
            0: { 
                color: 'transparent',
                enableInteractivity: false,
                visibleInLegend: false
            }
        },
        hAxis: { viewWindow: { min: 0, max: 44 } },
        vAxis: { viewWindow: { min: 0, max: 100 } },
        annotations: {
            stem: {
                color: 'transparent'
            },
            textStyle: {
                fontSize: 14,
                bold: true,
                color: '#006400'
            }
        },
        tooltip: { trigger: 'none' }
    };
    
    // Draw the annotation over the main chart
    const annotationChart = new google.visualization.LineChart(document.getElementById('chart_div'));
    setTimeout(() => {
        annotationChart.draw(dataTable, annotationOptions);
    }, 100);
}