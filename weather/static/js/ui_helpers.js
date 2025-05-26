// UI Helpers for forecast display

// Global variables
let updateInterval = null;
let statusCheckInterval = null;

// Function to show progress bar
function showProgressBar() {
    // Hide regular loading indicator if it exists
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Create progress bar container if it doesn't exist
    let progressContainer = document.getElementById('forecast-progress-container');
    if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.id = 'forecast-progress-container';
        progressContainer.className = 'progress-container';
        progressContainer.innerHTML = `
            <h3><i class="fas fa-cogs"></i> Generating new weather forecast...</h3>
            <div class="progress">
                <div id="forecast-progress-bar" class="progress-bar" role="progressbar" 
                     style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
            </div>
            <p id="forecast-status-message" class="mt-2">Initializing forecast model...</p>
        `;
        
        // Find a suitable place to insert the progress container
        const header = document.querySelector('h1, h2');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(progressContainer, header.nextSibling);
        } else {
            // If no header, insert at the beginning of the main content
            const mainContent = document.querySelector('main, .main-content, #content');
            if (mainContent) {
                mainContent.prepend(progressContainer);
            } else {
                // Last resort: add to body
                document.body.prepend(progressContainer);
            }
        }
    } else {
        // Reset progress bar
        const progressBar = document.getElementById('forecast-progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
            progressBar.setAttribute('aria-valuenow', '0');
        }
        
        // Reset status message
        const statusMessage = document.getElementById('forecast-status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Initializing forecast model...';
        }
        
        // Show the container
        progressContainer.style.display = 'block';
    }
}

// Function to hide progress bar
function hideProgressBar() {
    const progressContainer = document.getElementById('forecast-progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
    
    // Clear status check interval
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
}

// UI Helper functions

// Function to ensure all UI elements exist
function ensureUIElementsExist() {
    // Ensure chart containers exist
    const chartContainers = ['temperature-chart', 'precipitation-chart', 'wind-chart'];
    
    chartContainers.forEach(id => {
        if (!document.getElementById(id)) {
            console.log(`Chart container for ${id} not found, creating one`);
            
            // Find the forecast container
            const forecastContainer = document.querySelector('.forecast-container') || 
                                     document.querySelector('.forecast-section') || 
                                     document.querySelector('main');
            
            if (forecastContainer) {
                // Create a container for the chart
                const chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container';
                
                // Create the canvas element
                const canvas = document.createElement('canvas');
                canvas.id = id;
                
                // Add the canvas to the container
                chartContainer.appendChild(canvas);
                
                // Add the container to the forecast container
                forecastContainer.appendChild(chartContainer);
            } else {
                console.warn('Could not find a suitable container for charts');
            }
        }
    });
    
    // Ensure weather alerts container exists
    if (!document.querySelector('.weather-alerts')) {
        console.log('Weather alerts container not found, creating one');
        
        // Find the forecast container
        const forecastContainer = document.querySelector('.forecast-container') || 
                                 document.querySelector('.forecast-section') || 
                                 document.querySelector('main');
        
        if (forecastContainer) {
            // Create the alerts container
            const alertsContainer = document.createElement('div');
            alertsContainer.className = 'weather-alerts';
            
            // Add the container to the forecast container
            forecastContainer.appendChild(alertsContainer);
        }
    }
}

// Make sure the weatherApp object exists
if (!window.weatherApp) {
    window.weatherApp = {};
}

// Add our functions to the weatherApp object
window.weatherApp.ensureUIElementsExist = ensureUIElementsExist;

// Function to add refresh button
function addRefreshButton(fetchCallback) {
    let refreshButton = document.getElementById('refresh-forecast-btn');
    if (!refreshButton) {
        const forecastHeader = document.querySelector('.forecast-content h2');
        if (forecastHeader) {
            refreshButton = document.createElement('button');
            refreshButton.id = 'refresh-forecast-btn';
            refreshButton.className = 'btn btn-sm btn-primary refresh-btn';
            refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            forecastHeader.appendChild(refreshButton);
        }
    }
    
    if (refreshButton) {
        // Remove existing event listeners
        const newButton = refreshButton.cloneNode(true);
        if (refreshButton.parentNode) {
            refreshButton.parentNode.replaceChild(newButton, refreshButton);
        }
        
        // Add new event listener
        newButton.addEventListener('click', () => {
            newButton.disabled = true;
            newButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            
            // Show loading indicator
            const forecastCards = document.getElementById('forecast-cards');
            if (forecastCards) {
                forecastCards.innerHTML = `
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Refreshing forecast data...</p>
                    </div>
                `;
            }
            
            // Fetch new data
            fetchCallback().then(() => {
                newButton.disabled = false;
                newButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            }).catch(() => {
                newButton.disabled = false;
                newButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            });
        });
    }
}

// Function to start countdown for next update
function startUpdateCountdown(nextUpdateTime, fetchCallback) {
    const countdownElement = document.getElementById('next-update-countdown');
    if (!countdownElement) return;
    
    // Clear any existing interval
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Update the countdown every second
    updateInterval = setInterval(() => {
        const now = new Date();
        const diff = nextUpdateTime - now;
        
        if (diff <= 0) {
            // Time's up, clear interval and refresh data
            clearInterval(updateInterval);
            countdownElement.textContent = 'Updating...';
            fetchCallback();
            return;
        }
        
        // Calculate minutes and seconds
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        // Display the countdown
        countdownElement.textContent = `${minutes}m ${seconds}s`;
    }, 1000);
}

// Function to update last update time
function updateLastUpdateTime(timestamp) {
    const lastUpdateElement = document.getElementById('last-update-time');
    if (lastUpdateElement) {
        const date = new Date(timestamp);
        lastUpdateElement.textContent = date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Export functions
window.uiHelpers = {
    showProgressBar,
    hideProgressBar,
    ensureUIElementsExist,
    addRefreshButton,
    startUpdateCountdown,
    updateLastUpdateTime
};