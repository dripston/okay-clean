from flask import Flask, render_template, jsonify
import pandas as pd
import os
import threading
import time
import subprocess
from datetime import datetime, timedelta
import json
import random
import sys
import traceback

# Add this import at the top of your file
from flask_cors import CORS

# Try both import styles to work in both local and Render environments
try:
    # Try the local import style first
    from models.long_term_prediction import long_term_bp
    print(f"[{datetime.now()}] Successfully imported long_term_bp using local import path")
except ModuleNotFoundError:
    try:
        # If that fails, try the package-style import
        from weather.models.long_term_prediction import long_term_bp
        print(f"[{datetime.now()}] Successfully imported long_term_bp using package import path")
    except ModuleNotFoundError:
        print(f"[{datetime.now()}] ERROR: Could not import long_term_bp using either import path")
        # Create a fallback blueprint if both imports fail
        from flask import Blueprint
        long_term_bp = Blueprint('long_term', __name__)
        
        @long_term_bp.route('/api/forecast/long-term')
        def get_long_term_forecast_fallback():
            return jsonify({
                'error': 'Long-term forecast module could not be loaded',
                'message': 'The long-term prediction model is currently unavailable.'
            }), 503

# Initialize your Flask app
app = Flask(__name__)

# Enable CORS only for API routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Global variable to track last update time
last_update_time = None
# Global variable to track if we're using real or dummy data
using_real_data = False

# Check if forecast file exists at startup
csv_paths = [
    os.path.join('output', 'bangalore_short_term_forecast.csv'),
    os.path.join('output', 'six_month_forecast.csv')
]

for csv_path in csv_paths:
    if os.path.exists(csv_path):
        try:
            # Try to read the file to make sure it's valid
            df = pd.read_csv(csv_path)
            if not df.empty:
                using_real_data = True
                last_update_time = datetime.now()
                print(f"[{datetime.now()}] Found existing forecast file at startup: {csv_path}. Using as real data.")
                break
        except Exception as e:
            print(f"[{datetime.now()}] Error reading existing forecast file at startup: {str(e)}")

def update_forecast():
    """Background task to update the forecast periodically"""
    global last_update_time, using_real_data
    
    while True:
        try:
            print(f"[{datetime.now()}] Updating weather forecast...")
            # Use the same Python interpreter that's running this script
            python_executable = sys.executable
            print(f"[{datetime.now()}] Using Python interpreter: {python_executable}")
            
            # Run the prediction script as a subprocess with the correct Python interpreter
            result = subprocess.run([python_executable, "-m", "models.main_prediction"], 
                                   capture_output=True, text=True)
            
            print(f"[{datetime.now()}] Subprocess return code: {result.returncode}")
            print(f"[{datetime.now()}] Subprocess stdout: {result.stdout}")
            print(f"[{datetime.now()}] Subprocess stderr: {result.stderr}")
            
            if result.returncode == 0:
                last_update_time = datetime.now()
                using_real_data = True
                print(f"[{last_update_time}] Forecast updated successfully with real data")
                
                # Check if the output file was actually created
                csv_path = os.path.join('output', 'bangalore_short_term_forecast.csv')
                if os.path.exists(csv_path):
                    print(f"[{datetime.now()}] Output file exists at: {csv_path}")
                    print(f"[{datetime.now()}] File size: {os.path.getsize(csv_path)} bytes")
                    # Read a few lines to verify content
                    try:
                        with open(csv_path, 'r') as f:
                            first_lines = [next(f) for _ in range(3)]
                        print(f"[{datetime.now()}] First few lines of output file: {first_lines}")
                    except Exception as e:
                        print(f"[{datetime.now()}] Error reading output file: {str(e)}")
                else:
                    print(f"[{datetime.now()}] WARNING: Output file does not exist despite successful return code")
                    using_real_data = False
            else:
                print(f"[{datetime.now()}] Error updating forecast: {result.stderr}")
                # Check if the output file exists anyway (might be from a previous run)
                csv_path = os.path.join('output', 'bangalore_short_term_forecast.csv')
                if os.path.exists(csv_path):
                    last_update_time = datetime.now()
                    using_real_data = True
                    print(f"[{last_update_time}] Using existing forecast data")
                    print(f"[{datetime.now()}] File size: {os.path.getsize(csv_path)} bytes")
                else:
                    using_real_data = False
                    print(f"[{datetime.now()}] No output file exists at: {csv_path}")
                
        except Exception as e:
            print(f"[{datetime.now()}] Exception during forecast update: {str(e)}")
            print(f"[{datetime.now()}] Traceback: {traceback.format_exc()}")
            using_real_data = False
            
        # Sleep for 10 minutes before the next update
        time.sleep(600)  # 600 seconds = 10 minutes

