import paho.mqtt.client as mqtt
import json
import time
import threading
import uuid
import ssl
from datetime import datetime

import subprocess
import shlex
import sys

# --- config (direct, no env vars) ---
PYTHON_BIN = sys.executable  # use same interpreter as main program

SCRIPT_PY = {
    "script_1": {
        "path": "/opt/ur2/pump_200ml.py",
        "args": ["--ml", "200"],
        "timeout": 900,   # 15 min
    },
    "script_2": {
        "path": "/opt/ur2/extract_cycle.py",
        "args": [],
        "timeout": 600,   # 10 min
    },
    "script_3": {
        "path": "/opt/ur2/transform_and_load.py",
        "args": [],
        "timeout": 600,   # 10 min
    },
}


# MQTT Configuration
# prod URL
# BROKER = "04e8fe793a8947ad8eda947204522088.s1.eu.hivemq.cloud"
# testing url
BROKER = "69fd2157960d4f39950410b17ba9d85c.s1.eu.hivemq.cloud"
PORT = 8883
USERNAME = "ur2gglab"
PASSWORD = "Ur2gglab"

# Topics
TEST_PUB_TOPIC = 'ur2/test/init'  # Listen for commands from frontend
TEST_SUB_TOPIC = 'ur2/test/stage'  # Send responses to frontend
CONFIRMATION_TOPIC = 'ur2/test/confirm'  # Handle user confirmations

# Test Stages (7 stages workflow)
PROCESS_STAGES = [
    'preparing sample',
    'dissolution', 
    'filteration',
    'dilution',
    'color agent addition'
]

# Global variables
client = None
active_tests = {}
user_confirmations = {}  # Store user confirmation responses

###################################


def log_message(message):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")


# --- helper to run python scripts ---
def run_external_py(name: str):
    cfg = SCRIPT_PY[name]
    cmd = [PYTHON_BIN, cfg["path"], *cfg["args"]]

    log_message(f"{name}: launching -> {cmd}")
    try:
        res = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=cfg["timeout"],
            check=False,
        )
    except subprocess.TimeoutExpired:
        log_message(f"{name}: TIMEOUT after {cfg['timeout']}s")
        raise
    except FileNotFoundError:
        log_message(f"{name}: file not found -> {cfg['path']}")
        raise

    if res.stdout:
        log_message(f"{name} stdout:\n{res.stdout.strip()[-300:]}")
    if res.stderr:
        log_message(f"{name} stderr:\n{res.stderr.strip()[-300:]}")

    if res.returncode != 0:
        raise RuntimeError(f"{name} failed with code {res.returncode}")

    log_message(f"{name}: finished successfully (code 0)")




def run_script_1():
    """Run Script 1 ONCE: Pump 200mL NaOH and keep heating pad on - INDEPENDENT STAGE"""
    log_message("Script 1: Pumping 200mL of NaOH...")
    
    time.sleep(2)  # Simulate pumping time
    log_message("Script 1: Turning on heating pad...")
    time.sleep(1)  # Simulate heating pad activation

    #run_external_py("script_1")  # Run the actual script


    log_message("Script 1: COMPLETED PERMANENTLY - Heating pad is now ON")

def run_script_2():
    """Run Script 2: Part of 5-cycle process - Extraction and processing"""
    log_message("Script 2: Starting extraction process...")
    
    time.sleep(1.5)  # Simulate script 2 execution
    log_message("Script 2: Complete")

    # run_external_py("script_2")  # Run the actual script

def run_script_3():
    """Run Script 3: Part of 5-cycle process - Transformation and loading to cuvette"""
    
    log_message("Script 3: Starting transformation and loading to cuvette...")
    time.sleep(2)  # Simulate script 3 execution

    #run_external_py("script_3")  # Run the actual script

    log_message("Script 3: Complete")

