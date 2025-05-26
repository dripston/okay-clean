// Short-term forecast JavaScript - Main file

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let forecastData = null;
    let updateInterval = null;
    let statusCheckInterval = null;
    
    // Create a global namespace for our app
    window.weatherApp = window.weatherApp || {};
    
    // Show loading indicator immediately
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // Start fetching data with retry
    window.forecastData.fetchForecastDataWithRetry();
    
    // Add event listener for window resize to redraw charts
    window.addEventListener('resize', () => {
        if (forecastData) {
            window.weatherCharts.updateCharts(forecastData.forecast);
        }
    });
    
    // Function to update the forecast UI - expose to global namespace
    window.weatherApp.updateForecastUI = function(data) {
        // Store data locally
        forecastData = data;
        
        // Hide loading indicator and progress bar if they exist
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        if (window.uiHelpers && typeof window.uiHelpers.hideProgressBar === 'function') {
            window.uiHelpers.hideProgressBar();
        }
        
        // Ensure UI elements exist
        if (window.uiHelpers && typeof window.uiHelpers.ensureUIElementsExist === 'function') {
            window.uiHelpers.ensureUIElementsExist();
        }
        
        // Update current weather
        updateCurrentWeather(data.forecast[0]);
        
        // Update forecast cards
        updateForecastCards(data.forecast);
        
        // Update charts
        if (window.weatherCharts && typeof window.weatherCharts.updateCharts === 'function') {
            window.weatherCharts.updateCharts(data.forecast);
        }
        
        // Check for weather alerts
        if (window.weatherAlerts && typeof window.weatherAlerts.checkWeatherAlerts === 'function') {
            window.weatherAlerts.checkWeatherAlerts(data.forecast);
        }
        
        // Add refresh button
        if (window.uiHelpers && typeof window.uiHelpers.addRefreshButton === 'function') {
            window.uiHelpers.addRefreshButton(window.forecastData.fetchForecastDataWithRetry);
        }
        
        // Update last update time
        if (window.uiHelpers && typeof window.uiHelpers.updateLastUpdateTime === 'function') {
            window.uiHelpers.updateLastUpdateTime(new Date().toISOString());
        }
        
        // Start countdown for next update (10 minutes)
        const nextUpdate = new Date();
        nextUpdate.setMinutes(nextUpdate.getMinutes() + 10);
        
        if (window.uiHelpers && typeof window.uiHelpers.startUpdateCountdown === 'function') {
            window.uiHelpers.startUpdateCountdown(nextUpdate, window.forecastData.fetchForecastDataWithRetry);
        }
    };
    
    // Function to update current weather display
    function updateCurrentWeather(todayData) {
        const currentDate = new Date(todayData.date);
        const formattedDate = currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Update date
        const currentDateElement = document.getElementById('current-date');
        if (currentDateElement) {
            currentDateElement.textContent = formattedDate;
        }
        
        // Update temperature
        const tempElement = document.querySelector('.temperature');
        if (tempElement) {
            tempElement.textContent = `${todayData.tavg.toFixed(1)}°C`;
        }
        
        // Update weather icon based on condition
        const weatherIcon = document.querySelector('.weather-icon i');
        if (weatherIcon) {
            const iconClass = weatherConditions.getWeatherIcon(todayData.condition, todayData.prcp);
            weatherIcon.className = `fas ${iconClass}`;
        }
        
        // Update weather details
        const details = document.querySelectorAll('.weather-details .detail span');
        if (details && details.length >= 3) {
            details[0].textContent = `Humidity: ${todayData.humidity.toFixed(0)}%`;
            details[1].textContent = `Wind: ${todayData.wspd.toFixed(1)} m/s`;
            details[2].textContent = `Pressure: ${todayData.pres.toFixed(1)} hPa`;
        }
        
        // Update wind indicator
        updateWindIndicator(todayData.wspd);
        
        // Update "how it feels" text
        updateWeatherFeelText(todayData);
    }
    
    // Function to update wind indicator
    function updateWindIndicator(windSpeed) {
        const windIndicator = document.getElementById('wind-indicator');
        if (!windIndicator) return;
        
        // Update wind arrow rotation based on wind speed
        const windArrow = windIndicator.querySelector('.wind-arrow');
        if (windArrow) {
            // Rotate arrow based on wind speed (just for visual effect)
            const rotation = Math.min(windSpeed * 10, 180);
            windArrow.style.transform = `rotate(${rotation}deg)`;
            
            // Change color based on wind speed
            if (windSpeed > 20) {
                windArrow.style.borderColor = '#ff4d4d'; // Strong wind (red)
            } else if (windSpeed > 10) {
                windArrow.style.borderColor = '#ffa64d'; // Moderate wind (orange)
            } else {
                windArrow.style.borderColor = '#4d94ff'; // Light wind (blue)
            }
        }
    }
    
    // Function to update "how it feels" text
    function updateWeatherFeelText(weatherData) {
        const feelTextElement = document.getElementById('weather-feel-text');
        if (!feelTextElement) return;
        
        let feelText = 'How it feels: ';
        
        // Calculate apparent temperature (simple version)
        const temp = weatherData.tavg;
        const humidity = weatherData.humidity;
        const windSpeed = weatherData.wspd;
        
        // Determine how it feels based on multiple factors
        if (temp > 30 && humidity > 70) {
            feelText += 'Hot and humid, quite uncomfortable';
        } else if (temp > 30) {
            feelText += 'Hot but dry';
        } else if (temp > 25 && humidity > 70) {
            feelText += 'Warm and humid';
        } else if (temp > 25) {
            feelText += 'Pleasantly warm';
        } else if (temp > 20) {
            feelText += 'Comfortable';
        } else if (temp > 15) {
            feelText += 'Slightly cool';
        } else {
            feelText += 'Cool';
        }
        
        // Add wind effect
        if (windSpeed > 20) {
            feelText += ', very windy';
        } else if (windSpeed > 10) {
            feelText += ', breezy';
        }
        
        // Add rain effect
        if (weatherData.prcp > 10) {
            feelText += ', heavy rain expected';
        } else if (weatherData.prcp > 5) {
            feelText += ', rainy';
        } else if (weatherData.prcp > 0) {
            feelText += ', light rain possible';
        }
        
        feelTextElement.textContent = feelText;
    }
    
    // Function to update forecast cards
    function updateForecastCards(forecast) {
        const forecastCards = document.getElementById('forecast-cards');
        forecastCards.innerHTML = '';
        
        // In the updateForecastCards function:
        
        // Create a card for each day in the forecast
        forecast.forEach((day, index) => {
            const date = new Date(day.date);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayOfMonth = date.toLocaleDateString('en-US', { day: 'numeric' });
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            
            // Use the exact condition from CSV data
            const weatherCondition = day.condition || 'Unknown';
            
            // Get the appropriate weather icon using our utility function
            const weatherIcon = window.weatherConditions.getWeatherIcon(weatherCondition, day.prcp);
            
            // Get condition color
            const conditionColor = window.weatherConditions.getWeatherConditionColor(weatherCondition, day.prcp);
            
            // Create the forecast card
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="forecast-date">
                    <span class="day">${dayOfWeek}, ${dayOfMonth} ${month}</span>
                </div>
                <div class="forecast-icon">
                    <i class="fas ${weatherIcon}" style="color: ${conditionColor};"></i>
                </div>
                <div class="forecast-condition">
                    ${weatherCondition}
                </div>
                <div class="forecast-temp">
                    ${day.tavg.toFixed(1)}°C
                </div>
                <div class="forecast-minmax">
                    <span class="min"><i class="fas fa-arrow-down"></i> ${day.tmin.toFixed(1)}°</span>
                    <span class="max"><i class="fas fa-arrow-up"></i> ${day.tmax.toFixed(1)}°</span>
                </div>
                <div class="forecast-details">
                    <div class="detail">
                        <i class="fas fa-tint"></i> ${day.prcp.toFixed(1)} mm
                    </div>
                    <div class="detail">
                        <i class="fas fa-wind"></i> ${day.wspd.toFixed(1)} m/s
                    </div>
                    <div class="detail">
                        <i class="fas fa-water"></i> ${day.humidity}%
                    </div>
                </div>
                ${weatherConditions.getWeatherRecommendation(day)}
            `;
            
            // Add the card to the container
            forecastCards.appendChild(card);
        });
    }
});

// Update the fetchForecastDataWithRetry function to use the API endpoint
window.forecastData = {
    fetchForecastDataWithRetry: function(retries = 3) {
        console.log("Fetching forecast data...");
        
        // Show loading indicator if it exists
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        
        // Try both API endpoints to handle potential deployment differences
        // First try the endpoint that matches your Render logs
        fetch('/api/forecast/short-term')
            .then(response => {
                console.log("Response status:", response.status);
                if (!response.ok) {
                    // If first endpoint fails, try the alternative endpoint
                    return fetch('/api/short-term-forecast');
                }
                return response;
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Forecast data received:", data);
                if (data.forecast) {
                    window.weatherApp.updateForecastUI(data);
                } else if (data.error) {
                    throw new Error(`API Error: ${data.error}`);
                } else {
                    // If we have data but no forecast property, try to adapt the data structure
                    if (Array.isArray(data)) {
                        // If the API returns an array directly, wrap it
                        window.weatherApp.updateForecastUI({forecast: data});
                    } else {
                        throw new Error("Invalid forecast data structure");
                    }
                }
            })
            .catch(error => {
                console.error("Error fetching forecast data:", error);
                
                if (retries > 0) {
                    console.log(`Retrying... (${retries} attempts left)`);
                    setTimeout(() => {
                        this.fetchForecastDataWithRetry(retries - 1);
                    }, 3000); // Increased timeout to 3 seconds
                } else {
                    // Show error message
                    document.querySelector('.loading').style.display = 'none';
                    const errorElement = document.getElementById('forecast-error');
                    if (errorElement) {
                        errorElement.style.display = 'block';
                        errorElement.textContent = `Error loading forecast data. Please try again later. (${error.message})`;
                    }
                    
                    // Try to load fallback data
                    this.loadFallbackData();
                }
            });
    },
    
    loadFallbackData: function() {
        console.log("Loading fallback forecast data...");
        
        // Create some fallback data based on typical Bangalore weather
        const fallbackData = {
            forecast: this.generateFallbackForecast()
        };
        
        // Update UI with fallback data
        window.weatherApp.updateForecastUI(fallbackData);
        
        // Show a notification that we're using fallback data
        const notificationElement = document.createElement('div');
        notificationElement.className = 'fallback-notification';
        notificationElement.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Using offline forecast data. Live data unavailable.
                <button class="retry-button">Retry</button>
            </div>
        `;
        
        // Add to page
        document.querySelector('.forecast-container').prepend(notificationElement);
        
        // Add retry button functionality
        const retryButton = notificationElement.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                notificationElement.remove();
                this.fetchForecastDataWithRetry(3);
            });
        }
    },
    
    generateFallbackForecast: function() {
        // Generate a 7-day fallback forecast for Bangalore
        const forecast = [];
        const today = new Date();
        const conditions = ['Partly cloudy', 'Mostly sunny', 'Clear', 'Scattered clouds', 'Light rain'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            
            // Generate realistic Bangalore weather data
            const tavg = 25 + Math.random() * 5; // 25-30°C average
            const tmin = tavg - (2 + Math.random() * 3); // 2-5°C lower than average
            const tmax = tavg + (2 + Math.random() * 3); // 2-5°C higher than average
            const humidity = 50 + Math.random() * 30; // 50-80% humidity
            const wspd = 5 + Math.random() * 10; // 5-15 m/s wind speed
            const pres = 1010 + Math.random() * 5; // 1010-1015 hPa pressure
            const prcp = Math.random() > 0.7 ? Math.random() * 5 : 0; // 30% chance of rain
            
            // Select a condition based on precipitation
            let condition = conditions[Math.floor(Math.random() * conditions.length)];
            if (prcp > 0) {
                condition = 'Light rain';
            }
            
            forecast.push({
                date: date.toISOString().split('T')[0],
                tavg: tavg,
                tmin: tmin,
                tmax: tmax,
                condition: condition,
                humidity: humidity,
                wspd: wspd,
                pres: pres,
                prcp: prcp
            });
        }
        
        return forecast;
    }
};

