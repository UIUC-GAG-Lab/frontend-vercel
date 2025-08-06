import mqtt from 'mqtt';

class MQTTService {
    constructor(){
        this.client = null;
        this.isConnected = false;
        // Updated topics to match RPI script
        this.TEST_PUB_TOPIC = 'ur2/test/init';
        this.TEST_SUB_TOPIC = 'ur2/test/stage';
        this.MQTT_BROKER_URL = '7c6925a110aa44f98ccf36d0b612fc93.s1.eu.hivemq.cloud'
        this.MQTT_USERNAME = "ur2gglab";
        this.MQTT_PASSWORD = "Ur2gglab";
        
        this.stageUpdateCallback = null; // callback for stage updates
    }

    // creates client object and define its behavior
    connect(brokerUrl = `wss://${this.MQTT_BROKER_URL}:8884/mqtt`, options = {}){
        
        console.log("Attempting to connect to HiveMQ Cloud broker at:", brokerUrl);
        
         const defaultOptions = {
            keepalive: 120,
            clientId: `ur2_frontend_${Date.now()}`,  // Fixed: Different client ID
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
            username: this.MQTT_USERNAME,
            password: this.MQTT_PASSWORD, // Fixed password case
            protocol: 'wss',
            ...options
        };


        this.client = mqtt.connect(brokerUrl, defaultOptions);

        this.client.on('connect', () => {
            console.log("✅ Connected to HiveMQ Cloud broker");
            this.isConnected = true;
            this.subscribeToTopics();
        });

        this.client.on('error', (error) => {
            console.error("❌ MQTT connection error:", error);
            this.isConnected = false;
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
        });

        return this.client;
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
                const data = JSON.parse(message);
                // status can be "started", "stage_completed", "completed", or "already_running", "stopped"
                
                
                // // Handle different response types
                if (data.status === "stage_completed") {
                    // Notify the Home component about stage update
                    if (this.stageUpdateCallback) {
                        this.stageUpdateCallback(data.testId, data.stage);
                    }
                } else if (data.status === "completed") {

                    // Notify completion
                    if (this.stageUpdateCallback) {
                        this.stageUpdateCallback(data.testId, 'completed');
                    }
                } else if (data.status === "error") {
                    console.log(`Test ${data.testId} failed: ${data.message}`);
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

    // Set callback for stage updates
    setStageUpdateCallback(callback) {
        this.stageUpdateCallback = callback;
    }

    disconnect() {
        if (this.client) {
            this.client.end(() => {
                console.log("🔌 Disconnected from HiveMQ Cloud broker");
                this.isConnected = false;
            });
        }
    }
}

export const mqttService = new MQTTService();
export default mqttService;