def wait_for_user_confirmation(test_id, cycle_number):
    """Send confirmation request to frontend and wait for response"""
    log_message(f"Test {test_id}: Requesting user confirmation after cycle {cycle_number}/5...")
    
    confirmation_request = {
        "testId": test_id,
        "run_status": "waiting_confirmation",
        "message": f"Color agent addition - Cycle {cycle_number}/5 completed. Continue with next cycle? Check if more NaOH is needed.",
        "cycle": cycle_number,
        "timestamp": datetime.now().isoformat()
    }
    
    client.publish(TEST_SUB_TOPIC, json.dumps(confirmation_request))
    
    # Wait for user response indefinitely
    confirmation_key = f"{test_id}_confirmation"
    user_confirmations[confirmation_key] = None
    
    # Wait indefinitely for user response
    while user_confirmations.get(confirmation_key) is None:
        if test_id not in active_tests:
            # Test was stopped, clean up and return False
            if confirmation_key in user_confirmations:
                del user_confirmations[confirmation_key]
            return False
        time.sleep(0.5)  # Check every 500ms
    
    response = user_confirmations[confirmation_key]
    del user_confirmations[confirmation_key]  # Clean up
    log_message(f"Test {test_id}: User {'confirmed' if response else 'declined'} to continue after cycle {cycle_number}")
    return response

