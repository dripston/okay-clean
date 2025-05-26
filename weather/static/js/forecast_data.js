// Forecast data fetching and error handling

// Function to fetch forecast data with retry
async function fetchForecastDataWithRetry(maxRetries = 5, delay = 3000) {
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            const response = await fetch('/api/forecast/short-term');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            
            // Check if we have an error message from the API
            if (data.error) {
                throw new Error(data.message || 'Error fetching forecast data');
            }
            
            // Check if we have actual forecast data
            if (!data.forecast || data.forecast.length === 0) {
                throw new Error('No forecast data available');
            }
            
            // Inside the fetchForecastDataWithRetry function, update the data normalization part:
            
            // Normalize data format if needed
            data.forecast = data.forecast.map(day => ({
                date: day.date,
                tavg: day.tavg || day.temp_avg,
                tmin: day.tmin || day.temp_min,
                tmax: day.tmax || day.temp_max,
                prcp: day.prcp || day.precipitation || 0,
                humidity: day.humidity,
                wspd: day.wspd || day.wind_speed,
                pres: day.pres || day.pressure,
                // Ensure we're using the exact condition from CSV
                condition: day.condition || 'Unknown'
            }));
            
            // Store the data
            window.forecastData = data;
            
            // Update the UI using the global function
            if (window.weatherApp && typeof window.weatherApp.updateForecastUI === 'function') {
                window.weatherApp.updateForecastUI(data);
            } else {
                console.error('updateForecastUI function not found in global scope');
                throw new Error('Required function not available');
            }
            
            return true;
        } catch (error) {
            console.error(`Attempt ${retries + 1} failed:`, error);
            retries++;
            
            if (retries >= maxRetries) {
                // Show error after all retries fail
                showError(error);
                return false;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`Retrying... (${retries}/${maxRetries})`);
        }
    }
}