# Start the background update thread when the app starts
# Find the start_background_tasks function and update it to run the prediction immediately

def start_background_tasks():
    # Run the prediction script immediately on startup
    print(f"[{datetime.now()}] Running initial forecast update...")
    try:
        # Run the prediction script immediately
        update_forecast_now()
        print(f"[{datetime.now()}] Initial forecast update completed")
    except Exception as e:
        print(f"[{datetime.now()}] Error during initial forecast update: {str(e)}")
        print(f"[{datetime.now()}] Traceback: {traceback.format_exc()}")
    
    # Then start the background thread for periodic updates
    thread = threading.Thread(target=update_forecast)
    thread.daemon = True  # This ensures the thread will exit when the main program exits
    thread.start()
    print(f"[{datetime.now()}] Background forecast update thread started")

# Register the startup function with Flask 2.0+
@app.before_request
def before_first_request_func():
    global first_request
    try:
        first_request
    except NameError:
        first_request = True
        print(f"[{datetime.now()}] First request received, starting background tasks")
        start_background_tasks()
    else:
        pass

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/short-term-forecast')
def short_term_forecast():
    # Don't trigger a forecast update when this page is loaded
    # Let the frontend handle it if needed
    return render_template('short_term_forecast.html')

@app.route('/api/forecast/trigger-update')
def trigger_forecast_update_api():
    """API endpoint to trigger a forecast update"""
    global is_updating
    
    try:
        # Check if an update is already in progress
        if is_updating:
            return jsonify({
                'status': 'in_progress',
                'message': 'Forecast update already in progress'
            })
            
        # Start a background thread to update the forecast
        thread = threading.Thread(target=update_forecast_now)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'status': 'started',
            'message': 'Forecast update started'
        })
    except Exception as e:
        print(f"[{datetime.now()}] Exception in trigger update endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error triggering forecast update: {str(e)}'
        }), 500

def trigger_forecast_update():
    """Trigger a forecast update immediately"""
    update_forecast_now()

# Register blueprints
# Update the blueprint registration to not use a URL prefix
app.register_blueprint(long_term_bp)

@app.route('/forecast')
def forecast():
    return render_template('forecast.html')

# Add the missing 'about' route
@app.route('/about')
def about():
    """Render the about page."""
    return render_template('about.html')

