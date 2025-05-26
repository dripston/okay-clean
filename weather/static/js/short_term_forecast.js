// Short-term forecast JavaScript - Main file

// Initialize variables at the top of the file
let lastSuccessfulFetch = null;
let retryCount = 3;
let retryDelay = 2000; // 2 seconds

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
    initShortTermForecast();
    
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
            window.uiHelpers.addRefreshButton(fetchForecastDataWithRetry);
        }
        
        // Update last update time
        if (window.uiHelpers && typeof window.uiHelpers.updateLastUpdateTime === 'function') {
            window.uiHelpers.updateLastUpdateTime(new Date().toISOString());
        }
        
        // Start countdown for next update (10 minutes)
        const nextUpdate = new Date();
        nextUpdate.setMinutes(nextUpdate.getMinutes() + 10);
        
        if (window.uiHelpers && typeof window.uiHelpers.startUpdateCountdown === 'function') {
            window.uiHelpers.startUpdateCountdown(nextUpdate, fetchForecastDataWithRetry);
        }
    };
    
    // Function to update current weather display
    function updateCurrentWeather(todayData) {
        // Your existing updateCurrentWeather function
    }
    
    // Function to update wind indicator
    function updateWindIndicator(windSpeed) {
        // Your existing updateWindIndicator function
    }
    
    // Function to update "how it feels" text
    function updateWeatherFeelText(weatherData) {
        // Your existing updateWeatherFeelText function
    }
    
    // Function to update forecast cards
    function updateForecastCards(forecast) {
        // Your existing updateForecastCards function
    }
});

// Main initialization function
function initShortTermForecast() {
    console.log('Initializing short-term forecast...');
    
    // Ensure we have the UI elements we need
    if (window.uiHelpers && typeof window.uiHelpers.ensureUIElementsExist === 'function') {
        window.uiHelpers.ensureUIElementsExist();
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

// Make sure the weatherApp object exists and add our functions to it
if (!window.weatherApp) {
    window.weatherApp = {};
}

window.weatherApp.initShortTermForecast = initShortTermForecast;
window.weatherApp.fetchForecastDataWithRetry = fetchForecastDataWithRetry;
window.weatherApp.loadFallbackData = loadFallbackData;