def simulate_test_process(test_id):
    log_message(f"Starting test process for {test_id}")
    
    response = {
        "testId": test_id,
        "run_status": "started",
        "run_stage": 0,
        "timestamp": datetime.now().isoformat()
    }

    try:
        # Stage 1: Preparing Sample (Script 1) - Run ONCE ONLY
        if test_id not in active_tests:
            return
            
        log_message(f"Test {test_id} - Stage 1: Preparing Sample (Script 1)")
        
        # Update to show stage 1 is starting
        response['run_status'] = "running"
        response['run_stage'] = 1
        response['timestamp'] = datetime.now().isoformat()
        client.publish(TEST_SUB_TOPIC, json.dumps(response))
        
        # Run Script 1 (independent, runs only once)
        run_script_1()  # Pump 200mL NaOH + heating pad
        
        log_message(f"Test {test_id} - Stage 1 (Preparing Sample) COMPLETED PERMANENTLY")
        time.sleep(1)  # Brief pause to show completion
        
        # Stages 2-5: Cycle through Script 2 & 3 (5 times with confirmations)
        for cycle in range(1, 6):  # 5 cycles
            if test_id not in active_tests:
                return
                
            log_message(f"Test {test_id} - Starting Cycle {cycle}/5")
            
            # Send cycle start notification (resets stages 2-5 in UI)
            cycle_response = {
                "testId": test_id,
                "run_status": "cycle_start",
                "cycle": cycle,
                "run_stage": 2,  # Reset to stage 2 for each cycle
                "timestamp": datetime.now().isoformat()
            }
            client.publish(TEST_SUB_TOPIC, json.dumps(cycle_response))
            
            # Stage 2: Dissolution (part of Script 2)
            if test_id not in active_tests:
                return
            log_message(f"Test {test_id} - Cycle {cycle}: Dissolution")
            time.sleep(2)  # Simulate dissolution
            
            response['run_status'] = "running"
            response['run_stage'] = 2
            response['cycle'] = cycle
            response['timestamp'] = datetime.now().isoformat()
            client.publish(TEST_SUB_TOPIC, json.dumps(response))
            
            # Stage 3: Filteration (part of Script 2)
            if test_id not in active_tests:
                return
            log_message(f"Test {test_id} - Cycle {cycle}: Filteration")
            time.sleep(2)  # Simulate filteration
            
            response['run_status'] = "running"
            response['run_stage'] = 3
            response['cycle'] = cycle
            response['timestamp'] = datetime.now().isoformat()
            client.publish(TEST_SUB_TOPIC, json.dumps(response))
            
            # Stage 4: Dilution (part of Script 2)
            if test_id not in active_tests:
                return
            log_message(f"Test {test_id} - Cycle {cycle}: Dilution")
            time.sleep(2)  # Simulate dilution
            run_script_2()  # Actually run script 2 here
            
            response['run_status'] = "running"
            response['run_stage'] = 4
            response['cycle'] = cycle
            response['timestamp'] = datetime.now().isoformat()
            client.publish(TEST_SUB_TOPIC, json.dumps(response))
            
            # Stage 5: Color Agent Addition (Script 3)
            if test_id not in active_tests:
                return
            log_message(f"Test {test_id} - Cycle {cycle}: Color Agent Addition")
            time.sleep(2)  # Simulate color agent addition
            run_script_3()  # Actually run script 3 here
            
            response['run_status'] = "running"
            response['run_stage'] = 5
            response['cycle'] = cycle
            response['timestamp'] = datetime.now().isoformat()
            client.publish(TEST_SUB_TOPIC, json.dumps(response))
            
            log_message(f"Test {test_id} - Cycle {cycle}/5 completed")
            
            # After each cycle, ask for user confirmation
            if not wait_for_user_confirmation(test_id, cycle):
                log_message(f"Test {test_id} - User chose to stop after cycle {cycle}")
                
                # Send stopped/failed status to frontend
                stopped_response = {
                    "testId": test_id,
                    "run_status": "failed",
                    "message": f"Process stopped by user after cycle {cycle}/5",
                    "run_stage": 5,
                    "cycle": cycle,
                    "timestamp": datetime.now().isoformat()
                }
                client.publish(TEST_SUB_TOPIC, json.dumps(stopped_response))
                
                # Remove from active tests
                if test_id in active_tests:
                    del active_tests[test_id]
                return  # Exit if user chooses to stop
        
        # Stage 6: Data Analysis (final stage)
        if test_id not in active_tests:
            return
            
        log_message(f"Test {test_id} - Stage 6: Data Analysis")
        time.sleep(3)  # Simulate data analysis
        
        response['run_status'] = "running"
        response['run_stage'] = 6
        response['cycle'] = None  # No more cycles
        response['timestamp'] = datetime.now().isoformat()
        client.publish(TEST_SUB_TOPIC, json.dumps(response))
        log_message(f"Test {test_id} - Stage 6 (Data Analysis) completed")
        
        # Send test completion
        response['run_status'] = "completed"
        response['run_stage'] = len(PROCESS_STAGES)
        response['cycle'] = None
        response['timestamp'] = datetime.now().isoformat()
        client.publish(TEST_SUB_TOPIC, json.dumps(response))

        log_message(f"Test {test_id} completed successfully!")
        
        # Remove from active tests
        if test_id in active_tests:
            del active_tests[test_id]
        
        log_message(f"Test {test_id} completed successfully!")
        
        # Remove from active tests
        if test_id in active_tests:
            del active_tests[test_id]
            
    except Exception as e:
        log_message(f"Error in test {test_id}: {str(e)}")
        
        # Send error response
        error_response = {
            "testId": test_id,
            "run_status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }
        client.publish(TEST_SUB_TOPIC, json.dumps(error_response))
        
        # Remove from active tests
        if test_id in active_tests:
            del active_tests[test_id]

def on_connect(client, userdata, flags, rc):
    """Callback for when client connects to broker"""
    if rc == 0:
        log_message("Connected to HiveMQ Cloud broker successfully!")
        log_message(f"Session present: {flags['session present']}")
        client.subscribe(TEST_PUB_TOPIC)
        client.subscribe(CONFIRMATION_TOPIC)
        log_message(f"📡 Subscribed to topics: {TEST_PUB_TOPIC}, {CONFIRMATION_TOPIC}")
    else:
        error_messages = {
            1: "Connection refused - incorrect protocol version",
            2: "Connection refused - invalid client identifier",
            3: "Connection refused - server unavailable",
            4: "Connection refused - bad username or password",
            5: "Connection refused - not authorised"
        }
        error_msg = error_messages.get(rc, f"Unknown error code: {rc}")
        log_message(f"Failed to connect to broker. {error_msg}")

def on_disconnect(client, userdata, rc):
    """Callback for when client disconnects"""
    if rc != 0:
        log_message(f"Unexpected disconnection from HiveMQ Cloud broker (code: {rc})")
        log_message("Client will attempt to reconnect automatically...")
    else:
        log_message("Clean disconnection from HiveMQ Cloud broker")

def on_log(client, userdata, level, buf):
    """Callback for MQTT client logging"""
    log_message(f"MQTT Log: {buf}")

def on_publish(client, userdata, mid):
    """Callback for when message is published"""
    log_message(f"Message published with ID: {mid}")

def on_subscribe(client, userdata, mid, granted_qos):
    """Callback for when subscription is confirmed"""
    log_message(f"Subscription confirmed with QoS: {granted_qos}")

def on_unsubscribe(client, userdata, mid):
    """Callback for when unsubscription is confirmed"""
    log_message(f"Unsubscription confirmed with ID: {mid}")

def on_message(client, userdata, msg):
    """Handle incoming messages from frontend"""
    topic = msg.topic
    message = msg.payload.decode()
    
    log_message(f"Received message on topic '{topic}'")
    
    if topic == TEST_PUB_TOPIC:
        try:
            data = json.loads(message)
            command = data.get("command")
            test_id = data.get("testId")
            
            if command == "start" and test_id:
                if test_id in active_tests:
                    log_message(f"Test {test_id} is already running")
                    
                    response = {
                        "testId": test_id,
                        "run_status": "already_running",
                    }
                    client.publish(TEST_SUB_TOPIC, json.dumps(response))
                else:
                    # Start new test in background thread
                    log_message(f"Starting new test: {test_id}")
                    active_tests[test_id] = {
                        "start_time": datetime.now(),
                        "current_stage": 0
                    }
                    
                    # Start test process in separate thread
                    test_thread = threading.Thread(
                        target=simulate_test_process, 
                        args=(test_id,),
                        daemon=True
                    )
                    test_thread.start()
            
            elif command == "stop" and test_id:
                if test_id in active_tests:
                    log_message(f"Stopping test: {test_id}")
                    del active_tests[test_id]
                    
                    # Send stopped response
                    response = {
                        "testId": test_id,
                        "run_status": "stopped",
                        "message": "Test stopped by user"
                    }
                    client.publish(TEST_SUB_TOPIC, json.dumps(response))
                else:
                    log_message(f"Test {test_id} is not running")
            
            else:
                log_message(f"Unknown command: {command}")
                
        except json.JSONDecodeError:
            log_message(f"Invalid JSON received: {message}")
        except Exception as e:
            log_message(f"Error processing message: {str(e)}")
    
    elif topic == CONFIRMATION_TOPIC:
        try:
            data = json.loads(message)
            test_id = data.get("testId")
            confirmed = data.get("confirmed", False)
            
            if test_id:
                confirmation_key = f"{test_id}_confirmation"
                user_confirmations[confirmation_key] = confirmed
                log_message(f"Received user confirmation for test {test_id}: {'Yes' if confirmed else 'No'}")
            
        except json.JSONDecodeError:
            log_message(f"Invalid JSON received on confirmation topic: {message}")
        except Exception as e:
            log_message(f"Error processing confirmation message: {str(e)}")

def main():
    global client
    
    log_message("Initializing Fake RPI Simulator...")
    log_message(f"Broker: {BROKER}:{PORT}")
    log_message(f"Username: {USERNAME}")
    log_message(f"Listening on: {TEST_PUB_TOPIC}")
    log_message(f"Publishing to: {TEST_SUB_TOPIC}")
    log_message(f"Confirmation topic: {CONFIRMATION_TOPIC}")
    
    # Create a more stable client ID based on machine info
    import platform
    import hashlib
    
    machine_info = f"{platform.node()}-{platform.system()}"
    client_id_hash = hashlib.md5(machine_info.encode()).hexdigest()[:8]
    client_id = f"ur2-rpi-{client_id_hash}"
    log_message(f"Client ID: {client_id}")
    
    
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id=client_id, clean_session=False)  # Changed to False
    client.username_pw_set(USERNAME, PASSWORD)
    
    
    client.tls_set()
    client.tls_insecure_set(False) 
    client.max_inflight_messages_set(20) # Set keepalive and other connection parameters
    client.max_queued_messages_set(0)
    
    # Set callbacks
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.on_log = on_log
    client.on_publish = on_publish
    client.on_subscribe = on_subscribe
    client.on_unsubscribe = on_unsubscribe
    
    # Enable detailed logging (only for debugging)
    # client.enable_logger()
    
    # Enable reconnection
    client.reconnect_delay_set(min_delay=1, max_delay=60)
    
    try:
        # Connect to broker with longer keepalive
        log_message("Connecting to HiveMQ Cloud...")
        client.connect(BROKER, PORT, 120) 
        
        # Start the loop
        log_message("Starting MQTT loop... Press Ctrl+C to stop")
        client.loop_forever()
        
    except ssl.SSLError as ssl_err:
        log_message(f"SSL Error: {ssl_err}")
        log_message("Trying with insecure TLS settings...")
        try:
            # Fallback: Try with less strict TLS
            client.tls_insecure_set(True)
            client.connect(BROKER, PORT, 120)
            client.loop_forever()
        except Exception as fallback_err:
            log_message(f"Fallback connection failed: {fallback_err}")
            
    except KeyboardInterrupt:
        log_message("Stopping RPI simulator...")
        
        for test_id in list(active_tests.keys()): # Stop all active tests
            del active_tests[test_id]
        client.disconnect()
        log_message("RPI simulator stopped")
        
    except Exception as e:
        log_message(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
