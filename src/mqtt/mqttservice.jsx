import mqtt from 'mqtt';

class MQTTService {
    constructor(){
        this.client = null;
        this.isConnected = false;
        this.isConnecting = false; // connection state tracking
        this.connectionPromise = null; // Track connection promise
        
        this.clientId = this.generateUniqueClientId();
        
        // Updated topics to match RPI script
        this.TEST_PUB_TOPIC = 'ur2/test/init';
        this.TEST_SUB_TOPIC = 'ur2/test/stage';
        this.CONFIRMATION_TOPIC = 'ur2/test/confirm';
        // prod url
        // this.MQTT_BROKER_URL = '04e8fe793a8947ad8eda947204522088.s1.eu.hivemq.cloud'
        
        // testing url
        this.MQTT_BROKER_URL = '69fd2157960d4f39950410b17ba9d85c.s1.eu.hivemq.cloud' 
        
        this.MQTT_USERNAME = "ur2gglab";
        this.MQTT_PASSWORD = "Ur2gglab";
        
        this.stageUpdateCallback = null; // callback for stage updates
        this.confirmationCallback = null; // callback for confirmation requests
    }

    generateUniqueClientId() {
        
        let clientId = sessionStorage.getItem('mqtt_client_id');
        if (!clientId) {
            
            const userAgent = navigator.userAgent.slice(-10);
            const randomId = Math.random().toString(36).substring(2, 15);
            clientId = `ur2_frontend_${userAgent}_${randomId}`;
            sessionStorage.setItem('mqtt_client_id', clientId);
        }
        return clientId;
    }

    
    async connect(brokerUrl = `wss://${this.MQTT_BROKER_URL}:8884/mqtt`, options = {}) {
        // Return existing connection if already connected
        if (this.isConnected && this.client) {
            return this.client;
        }

        
        if (this.isConnecting && this.connectionPromise) {
            console.log("🔄 Connection already in progress, waiting...");
            return this.connectionPromise;
        }

        this.isConnecting = true;
        
   
        
        this.connectionPromise = new Promise((resolve, reject) => {
            const defaultOptions = {
                keepalive: 120,
                clientId: this.clientId, 
                protocolId: 'MQTT',
                protocolVersion: 4,
                clean: false,
                reconnectPeriod: 1000,
                connectTimeout: 30 * 1000,
                username: this.MQTT_USERNAME,
                password: this.MQTT_PASSWORD,
                protocol: 'wss',
                ...options
            };

            this.client = mqtt.connect(brokerUrl, defaultOptions);

            this.client.on('connect', () => {
                console.log("✅ Connected to HiveMQ Cloud broker");
                this.isConnected = true;
                this.isConnecting = false;
                this.subscribeToTopics();
                resolve(this.client);
            });

            this.client.on('error', (error) => {
                console.error("❌ MQTT connection error:", error);
                this.isConnected = false;
                this.isConnecting = false;
                reject(error);
            });

            this.client.on("offline", () => {
                console.warn("📡 MQTT client is offline");
                this.isConnected = false;
            });

            this.client.on("message", (topic, message) => {
                this.handleMessage(topic, message.toString());
            });

            this.client.on('reconnect', () => {
                console.log("🔄 Reconnecting to HiveMQ...");
            });

            this.client.on('close', () => {
                console.log("🔌 MQTT connection closed");
                this.isConnected = false;
                this.isConnecting = false;
            });
        });

        return this.connectionPromise;
    }

    subscribeToTopics(){
        if(!this.isConnected || !this.client) return;

        this.client.subscribe(this.TEST_SUB_TOPIC, (err) => {
            if (err) {
                console.error("Failed to subscribe to topic:", err);
            }else{
                console.log("Subscribed to topic:", this.TEST_SUB_TOPIC);
            }
        });
    }

    handleMessage(topic, message) {
        
        if (topic === this.TEST_SUB_TOPIC) {
            // Process the test response message from RPI
            try{
                const result_from_rpi = JSON.parse(message);
                // status can be "started", "running", "completed", "already_running", "stopped", "waiting_confirmation"
                
                if (result_from_rpi.run_status === "waiting_confirmation") {
                    // Handle confirmation request
                    if (this.confirmationCallback) {
                        this.confirmationCallback(result_from_rpi);
                    }
                } else {
                    // Handle normal stage updates
                    if(this.stageUpdateCallback) {
                        this.stageUpdateCallback(result_from_rpi);
                    }
                }
                
            }catch(e){
                console.log("Non-JSON message from RPI:", message);
            }
        }
    }

    publish(topic, message, options = {qos: 0, retain: false}) {
        if (!this.isConnected || !this.client) {
            console.error("Cannot publish, MQTT client is not connected");
            return false;
        }

        this.client.publish(topic, message, options, (err) => {
            if (err) {
                console.error("Failed to publish message:", err);
            } else {
                console.log(`Message published to ${topic}:`, message);
            }
        });

        return true;
    }

    sendStartCommand(testId) {
        const payload = JSON.stringify({ 
            command: "start",  
            testId: testId,
            timestamp: new Date().toISOString()
        });
        return this.publish(this.TEST_PUB_TOPIC, payload);
    }

    sendConfirmation(testId, confirmed) {
        const payload = JSON.stringify({
            testId: testId,
            confirmed: confirmed,
            timestamp: new Date().toISOString()
        });
        return this.publish(this.CONFIRMATION_TOPIC, payload);
    }

    // Set callback for stage updates
    setStageUpdateCallback(callback) {
        this.stageUpdateCallback = callback;
    }

    // Set callback for confirmation requests
    setConfirmationCallback(callback) {
        this.confirmationCallback = callback;
    }

    disconnect() {
        if (this.client) {
            this.client.end(() => {
                console.log("🔌 Disconnected from HiveMQ Cloud broker");
                this.isConnected = false;
                this.isConnecting = false;
                this.connectionPromise = null;
            });
        }
        // Clear client ID from session storage on explicit disconnect
        sessionStorage.removeItem('mqtt_client_id');
    }
}

export const mqttService = new MQTTService();
export default mqttService;