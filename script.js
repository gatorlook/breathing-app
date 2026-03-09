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
        
        // Math: Dew Point and Pressure Conversion
        const dewPoint = wData.main.temp - ((100 - wData.main.humidity) / 5);
        const pressureInHg = (wData.main.pressure * 0.02953).toFixed(2);

        currentWeatherData = {
            temp: wData.main.temp,
            humidity: wData.main.humidity,
            pressure: pressureInHg, // Saving the converted number
            dewPoint: dewPoint.toFixed(1),
            aqiNum: aqiNum,
            aqiText: aqiLevels[aqiNum]
        };

        let boxColor = "#e1f5fe";
        if (dewPoint > 65) boxColor = "#fff9c4";
        if (aqiNum >= 4) boxColor = "#ffebee";

        weatherBox.style.backgroundColor = boxColor;
        weatherBox.innerHTML = `
            <strong>${wData.name}</strong>: ${currentWeatherData.temp}°F | ${currentWeatherData.humidity}% Hum<br>
            Dew Point: ${currentWeatherData.dewPoint}°F | Press: ${pressureInHg} inHg<br>
            <strong>Air Quality: ${currentWeatherData.aqiText}</strong>
        `;
    } catch (e) { 
        weatherBox.innerHTML = "Weather Error. Check API Key."; 
    }
}

function saveLog() {
    const score = document.getElementById('score').value;
    const notes = document.getElementById('notes').value;
    if(!score) return alert("Please enter a score");

    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    
    // This creates the entry with the pressure included
    logs.push({
        date: new Date().toLocaleDateString(),
        score: parseInt(score),
        notes: notes,
        ...currentWeatherData // This pulls in temp, humidity, pressure, etc.
    });

    localStorage.setItem('breathingData', JSON.stringify(logs));
    document.getElementById('score').value = '';
    document.getElementById('notes').value = '';
    showLogs();
}

function showLogs() {
    const list = document.getElementById('history-list');
    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    
    // Updated display to show Pressure in the history list
    list.innerHTML = logs.slice().reverse().map(log => `
        <div style="border-bottom:1px solid #eee; padding:10px; font-size:0.9em;">
            <strong>${log.date}</strong> - Score: ${log.score}/10<br>
            <small>Press: ${log.pressure} inHg | AQI: ${log.aqiText} | Dew: ${log.dewPoint}°F</small><br>
            <small>Notes: ${log.notes}</small>
        </div>
    `).join('');
    
    updateChart();
}

// Ensure the CSV download also includes the pressure column
function downloadCSV() {
    let logs = JSON.parse(localStorage.getItem('breathingData')) || [];
    let csv = "Date,Score,Temp,Hum,DewPoint,Pressure(inHg),AQI,Notes\n" + 
        logs.map(l => `${l.date},${l.score},${l.temp},${l.humidity},${l.dewPoint},${l.pressure},${l.aqiText},"${l.notes}"`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'breathing_history.csv'; a.click();
}

window.addEventListener('DOMContentLoaded', () => {
    fetchWeather();
    showLogs();
});