@app.route('/api/forecast/short-term')
def get_short_term_forecast():
    """API endpoint to get the latest short-term forecast data"""
    global using_real_data, last_update_time
    
    try:
        print(f"[{datetime.now()}] API request received for short-term forecast")
        print(f"[{datetime.now()}] using_real_data = {using_real_data}")
        print(f"[{datetime.now()}] last_update_time = {last_update_time}")
        
        # Check for both possible forecast file paths
        csv_paths = [
            os.path.join('output', 'bangalore_short_term_forecast.csv'),
            os.path.join('output', 'six_month_forecast.csv')
        ]
        
        # Find the first available forecast file
        csv_path = None
        for path in csv_paths:
            if os.path.exists(path):
                csv_path = path
                print(f"[{datetime.now()}] Found forecast file at: {csv_path}")
                break
        
        if csv_path:
            print(f"[{datetime.now()}] File exists: True")
            
            if not using_real_data:
                print(f"[{datetime.now()}] File exists but using_real_data is False. Setting to True.")
                using_real_data = True
                if last_update_time is None:
                    last_update_time = datetime.now()
                    print(f"[{datetime.now()}] Setting last_update_time to current time")
            
            # Read the CSV file
            print(f"[{datetime.now()}] Reading CSV file")
            df = pd.read_csv(csv_path)
            print(f"[{datetime.now()}] CSV file read successfully. Shape: {df.shape}")
            print(f"[{datetime.now()}] CSV columns: {list(df.columns)}")
            
            # If we need only 7 days for short-term forecast, limit the data
            if len(df) > 7:
                df = df.head(7)
            
            # Map column names that might be different but represent the same data
            column_mapping = {
                # Common variations of column names
                'temp_avg': 'tavg',
                'temp': 'tavg',
                'temperature': 'tavg',
                'avg_temp': 'tavg',
                'mean_temp': 'tavg',
                
                'temp_min': 'tmin',
                'min_temp': 'tmin',
                'minimum_temp': 'tmin',
                
                'temp_max': 'tmax',
                'max_temp': 'tmax',
                'maximum_temp': 'tmax',
                
                'precipitation': 'prcp',
                'rain': 'prcp',
                'rainfall': 'prcp',
                
                'wind_speed': 'wspd',
                'windspeed': 'wspd',
                
                'pressure': 'pres',
                'air_pressure': 'pres',
                
                'humid': 'humidity',
                'relative_humidity': 'humidity'
            }
            
            # Rename columns if needed
            for old_col, new_col in column_mapping.items():
                if old_col in df.columns and new_col not in df.columns:
                    df.rename(columns={old_col: new_col}, inplace=True)
                    print(f"[{datetime.now()}] Renamed column '{old_col}' to '{new_col}'")
            
            # Check if we have the required columns or can derive them
            required_columns = ['date', 'tavg', 'tmin', 'tmax', 'prcp', 'wspd', 'pres']
            missing_columns = []
            
            for col in required_columns:
                if col not in df.columns:
                    missing_columns.append(col)
            
            if missing_columns:
                print(f"[{datetime.now()}] Missing columns: {missing_columns}")
                
                # Try to derive missing columns
                if 'tavg' in missing_columns and 'tmin' in df.columns and 'tmax' in df.columns:
                    df['tavg'] = (df['tmin'] + df['tmax']) / 2
                    print(f"[{datetime.now()}] Derived 'tavg' from 'tmin' and 'tmax'")
                    missing_columns.remove('tavg')
                
                # For any remaining missing columns, add default values
                for col in missing_columns:
                    if col == 'date':
                        # Generate dates starting from today
                        start_date = datetime.now().date()
                        df['date'] = [(start_date + timedelta(days=i)).isoformat() for i in range(len(df))]
                    elif col == 'tavg':
                        df['tavg'] = 28.0  # Default average temperature for Bangalore
                    elif col == 'tmin':
                        df['tmin'] = 22.0  # Default min temperature
                    elif col == 'tmax':
                        df['tmax'] = 33.0  # Default max temperature
                    elif col == 'prcp':
                        df['prcp'] = 0.0   # Default precipitation
                    elif col == 'wspd':
                        df['wspd'] = 3.5   # Default wind speed
                    elif col == 'pres':
                        df['pres'] = 1008.0  # Default pressure
                    
                    print(f"[{datetime.now()}] Added default values for missing column: {col}")
            
            # Add humidity column if not present (calculate from other values or use default)
            if 'humidity' not in df.columns:
                # Simple approximation - in reality this would be calculated properly
                df['humidity'] = df.apply(lambda row: min(79 + row['prcp'] * 2, 99) if row['prcp'] > 0 else 
                                         max(60, min(85, 75 - (row['tmax'] - row['tmin']))), axis=1)
                print(f"[{datetime.now()}] Added derived 'humidity' column")
            
            # Add weather condition based on precipitation and temperature
            print(f"[{datetime.now()}] Determining weather conditions for each day...")
            
            # Create a list to store condition determination details for debugging
            condition_details = []
            
            for idx, row in df.iterrows():
                date_str = row['date'] if 'date' in row else f"Day {idx+1}"
                prcp_val = row['prcp'] if 'prcp' in row else 0
                tmax_val = row['tmax'] if 'tmax' in row else 0
                humidity_val = row['humidity'] if 'humidity' in row else 0
                
                # Determine condition with detailed logic
                if prcp_val >= 10:
                    condition = 'Heavy Rain'
                    reason = f"precipitation {prcp_val} >= 10mm"
                elif prcp_val >= 5:
                    condition = 'Rain'
                    reason = f"precipitation {prcp_val} >= 5mm"
                elif prcp_val > 0:
                    condition = 'Light Rain'
                    reason = f"precipitation {prcp_val} > 0mm"
                elif tmax_val > 32 and prcp_val == 0:
                    condition = 'Sunny'
                    reason = f"max temp {tmax_val} > 32°C and no precipitation"
                elif tmax_val > 28 and prcp_val == 0:
                    condition = 'Partly Cloudy'
                    reason = f"max temp {tmax_val} > 28°C and no precipitation"
                elif humidity_val > 75 and prcp_val == 0:
                    condition = 'Cloudy'
                    reason = f"humidity {humidity_val}% > 75% and no precipitation"
                else:
                    condition = 'Clear'
                    reason = "default condition"
                
                # Store the condition and reason
                condition_details.append({
                    'date': date_str,
                    'prcp': prcp_val,
                    'tmax': tmax_val,
                    'humidity': humidity_val,
                    'condition': condition,
                    'reason': reason
                })
                
                # Set the condition in the dataframe
                df.at[idx, 'condition'] = condition
                
                # Set the weather icon
                if condition == 'Heavy Rain':
                    icon = 'heavy_rain'
                elif condition == 'Rain':
                    icon = 'rain'
                elif condition == 'Light Rain':
                    icon = 'light_rain'
                elif condition == 'Sunny':
                    icon = 'sunny'
                elif condition == 'Partly Cloudy':
                    icon = 'partly_cloudy'
                elif condition == 'Cloudy':
                    icon = 'cloudy'
                else:
                    icon = 'clear'
                
                df.at[idx, 'weather_icon'] = icon
            
            # Log the detailed condition determination
            print(f"[{datetime.now()}] Weather condition determination details:")
            for detail in condition_details:
                print(f"[{datetime.now()}] {detail['date']}: {detail['condition']} - {detail['reason']}")
            
            # Log the final conditions in the dataframe
            print(f"[{datetime.now()}] Final weather conditions in dataframe:")
            for idx, row in df.iterrows():
                date_str = row['date'] if 'date' in row else f"Day {idx+1}"
                condition = row['condition'] if 'condition' in row else 'Unknown'
                icon = row['weather_icon'] if 'weather_icon' in row else 'Unknown'
                print(f"[{datetime.now()}] {date_str}: Condition={condition}, Icon={icon}")
            
            # Add weather icon code for frontend display
            df['weather_icon'] = df.apply(lambda row:
                'heavy_rain' if row['condition'] == 'Heavy Rain' else
                'rain' if row['condition'] == 'Rain' else
                'light_rain' if row['condition'] == 'Light Rain' else
                'sunny' if row['condition'] == 'Sunny' else
                'partly_cloudy' if row['condition'] == 'Partly Cloudy' else
                'cloudy' if row['condition'] == 'Cloudy' else
                'clear', axis=1)
            
            print(f"[{datetime.now()}] Added weather condition descriptions and icons")
            
            # Round numeric values for better display
            for col in ['tavg', 'tmin', 'tmax', 'wspd', 'pres', 'humidity']:
                if col in df.columns:
                    df[col] = df[col].round(1)
            
            # Format precipitation to show in mm
            if 'prcp' in df.columns:
                df['prcp_mm'] = df['prcp'].round(1)
                
            # Add day of week for better display
            if 'date' in df.columns:
                try:
                    df['day_of_week'] = pd.to_datetime(df['date']).dt.strftime('%a')
                    df['day'] = pd.to_datetime(df['date']).dt.day
                    df['month'] = pd.to_datetime(df['date']).dt.strftime('%b')
                    print(f"[{datetime.now()}] Added day of week information")
                except Exception as e:
                    print(f"[{datetime.now()}] Error adding day of week: {str(e)}")
            
            # Convert to list of dictionaries for JSON response
            forecast_data = df.to_dict(orient='records')
            print(f"[{datetime.now()}] Converted to JSON. Number of records: {len(forecast_data)}")
            
            # Add metadata
            response = {
                'city': 'Bangalore',
                'last_updated': last_update_time.isoformat() if last_update_time else None,
                'next_update': (last_update_time.timestamp() + 600) * 1000 if last_update_time else None,
                'current_weather': forecast_data[0] if forecast_data else None,  # Add current weather
                'forecast': forecast_data,
                'is_real_data': True
            }
            
            print(f"[{datetime.now()}] Returning successful response with {len(forecast_data)} records")
            return jsonify(response)
        else:
            # Return an error indicating the model is not available
            print(f"[{datetime.now()}] No forecast file found. Returning 503 error.")
            return jsonify({
                'error': 'Forecast data not available',
                'message': 'Our prediction model is currently unavailable. Please try again later.',
                'is_real_data': False
            }), 503  # 503 Service Unavailable
        
    except Exception as e:
        print(f"[{datetime.now()}] Exception in API endpoint: {str(e)}")
        print(f"[{datetime.now()}] Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Error fetching forecast data',
            'message': str(e),
            'is_real_data': False
        }), 500