// Find the section where you're fetching forecast data and update it:

// Short-term forecast handling

// Initialize variables at the top of the file
let lastSuccessfulFetch = null;
let retryCount = 3;
let retryDelay = 2000; // 2 seconds

// Main initialization function
function initShortTermForecast() {
    console.log('Initializing short-term forecast...');
    
    // Ensure we have the UI elements we need
    if (window.weatherApp && typeof window.weatherApp.ensureUIElementsExist === 'function') {
        window.weatherApp.ensureUIElementsExist();
    }
    
    // Fetch forecast data with retry mechanism
    fetchForecastDataWithRetry(retryCount)
        .then(data => {
            if (data) {
                window.weatherApp.updateForecastUI(data);
            }
        })
        .catch(error => {
            console.error('Failed to fetch forecast data:', error);
            loadFallbackData();
        });
    
    // Set up periodic updates
    setInterval(() => {
        fetchForecastDataWithRetry(retryCount)
            .then(data => {
                if (data) {
                    window.weatherApp.updateForecastUI(data);
                }
            })
            .catch(error => {
                console.error('Failed to fetch forecast data during update:', error);
                // Only load fallback if we haven't successfully loaded data before
                if (!lastSuccessfulFetch) {
                    loadFallbackData();
                }
            });
    }, 30 * 60 * 1000); // Update every 30 minutes
}

