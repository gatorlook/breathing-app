const LAT = '43.66560';
const LON = '-116.70381';
const API_KEY = 'aece25a5be3cb51982ae054f7bb141fa';

let currentWeatherData = null;
let myChart = null;

async function fetchWeather() {
    const weatherBox = document.getElementById('weather-box');
    try {
        const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=imperial`);
        const wData = await wRes.json();
        
        const aRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${LAT}&lon=${LON}&appid=${API_KEY}`);
        const aData = await aRes.json();

        const aqiNum = aData.list[0].main.aqi;
        const aqiLevels = ["Unknown", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
        
        // Math: Dew Point calculation
        const dewPoint = wData.main.temp - ((100 - wData.main.humidity) / 5);
        
        // Math: Convert hPa to inches of mercury (inHg)
        const pressureInHg = (wData.main.pressure * 0.02953).toFixed(2);

        currentWeatherData = {
            temp: wData.main.temp,
            humidity: wData.main.humidity,
            pressure: pressureInHg, // Now stored in inches
            dewPoint: dewPoint,
            aqiNum: aqiNum,
            aqiText: aqiLevels[aqiNum]
        };

        // Visual feedback: Change color if conditions are tough for breathing
        let boxColor = "#e1f5fe"; // Default Blue
        if (dewPoint > 65) boxColor = "#fff9c4"; // Humid Yellow
        if (aqiNum >= 4) boxColor = "#ffebee"; // Pollution Red

        weatherBox.style.backgroundColor = boxColor;
        weatherBox.innerHTML = `
            <strong>${wData.name}</strong>: ${currentWeatherData.temp}°F | ${currentWeatherData.humidity}% Hum<br>
            Dew Point: ${dewPoint.toFixed(1)}°F | Press: ${pressureInHg} inHg<br>
            <strong>Air Quality: ${currentWeatherData.aqiText}</strong>
        `;
    } catch (e) { 
        weatherBox.innerHTML = "Weather Error. Check API Key or Connection."; 
    }
}

// This ensures the functions run only after the page is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    fetchWeather();
    showLogs();
});

function saveLog() {
    const scoreEl = document.getElementById('score');
    const notesEl = document.getElementById('notes');
    if (!scoreEl) return;
    const score = scoreEl.value;
    const notes = notesEl ? notesEl.value : '';

    if (!score) return alert('Please enter a score!');
    if (!currentWeatherData) return alert('Weather data not loaded yet. Please wait a second.');

    const date = new Date().toLocaleDateString();
    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];

    logs.push({
        date,
        score: parseInt(score, 10),
        notes,
        temp: currentWeatherData.temp,
        humidity: currentWeatherData.humidity,
        pressure: currentWeatherData.pressure,
        dewPoint: currentWeatherData.dewPoint,
        aqiText: currentWeatherData.aqiText,
        aqiNum: currentWeatherData.aqiNum
    });

    localStorage.setItem('breathingData', JSON.stringify(logs));
    if (scoreEl) scoreEl.value = '';
    if (notesEl) notesEl.value = '';
    showLogs();
}

function showLogs() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    list.innerHTML = logs.slice().reverse().map(log => `
        <div style="border-bottom:1px solid #eee; padding:10px; font-size:0.9em;">
            <strong>${log.date}</strong> - Score: ${log.score}/10<br>
            <small>AQI: ${log.aqiText || log.aqi} | Dew: ${typeof log.dewPoint === 'number' ? log.dewPoint.toFixed(1) + '°F' : 'N/A'} | ${log.notes || ''}</small>
        </div>
    `).join('');
    updateChart();
}

function updateChart() {
    const canvas = document.getElementById('myChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    const recent = logs.slice(-7);

    const labels = recent.map(l => l.date);
    const scores = recent.map(l => Number(l.score || 0));
    const aqiValues = recent.map(l => Number(l.aqiNum || 0));
    const humidities = recent.map(l => Number(l.humidity || 0));

    if (myChart) { myChart.destroy(); }
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Breathing Score (1-10)', data: scores, borderColor: '#007bff', yAxisID: 'y', tension: 0.3 },
                { label: 'Air Pollution (1=Best,5=Worst)', data: aqiValues, borderColor: '#ff9800', backgroundColor: '#ff980022', yAxisID: 'y', fill: true, tension: 0.3 },
                { label: 'Humidity %', data: humidities, borderColor: '#28a745', borderDash: [5,5], yAxisID: 'y1', tension: 0.3 }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { type: 'linear', position: 'left', min: 0, max: 10, title: { display: true, text: 'Score / AQI' } },
                y1: { type: 'linear', position: 'right', min: 0, max: 100, title: { display: true, text: 'Humidity %' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

function downloadCSV() {
    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    if (logs.length === 0) return alert('No data to download yet!');

    let csv = 'Date,Breathing Score,Temp (F),Humidity (%),Dew Point (F),Pressure (hPa),Air Quality,Notes\n';
    logs.forEach(log => {
        const notes = (log.notes || '').replace(/\"/g, '"').replace(/,/g, ' ');
        const dew = typeof log.dewPoint === 'number' ? log.dewPoint.toFixed(1) : '';
        csv += `${log.date},${log.score},${log.temp || ''},${log.humidity || ''},${dew},${log.pressure || ''},${log.aqiText || log.aqi || ''},${notes}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'my_breathing_data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function clearAll() {
    if (!confirm('Are you sure you want to delete your entire history? This cannot be undone.')) return;
    localStorage.removeItem('breathingData');
    showLogs();
    alert('History cleared!');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    fetchWeather();
    showLogs();
});