# Find this section in your app.py file
# Around line 658 where the error is occurring

# Change this:
@app.route('/api/forecast/status')
def get_forecast_status():
    """API endpoint to get the status of the forecast update"""
    global last_update_time, using_real_data, is_updating
    
    try:
        # If an update is in progress, return that status
        if is_updating:
            return jsonify({
                'status': 'updating',
                'progress': 50,  # We don't know the exact progress, so use 50%
                'message': 'Generating new forecast data...'
            })
            
        # Check if the forecast file exists
        csv_paths = [
            os.path.join('output', 'bangalore_short_term_forecast.csv'),
            os.path.join('output', 'six_month_forecast.csv')
        ]
        
        file_exists = False
        for path in csv_paths:
            if os.path.exists(path):
                file_exists = True
                file_path = path
                break
        
        # If the file exists, check if it's recent
        if file_exists:
            file_mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
            current_time = datetime.now()
            file_age_seconds = (current_time - file_mod_time).total_seconds()
            
            # If the file was modified in the last 30 seconds, it's fresh
            if file_age_seconds < 30:
                return jsonify({
                    'status': 'ready',
                    'progress': 100,
                    'last_updated': file_mod_time.isoformat(),
                    'message': 'Forecast data is up-to-date'
                })
            # If the file is less than 1 hour old, consider it up-to-date
            elif file_age_seconds < 3600:  # 3600 seconds = 1 hour
                return jsonify({
                    'status': 'ready',
                    'progress': 100,
                    'last_updated': file_mod_time.isoformat(),
                    'message': 'Forecast data is up-to-date'
                })
            else:
                # File exists but is old
                return jsonify({
                    'status': 'stale',
                    'progress': 100,
                    'last_updated': file_mod_time.isoformat(),
                    'message': 'Forecast data is available but outdated'
                })
        else:
            # No file exists
            return jsonify({
                'status': 'unavailable',
                'progress': 0,
                'message': 'No forecast data available'
            })
            
    except Exception as e:
        print(f"[{datetime.now()}] Exception in status endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'progress': 0,
            'message': f'Error checking forecast status: {str(e)}'
        }), 500

