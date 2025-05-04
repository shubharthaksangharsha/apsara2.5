 # backend/get_battery.py
import psutil
import json
import sys
try:
    battery = psutil.sensors_battery()
    if battery:
        response = {
            "levelPercent": round(battery.percent),
            "isCharging": battery.power_plugged,
            "status": f"{round(battery.percent)}% {'(Charging)' if battery.power_plugged else '(Discharging)'}"
        }
    else:
            response = {"error": "No battery detected."}
except Exception as e:
    response = {"error": f"Failed to get battery status: {str(e)}"}

print(json.dumps(response))
sys.stdout.flush() # Ensure output is flushed immediately