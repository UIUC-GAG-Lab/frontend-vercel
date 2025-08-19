import paho.mqtt.client as mqtt
import json
import time
import threading
import uuid
import ssl
from datetime import datetime

# MQTT Configuration
BROKER = "15587f0ec5124364bfb9be25e4e47026.s1.eu.hivemq.cloud"
PORT = 8883
USERNAME = "ur2gglab"
PASSWORD = "Ur2gglab"

# Topics
TEST_PUB_TOPIC = 'ur2/test/init'  # Listen for commands from frontend
TEST_SUB_TOPIC = 'ur2/test/stage'  # Send responses to frontend

# Test Stages (matching frontend)
PROCESS_STAGES = [
    'Sample Preparation',
    'Dissolution', 
    'Filtration',
    'Dilution',
    'Sampling',
    'Color Agent Addition',
    'Data Analysis'
]

# Global variables
client = None
active_tests = {}

def log_message(message):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def simulate_test_process(test_id):
    
    log_message(f"Starting test process stage for {test_id}")
    
    response = {
            "testId": test_id,
            "run_status": "started",
            "run_stage": 0,
            "timestamp": datetime.now().isoformat()
    }

    try:
        # # Send test started confirmation
        
        # client.publish(TEST_SUB_TOPIC, json.dumps(response))
        #log_message(f"Sent 'started' status for test {test_id}")
        
        # Simulate each stage
        for stage_index, stage_name in enumerate(PROCESS_STAGES):
            if test_id not in active_tests:
                log_message(f"Test {test_id} was stopped")
                return
                
            log_message(f"Test {test_id} - Processing stage {stage_index + 1}: {stage_name}")
            
            # Add logic here to run differnt scripts based on the given stages.
            stage_duration = 3 + (stage_index * 0.5)  # Varying duration
            time.sleep(stage_duration)
            
            if test_id not in active_tests:
                log_message(f"Test {test_id} was stopped during {stage_name}")
                return
            
            response['run_status'] = "running"
            response['run_stage'] = stage_index + 1
            response['timestamp'] = datetime.now().isoformat()


            client.publish(TEST_SUB_TOPIC, json.dumps(response))
            log_message(f"Test {test_id} - Stage {stage_index + 1} ({stage_name}) completed")
        
        # Send test completion
        response['run_status'] = "completed"
        response['run_stage'] = len(PROCESS_STAGES)
        response['timestamp'] = datetime.now().isoformat()

        client.publish(TEST_SUB_TOPIC, json.dumps(response))
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
        log_message(f"📡 Subscribed to topic: {TEST_PUB_TOPIC}")
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

def main():
    global client
    
    log_message("Initializing Fake RPI Simulator...")
    log_message(f"Broker: {BROKER}:{PORT}")
    log_message(f"Username: {USERNAME}")
    log_message(f"Listening on: {TEST_PUB_TOPIC}")
    log_message(f"Publishing to: {TEST_SUB_TOPIC}")
    
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