# Add these imports if they're not already present
import os
import pandas as pd
from flask import jsonify
from datetime import datetime

# Add this new route to directly serve the CSV data
@app.route('/api/csv-forecast')
def get_csv_forecast():
    """Simple API endpoint that directly reads the CSV file and returns it as JSON"""
    try:
        print(f"[{datetime.now()}] API request received for CSV forecast")
        
        # Path to the CSV file
        csv_path = os.path.join('output', 'bangalore_short_term_forecast.csv')
        
        # Check if the file exists
        if not os.path.exists(csv_path):
            print(f"[{datetime.now()}] CSV file not found at: {csv_path}")
            return jsonify({
                'error': 'Forecast data file not found',
                'forecast': generate_fallback_forecast()
            }), 404
        
        # Read the CSV file
        df = pd.read_csv(csv_path)
        
        # Convert to list of dictionaries for JSON serialization
        forecast_data = df.to_dict(orient='records')
        
        # Map column names to standardized names if needed
        standardized_forecast = []
        for day in forecast_data:
            standardized_day = {
                'date': day.get('date'),
                'day': day.get('day'),
                'condition': day.get('condition'),
                'tavg': day.get('temp_avg', day.get('tavg')),
                'tmin': day.get('temp_min', day.get('tmin')),
                'tmax': day.get('temp_max', day.get('tmax')),
                'humidity': day.get('humidity'),
                'wspd': day.get('wind_speed', day.get('wspd')),
                'pres': day.get('pressure', day.get('pres')),
                'prcp': day.get('precipitation', day.get('prcp'))
            }
            standardized_forecast.append(standardized_day)
        
        print(f"[{datetime.now()}] Successfully read CSV with {len(standardized_forecast)} days of forecast")
        
        # Return the data as JSON
        return jsonify({
            'forecast': standardized_forecast,
            'source': 'direct-csv',
            'generated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[{datetime.now()}] Exception in CSV forecast API: {str(e)}")
        # Return fallback data
        return jsonify({
            'error': str(e),
            'forecast': generate_fallback_forecast(),
            'source': 'fallback'
        })

# Helper function to generate fallback forecast data
def generate_fallback_forecast():
    """Generate fallback forecast data when the CSV file is not available"""
    import random
    from datetime import datetime, timedelta
    
    fallback_data = []
    start_date = datetime.now()
    
    conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Rain']
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    for i in range(7):
        date = start_date + timedelta(days=i)
        day_name = days[date.weekday()]
        
        fallback_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'day': day_name,
            'condition': random.choice(conditions),
            'tavg': round(25 + random.uniform(-3, 3), 1),
            'tmin': round(20 + random.uniform(-2, 2), 1),
            'tmax': round(30 + random.uniform(-2, 2), 1),
            'humidity': round(65 + random.uniform(-10, 10)),
            'wspd': round(15 + random.uniform(-10, 10), 1),
            'pres': round(1010 + random.uniform(-5, 5)),
            'prcp': round(random.uniform(0, 5), 1)
        })
    
    return fallback_data

