const LAT = '43.66560'; 
const LON = '-116.70381';
const API_KEY = 'aece25a5be3cb51982ae054f7bb141fa';
let currentWeatherData = null;
let myChart = null; // This holds the chart so we can update it

//const CITY = 'Caldwell,ID,US'; // Change this to your city

// 1. Function to get Weather
async function fetchWeather() {
    const weatherBox = document.getElementById('weather-box');
    try {
        // 1. Fetch Weather Data (Temp, Humidity, Pressure)
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=imperial`);
        if (!weatherRes.ok) throw new Error("Weather service unavailable");
        const wData = await weatherRes.json();

        // 2. Fetch Air Quality Data (AQI)
        const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${LAT}&lon=${LON}&appid=${API_KEY}`);
        if (!aqiRes.ok) throw new Error("Air quality service unavailable");
        const aData = await aqiRes.json();

        // 3. Process AQI
        const aqiNumber = aData.list[0].main.aqi; // 1-5
        const aqiLevels = ["Unknown", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
        const aqiText = aqiLevels[aqiNumber];

        // 4. Calculate Dew Point (Approximation formula)
        // Dew Point = T - ((100 - H) / 5)
        const temp = wData.main.temp;
        const humidity = wData.main.humidity;
        const dewPoint = temp - ((100 - humidity) / 5);
        const pressure = wData.main.pressure;

        // 5. Determine Warning Colors & Text
        let boxColor = "#e1f5fe"; // Default Blue
        let warningText = "";

        if (dewPoint > 65) {
            boxColor = "#fff9c4"; // Warning Yellow
            warningText = "<br><span style='color: #f57f17; font-weight: bold;'>⚠️ Muggy Air Warning (High Dew Point)</span>";
        }
        
        if (aqiNumber >= 4) {
            boxColor = "#ffebee"; // Warning Red for Poor Air
            warningText += "<br><span style='color: #c62828; font-weight: bold;'>⚠️ Poor Air Quality Alert</span>";
        }

        // 6. Update the "Staging Area" for the Save Button
        currentWeatherData = {
            temp: temp,
            humidity: humidity,
            pressure: pressure,
            dewPoint: dewPoint,
            aqiText: aqiText,
            aqiNum: aqiNumber
        };

        // 7. Update the UI
        weatherBox.style.backgroundColor = boxColor;
        weatherBox.innerHTML = `
            <div style="padding: 5px;">
                <strong>Location: ${wData.name}</strong><br>
                Temp: ${temp.toFixed(1)}°F | Humidity: ${humidity}%<br>
                Dew Point: ${dewPoint.toFixed(1)}°F | Press: ${pressure} hPa<br>
                <strong>Air Quality: ${aqiText}</strong>${warningText}
            </div>
        `;

    } catch (err) {
        weatherBox.style.backgroundColor = "#ffebee";
        weatherBox.innerHTML = `<strong style="color: red;">Error:</strong> ${err.message}`;
        console.error("Fetch Error:", err);
    }
}
// 2. Function to Save Data
function saveLog() {
    const score = document.getElementById('score').value;
    const notes = document.getElementById('notes').value;
    const date = new Date().toLocaleDateString();

    if (!score) return alert("Please enter a score!");
    if (!currentWeatherData) return alert("Weather data not loaded yet. Please wait a second.");

    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    
    // We are now saving a much bigger "package" of info
    logs.push({ 
        date, 
        score, 
        notes, 
        temp: currentWeatherData.temp, 
        humidity: currentWeatherData.humidity,
        pressure: currentWeatherData.pressure, // Added
        dewPoint: currentWeatherData.dewPoint, // Added
        aqi: currentWeatherData.aqiText,
        aqiNum: currentWeatherData.aqiNum // <--- Add this line!
    });

    localStorage.setItem('breathingData', JSON.stringify(logs));
    showLogs();
}

function showLogs() {
    const list = document.getElementById('history-list');
    list.innerHTML = "";
    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    
    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'history-item';
        // This displays the weather details inside the history list
        div.innerHTML = `
            <strong>${log.date}</strong> — Score: ${log.score}/10<br>
            <small>${log.temp}°F, ${log.humidity}% Humidity, Air: ${log.aqi}</small><br>
            <em>Notes: ${log.notes}</em>
        `;
        list.prepend(div);
    });
    updateChart();
}

function clearAll() {
    // 1. Ask for permission first (so you don't delete by accident!)
    if (confirm("Are you sure you want to delete your entire history? This cannot be undone.")) {
        
        // 2. Remove the data from the browser's memory
        localStorage.removeItem('breathingData');
        
        // 3. Refresh the list on the screen (it will now be empty)
        showLogs();
        
        alert("History cleared!");
    }
}

function downloadCSV() {
    // 1. Get the data from memory
    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];

    if (logs.length === 0) {
        return alert("No data to download yet!");
    }

    // 2. Create the Header Row (The top labels in the spreadsheet)
    let csvContent = "Date,Breathing Score,Temp (F),Humidity (%),Dew Point (F),Pressure (hPa),Air Quality,Notes\n";
    // 3. Loop through each log and add a row
    logs.forEach(log => {
        // We clean the notes to make sure commas inside notes don't break the columns
        let cleanNotes = log.notes.replace(/,/g, " "); 
        let row = `${log.date},${log.score},${log.temp},${log.humidity},${log.dewPoint.toFixed(1)},${log.pressure},${log.aqi},${cleanNotes}`;
        csvContent += row + "\n";
    });

    // 4. Create a hidden link to trigger the download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'my_breathing_data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateChart() {
    const ctx = document.getElementById('myChart').getContext('2d');
    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    const recentLogs = logs.slice(-7); 

    const labels = recentLogs.map(log => log.date);
    const scores = recentLogs.map(log => log.score);
    const aqiValues = recentLogs.map(log => log.aqiNum); // 1 to 5
    const humidities = recentLogs.map(log => log.humidity);

    if (myChart) { myChart.destroy(); }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Breathing Score (1-10)',
                    data: scores,
                    borderColor: '#007bff', // Blue
                    yAxisID: 'y',
                    tension: 0.3
                },
                {
                    label: 'Air Pollution (1=Best, 5=Worst)',
                    data: aqiValues,
                    borderColor: '#ff9800', // Orange
                    backgroundColor: '#ff980022',
                    yAxisID: 'y', // Uses the same 0-10 scale on the left
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Humidity %',
                    data: humidities,
                    borderColor: '#28a745', // Green
                    borderDash: [5, 5],
                    yAxisID: 'y1', // Uses the 0-100 scale on the right
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { type: 'linear', position: 'left', min: 0, max: 10, title: { display: true, text: 'Score / AQI' }},
                y1: { type: 'linear', position: 'right', min: 0, max: 100, title: { display: true, text: 'Humidity %' },
                     grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Run weather fetch when page opens
fetchWeather();