// Function to show error
function showError(error) {
    // Hide loading indicator
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Show error message
    const forecastError = document.getElementById('forecast-error');
    if (forecastError) {
        forecastError.style.display = 'block';
    }
    
    // Clear any existing forecast cards
    const forecastCards = document.getElementById('forecast-cards');
    if (forecastCards) {
        forecastCards.innerHTML = `
            <div class="error-card">
                <i class="fas fa-exclamation-circle"></i>
                <p>Unable to retrieve forecast data. Our prediction model is currently unavailable.</p>
                <p class="error-details">${error.message}</p>
                <button id="retry-forecast-btn" class="btn btn-primary mt-3">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
        
        // Add event listener to retry button
        const retryBtn = document.getElementById('retry-forecast-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                // Show loading again
                forecastCards.innerHTML = `
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Loading forecast data...</p>
                    </div>
                `;
                
                // Try fetching again
                fetchForecastDataWithRetry();
            });
        }
    }
    
    // Clear charts if the function exists in global scope
    if (window.weatherCharts && typeof window.weatherCharts.clearCharts === 'function') {
        window.weatherCharts.clearCharts();
    }
}

// Export functions to global namespace
// Forecast data fetching module
window.forecastData = {
    currentAttempt: 0,
    maxAttempts: 5,n    lastSuccessfulFetch: null,
    cachedData: null,
    
    fetchForecastDataWithRetry: function(retries = 5) {
        this.currentAttempt++;
        console.log(`Fetching forecast data... (Attempt ${this.currentAttempt}/${this.maxAttempts})`);
        
        // Show loading indicator
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        
        // Use cached data if we have it and are having trouble connecting
        if (this.currentAttempt > 2 && this.cachedData) {
            console.log("Using cached data while attempting to refresh");
            window.weatherApp.updateForecastUI(this.cachedData);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
        
        // Add cache-busting parameter and timeout
        const timestamp = new Date().getTime();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout to 15 seconds
        
        // Try multiple endpoints with a preference order
        const endpoints = [
            '/api/forecast/short-term',
            '/api/short-term-forecast',
            '/api/weather/forecast'
        ];
        
        // Try the first endpoint
        this.tryEndpoint(endpoints, 0, controller.signal, timeoutId)
            .then(data => {
                // Success handling
                this.currentAttempt = 0;
                this.lastSuccessfulFetch = new Date();
                this.cachedData = data;
                
                // Update UI with forecast data
                window.weatherApp.updateForecastUI(data);
                
                // Hide loading indicator
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                
                // Hide any error messages
                const errorElement = document.getElementById('forecast-error');
                if (errorElement) {
                    errorElement.style.display = 'none';
                }
                
                // Store in localStorage for offline access
                try {
                    localStorage.setItem('forecastData', JSON.stringify({
                        timestamp: new Date().getTime(),
                        data: data
                    }));
                } catch (e) {
                    console.warn("Could not save to localStorage:", e);
                }
            })
            .catch(error => {
                // Error handling with fallback to localStorage if available
                clearTimeout(timeoutId);
                console.error(`Error fetching forecast data (Attempt ${this.currentAttempt}/${this.maxAttempts}):`, error);
                
                if (this.currentAttempt < this.maxAttempts) {
                    // Exponential backoff
                    const backoffTime = Math.min(1000 * Math.pow(2, this.currentAttempt), 10000);
                    setTimeout(() => {
                        this.fetchForecastDataWithRetry();
                    }, backoffTime);
                } else {
                    // Try to load from localStorage first before using generated fallback
                    try {
                        const savedData = localStorage.getItem('forecastData');
                        if (savedData) {
                            const parsed = JSON.parse(savedData);
                            const age = new Date().getTime() - parsed.timestamp;
                            
                            // Use cached data if it's less than 24 hours old
                            if (age < 24 * 60 * 60 * 1000) {
                                console.log("Using locally stored data from previous session");
                                window.weatherApp.updateForecastUI(parsed.data);
                                
                                if (loadingElement) {
                                    loadingElement.style.display = 'none';
                                }
                                
                                const errorElement = document.getElementById('forecast-error');
                                if (errorElement) {
                                    errorElement.style.display = 'block';
                                    errorElement.innerHTML = `
                                        <div class="error-message">
                                            <i class="fas fa-exclamation-circle"></i>
                                            <p>Using cached forecast data from ${new Date(parsed.timestamp).toLocaleString()}</p>
                                        </div>
                                    `;
                                }
                                
                                this.currentAttempt = 0;
                                return;
                            }
                        }
                    } catch (e) {
                        console.warn("Error reading from localStorage:", e);
                    }
                    
                    // Fall back to generated data if localStorage fails
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                    
                    const errorElement = document.getElementById('forecast-error');
                    if (errorElement) {
                        errorElement.style.display = 'block';
                        errorElement.innerHTML = `
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i>
                                <p>Unable to load live forecast data. Showing offline data instead.</p>
                            </div>
                        `;
                    }
                    
                    this.loadFallbackData();
                    this.currentAttempt = 0;
                }
            });
    },
    
    // Try multiple endpoints in sequence
    tryEndpoint: function(endpoints, index, signal, timeoutId) {
        if (index >= endpoints.length) {
            return Promise.reject(new Error("All endpoints failed"));
        }
        
        return fetch(`${endpoints[index]}?t=${new Date().getTime()}`, {
            signal: signal,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        })
        .then(response => {
            console.log(`Response from ${endpoints[index]}: ${response.status}`);
            
            if (!response.ok) {
                // Try next endpoint
                return this.tryEndpoint(endpoints, index + 1, signal, timeoutId);
            }
            return response.json();
        })
        .then(data => {
            if (data.forecast && Array.isArray(data.forecast)) {
                return data;
            } else if (Array.isArray(data)) {
                // Handle case where API returns array directly
                return { forecast: data };
            } else if (data.error) {
                // Try next endpoint if this one returns an error
                return this.tryEndpoint(endpoints, index + 1, signal, timeoutId);
            } else {
                // Try to adapt unexpected data structures
                if (data.data && Array.isArray(data.data)) {
                    return { forecast: data.data };
                } else if (data.weather && Array.isArray(data.weather)) {
                    return { forecast: data.weather };
                }
                // Try next endpoint if data structure is unrecognized
                return this.tryEndpoint(endpoints, index + 1, signal, timeoutId);
            }
        })
        .catch(error => {
            // Try next endpoint on error
            console.warn(`Endpoint ${endpoints[index]} failed:`, error);
            return this.tryEndpoint(endpoints, index + 1, signal, timeoutId);
        });
    },
    
    // Rest of your methods remain the same
    loadFallbackData: function() {
        // Your existing implementation
    },
    
    generateFallbackForecast: function() {
        // Your existing implementation
    }
};