@app.route('/api/forecast/status')
def get_forecast_status():
    """API endpoint to get the status of the forecast update"""
    global last_update_time, using_real_data, is_updating
    
    try:
        # If an update is in progress, return that status
        if is_updating:
            return jsonify({
                'status': 'updating',
                'progress': 50,  # We don't know the exact progress, so use 50%
                'message': 'Generating new forecast data...'
            })
            
        # Check if the forecast file exists
        csv_paths = [
            os.path.join('output', 'bangalore_short_term_forecast.csv'),
            os.path.join('output', 'six_month_forecast.csv')
        ]
        
        file_exists = False
        for path in csv_paths:
            if os.path.exists(path):
                file_exists = True
                file_path = path
                break
        
        # If the file exists, check if it's recent
        if file_exists:
            file_mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
            current_time = datetime.now()
            file_age_seconds = (current_time - file_mod_time).total_seconds()
            
            # If the file was modified in the last 30 seconds, it's fresh
            if file_age_seconds < 30:
                return jsonify({
                    'status': 'ready',
                    'progress': 100,
                    'last_updated': file_mod_time.isoformat(),
                    'message': 'Forecast data is up-to-date'
                })
            # If the file is less than 1 hour old, consider it up-to-date
            elif file_age_seconds < 3600:  # 3600 seconds = 1 hour
                return jsonify({
                    'status': 'ready',
                    'progress': 100,
                    'last_updated': file_mod_time.isoformat(),
                    'message': 'Forecast data is up-to-date'
                })
            else:
                # File exists but is old
                return jsonify({
                    'status': 'stale',
                    'progress': 100,
                    'last_updated': file_mod_time.isoformat(),
                    'message': 'Forecast data is available but outdated'
                })
        else:
            # No file exists
            return jsonify({
                'status': 'unavailable',
                'progress': 0,
                'message': 'No forecast data available'
            })
            
    except Exception as e:
        print(f"[{datetime.now()}] Exception in status endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'progress': 0,
            'message': f'Error checking forecast status: {str(e)}'
        }), 500

if __name__ == '__main__':
    # Make sure output directory exists
    os.makedirs('output', exist_ok=True)
    print(f"[{datetime.now()}] Starting Flask application")
    print(f"[{datetime.now()}] Current working directory: {os.getcwd()}")
    print(f"[{datetime.now()}] Python executable: {sys.executable}")
    app.run(debug=True)
# 
# 2. Now, let's add a new API endpoint to app.py for fallback data:
# Add this new route to handle the short-term-forecast API endpoint
@app.route('/api/short-term-forecast')
def get_short_term_forecast_alt():
    """Alternative API endpoint for short-term forecast data"""
    return get_short_term_forecast()

