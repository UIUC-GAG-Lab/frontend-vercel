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
import json, multiprocessing

# --- config (direct, no env vars) ---
PYTHON_BIN = sys.executable  # use same interpreter as main program

RPI_TO_PARTS_PATH= r"D:\ur2-common-code\rpi-to-parts\splitted"

SCRIPT_PY = {
    "prepare":{
        "path": f"{RPI_TO_PARTS_PATH}/ur2_prepare.py",
        "timeout": 1200,  # 20 min  
    },
    "heat":{
        "path": f"{RPI_TO_PARTS_PATH}/ur2_heat.py",
    },
    "dissolution":{
        "path": f"{RPI_TO_PARTS_PATH}/ur2_dissolution.py",
    },
    "dilution":{
        "path": f"{RPI_TO_PARTS_PATH}/ur2_dilution.py",
    },
    "color_agents":{
        "path": f"{RPI_TO_PARTS_PATH}/ur2_coloragents.py",
        "args":[],
    }
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
IMAGE_TOPIC = 'ur2/test/image'  # New topic for sending images

# Test Stages (4 stages workflow)
PROCESS_STAGES = [
    'Sample Preparation',
    'Dissolution',
    'Filtration & Dilution',
    'Color Agent Addition'
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


def now_iso():
    return datetime.now().isoformat()

def pub(test_id, **fields):
    payload = {"testId": test_id, "timestamp": now_iso(), **fields}
    client.publish(TEST_SUB_TOPIC, json.dumps(payload))
    
def send_img_to_web(test_id=None, cycle=None):
    """Send image over MQTT after script 3."""
    try:
        import os
        import glob
        img_dir = 'test_img'
        # Find all files in the directory, sort by modified time descending
        img_files = glob.glob(os.path.join(img_dir, '*'))
        if not img_files:
            log_message('No image files found in test_img/')
            return
        latest_img = max(img_files, key=os.path.getmtime)
        with open(latest_img, 'rb') as img_file:
            img_bytes = img_file.read()
        filename = os.path.basename(latest_img)
        # Send metadata first
        image_metadata = {
            'testId': test_id,
            'cycle': cycle,
            'filename': filename,
            'size': len(img_bytes),
            'timestamp': datetime.now().isoformat()
        }
        client.publish(IMAGE_TOPIC, json.dumps(image_metadata))
        client.publish(IMAGE_TOPIC + '/raw', img_bytes)  # Send raw bytes to a subtopic
        log_message(f"Image bytes sent over MQTT for test {test_id}, cycle {cycle}, file {filename}")
    except Exception as e:
        log_message(f"Failed to send image: {e}")


# --- helper to run python scripts ---
def run_external_py(name: str, timeout=None):
    print("#"*30)
    time.sleep(3)  # Simulate script execution time
    print(f"Simulating {name} script...")
    print("#"*30)


## deployment code
# def run_external_py2(name: str, timeout=None):
#     cfg = SCRIPT_PY[name]
#     args = cfg.get("args", [])
#     cmd = [PYTHON_BIN, cfg["path"], *args]
#     actual_timeout = timeout if timeout is not None else cfg.get("timeout")

#     log_message(f"{name}: launching -> {cmd}")
#     try:
#         res = subprocess.run(
#             cmd,
#             capture_output=True,
#             text=True,
#             timeout=actual_timeout,
#             check=False,
#         )
#     except subprocess.TimeoutExpired:
#         log_message(f"{name}: TIMEOUT after {actual_timeout}s")
#         raise
#     except FileNotFoundError:
#         log_message(f"{name}: file not found -> {cfg['path']}")
#         raise

#     if res.stdout:
#         log_message(f"{name} stdout:\n{res.stdout.strip()[-300:]}")
#     if res.stderr:
#         log_message(f"{name} stderr:\n{res.stderr.strip()[-300:]}")

#     if res.returncode != 0:
#         raise RuntimeError(f"{name} failed with code {res.returncode}")

#     log_message(f"{name}: finished successfully (code 0)")



#debug code
import threading, time, math

def _simulated_heat_process(run_event):
    """
    Fake long-running heater loop.
    Replace the internals with your real control logic later.
    Must exit promptly when run_event.clear() is called.
    """
    log_message("heat[sim]: process started")
    try:
        target_c = 60.0
        temp_c   = 22.0
        t0 = time.time()
        while run_event.is_set():
            # toy thermal model: temp moves toward target
            temp_c += (target_c - temp_c) * 0.08
            # log every ~5s
            if int(time.time() - t0) % 5 == 0:
                log_message(f"heat[sim]: temp={temp_c:.1f}C target={target_c:.1f}C")
            time.sleep(0.25)  # keep the loop responsive and low-CPU
    finally:
        log_message("heat[sim]: process exiting (heater off)")

def heat_worker(stop_event):
    """
    Start a simulated long-running 'heat' process and keep it alive until:
      - stop_event is set  (normal shutdown), or
      - the simulated process dies unexpectedly (error path).
    """
    # internal event the simulated process uses to decide whether to keep running
    run_event = threading.Event()
    run_event.set()

    try:
        log_message("heat: starting simulated background heat process")
        th = threading.Thread(target=_simulated_heat_process, args=(run_event,), daemon=True)
        th.start()

        # monitor loop (mirrors your subprocess .poll() check)
        while not stop_event.is_set():
            if not th.is_alive():
                log_message("heat: simulated process exited unexpectedly!")
                break
            time.sleep(1)

        # request the simulated "process" to stop
        if th.is_alive():
            log_message("heat: requesting simulated heat process to stop...")
            run_event.clear()
            th.join(timeout=10)

            if th.is_alive():
                # Can't force-kill threads; ensure your loop respects run_event to exit promptly.
                log_message("heat: simulated heat process didn't stop in time (still alive).")

        log_message("heat: background heat process stopped")

    except Exception as e:
        log_message(f"heat: error in heat_worker: {e}")

# deployment Code
# --- Heat script as background process ---
# def heat_worker_original(stop_event):
#     try:
#         log_message("heat: starting background heat script")
#         proc = subprocess.Popen([PYTHON_BIN, SCRIPT_PY["heat"]["path"]])
#         while not stop_event.is_set():
#             if proc.poll() is not None:
#                 log_message("heat: process exited unexpectedly!")
#                 break
#             time.sleep(1)
#         if proc.poll() is None:
#             log_message("heat: terminating heat process...")
#             proc.terminate()
#             try:
#                 proc.wait(timeout=10)
#             except subprocess.TimeoutExpired:
#                 log_message("heat: killing heat process...")
#                 proc.kill()
#         log_message("heat: background heat script stopped")
#     except Exception as e:
#         log_message(f"heat: error in heat_worker: {e}")


def start_heat():
    ev = multiprocessing.Event()
    proc = multiprocessing.Process(target=heat_worker, args=(ev,))
    proc.start()
    log_message("Heat process started in background.")
    return ev, proc

def stop_heat(ev, proc, timeout=20):
    try:
        if ev: ev.set()
        if proc: proc.join(timeout=timeout)
    finally:
        log_message("Heat process stopped.")



def wait_for_user_confirmation(test_id, cycle_number):
    """Send confirmation request to frontend and wait for response"""
    log_message(f"Test {test_id}: Requesting user confirmation after cycle {cycle_number}/5...")

    conf_msg = f"Cycle {cycle_number}/5 completed"
    
    pub(test_id, 
        run_status="waiting_confirmation", 
        message=conf_msg, 
        cycle=cycle_number)
    
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



def simulate_test_process(test_id: str, max_cycles: int = 5):
    pub(test_id, 
        run_status="started", 
        run_stage=0)
    
    heat_ev = heat_proc = None

    try:
        # 1) prepare once
        log_message(f"Test {test_id}: Running prepare script")
        run_external_py("prepare")
        pub(test_id, 
            run_status="running", 
            run_stage=1)

        # 2) heat in background for entire test
        heat_ev, heat_proc = start_heat()

        user_stopped = False
        per_cycle_steps = [("dissolution", 2), 
                           ("dilution", 3), 
                           ("color_agents", 4)]

        for cycle in range(1, max_cycles + 1):
            if test_id not in active_tests:
                break

            log_message(f"Test {test_id} - Starting Cycle {cycle}/{max_cycles}")
            pub(test_id, 
                run_status="cycle_start", 
                cycle=cycle, 
                run_stage=2)

            for step_name, stage in per_cycle_steps:
                log_message(f"Test {test_id} - Cycle {cycle}: Running {step_name}")
                run_external_py(step_name)
                if step_name == "color_agents":
                    send_img_to_web(test_id=test_id, cycle=cycle)
                pub(test_id, 
                    run_status="running", 
                    run_stage=stage, 
                    cycle=cycle)

            log_message(f"Test {test_id} - Cycle {cycle}/{max_cycles} completed")

            # confirm continuation
            if not wait_for_user_confirmation(test_id, cycle):
                msg = f"test interrupted after cycle {cycle}"
                log_message(f"Test {test_id} - {msg}")
                pub(test_id, 
                    run_status="failed", 
                    message=msg, 
                    run_stage=4, 
                    cycle=cycle)
                user_stopped = True
                break

        # always stop heat
        stop_heat(heat_ev, heat_proc)

        # wrap up (only if not user-stopped and still active)
        if not user_stopped and test_id in active_tests:
            pub(test_id, 
                run_status="completed", 
                run_stage=len(PROCESS_STAGES), 
                cycle=None)
            log_message(f"Test {test_id} completed successfully!")
            del active_tests[test_id]

    except Exception as e:
        log_message(f"Error in test {test_id}: {e}")
        stop_heat(heat_ev, heat_proc, timeout=10)
        pub(test_id, run_status="error", message=str(e))
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