// Function to fetch forecast data with retry
async function fetchForecastDataWithRetry(attemptsLeft) {
    console.log('Fetching forecast data...');
    
    // Define base URL - empty for local development, full URL for production
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '' 
        : window.location.origin;
    
    // Define all possible API endpoints to try, with the new CSV endpoint first
    const endpoints = [
        `${baseUrl}/api/csv-forecast`,
        `${baseUrl}/api/forecast/short-term`,
        `${baseUrl}/api/short-term-forecast`
    ];
    
    let lastError = null;
    
    // Try each endpoint
    for (const endpoint of endpoints) {
        try {
            console.log(`Trying endpoint: ${endpoint}`);
            const response = await fetch(endpoint);
            console.log(`Response from ${endpoint}: status ${response.status}`);
            
            if (response.ok) {
                // Store the successful endpoint for future use
                window.successfulEndpoint = endpoint;
                lastSuccessfulFetch = new Date();
                const data = await response.json();
                console.log('Forecast data received:', data);
                return data;
            }
        } catch (error) {
            console.log(`Error with endpoint ${endpoint}:`, error);
            lastError = error;
        }
    }
    
    // If we get here, all endpoints failed
    throw lastError || new Error('All API endpoints failed');
}

// Function to load fallback data
function loadFallbackData() {
    // Create fallback data
    const fallbackData = {
        forecast: Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            return {
                date: date.toISOString().split('T')[0],
                tavg: 25 + Math.random() * 5,
                tmin: 20 + Math.random() * 3,
                tmax: 28 + Math.random() * 5,
                prcp: Math.random() * 10,
                wspd: 5 + Math.random() * 10,
                pres: 1010 + Math.random() * 10,
                humidity: 60 + Math.random() * 20,
                condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Rain'][Math.floor(Math.random() * 5)]
            };
        })
    };
    
    // Update the UI with fallback data
    window.weatherApp.updateForecastUI(fallbackData);
    
    // Add a notice about using fallback data - with proper error handling
    try {
        const forecastContainer = document.querySelector('.forecast-container');
        if (forecastContainer) {
            const noticeElement = document.createElement('div');
            noticeElement.className = 'fallback-notice';
            noticeElement.innerHTML = '<p>⚠️ Using fallback data. Real forecast unavailable.</p>';
            noticeElement.style.cssText = 'background-color: #fff3cd; color: #856404; padding: 10px; margin: 10px 0; border-radius: 5px; text-align: center;';
            
            // Use appendChild instead of prepend to avoid errors
            forecastContainer.appendChild(noticeElement);
        }
    } catch (e) {
        console.warn('Could not add fallback notice:', e);
    }
    
    return fallbackData;
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Make sure the weatherApp object exists
    if (!window.weatherApp) {
        window.weatherApp = {};
    }
    
    // Add our functions to the weatherApp object
    window.weatherApp.initShortTermForecast = initShortTermForecast;
    window.weatherApp.fetchForecastDataWithRetry = fetchForecastDataWithRetry;
    window.weatherApp.loadFallbackData = loadFallbackData;
    
    // Initialize the forecast
    initShortTermForecast();
});