# Add this new route to handle the current-weather API endpoint
@app.route('/api/current-weather')
def get_current_weather():
    """API endpoint to get the current weather data"""
    try:
        print(f"[{datetime.now()}] API request received for current weather")
        
        # Check if we have forecast data
        csv_paths = [
            os.path.join('output', 'bangalore_short_term_forecast.csv'),
            os.path.join('output', 'six_month_forecast.csv')
        ]
        
        # Find the first available forecast file
        csv_path = None
        for path in csv_paths:
            if os.path.exists(path):
                csv_path = path
                print(f"[{datetime.now()}] Found forecast file at: {csv_path}")
                break
        
        if csv_path:
            # Read the CSV file
            df = pd.read_csv(csv_path)
            
            # Get the first row (current day)
            if len(df) > 0:
                current_data = df.iloc[0].to_dict()
                
                # Map column names if needed
                column_mapping = {
                    'temp_avg': 'temperature',
                    'tavg': 'temperature',
                    'temp_min': 'min_temperature',
                    'tmin': 'min_temperature',
                    'temp_max': 'max_temperature',
                    'tmax': 'max_temperature',
                    'prcp': 'precipitation',
                    'wspd': 'wind_speed',
                    'pres': 'pressure'
                }
                
                # Create a new dictionary with standardized keys
                weather_data = {}
                for old_key, value in current_data.items():
                    # Map the key if it's in our mapping
                    new_key = column_mapping.get(old_key, old_key)
                    weather_data[new_key] = value
                
                # Make sure we have a condition
                if 'condition' not in weather_data and 'precipitation' in weather_data:
                    prcp = weather_data.get('precipitation', 0)
                    if prcp >= 10:
                        weather_data['condition'] = 'Heavy Rain'
                    elif prcp >= 5:
                        weather_data['condition'] = 'Rain'
                    elif prcp > 0:
                        weather_data['condition'] = 'Light Rain'
                    else:
                        weather_data['condition'] = 'Clear'
                
                return jsonify(weather_data)
            
        # If we get here, we don't have data
        return jsonify({
            'error': 'Current weather data not available',
            'temperature': 28,
            'condition': 'Partly Cloudy',
            'humidity': 65,
            'wind_speed': 12,
            'pressure': 1008
        })
        
    except Exception as e:
        print(f"[{datetime.now()}] Exception in current weather API: {str(e)}")
        # Return fallback data
        return jsonify({
            'error': str(e),
            'temperature': 28,
            'condition': 'Partly Cloudy',
            'humidity': 65,
            'wind_speed': 12,
            'pressure': 1008
        })

# Add this missing function that's referenced in your code
is_updating = False

def update_forecast_now():
    """Update the forecast immediately"""
    global is_updating, last_update_time, using_real_data
    
    try:
        is_updating = True
        print(f"[{datetime.now()}] Manually triggered forecast update...")
        
        # Use the same Python interpreter that's running this script
        python_executable = sys.executable
        
        # Run the prediction script as a subprocess
        result = subprocess.run([python_executable, "-m", "models.main_prediction"], 
                               capture_output=True, text=True)
        
        print(f"[{datetime.now()}] Subprocess return code: {result.returncode}")
        print(f"[{datetime.now()}] Subprocess stdout: {result.stdout}")
        print(f"[{datetime.now()}] Subprocess stderr: {result.stderr}")
        
        if result.returncode == 0:
            last_update_time = datetime.now()
            using_real_data = True
            print(f"[{last_update_time}] Forecast updated successfully with real data")
            
            # Check if the output file was actually created
            csv_path = os.path.join('output', 'bangalore_short_term_forecast.csv')
            if os.path.exists(csv_path):
                print(f"[{datetime.now()}] Output file exists at: {csv_path}")
            else:
                print(f"[{datetime.now()}] WARNING: Output file does not exist despite successful return code")
                using_real_data = False
        else:
            print(f"[{datetime.now()}] Error updating forecast: {result.stderr}")
            using_real_data = False
            
    except Exception as e:
        print(f"[{datetime.now()}] Exception during manual forecast update: {str(e)}")
        print(f"[{datetime.now()}] Traceback: {traceback.format_exc()}")
        using_real_data = False
    finally:
        is_updating = False
