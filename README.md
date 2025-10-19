# ur2-frontend-code — User Interface System

## What This System Does

**In simple terms**: The frontend is a web-based control panel that lets users create lab analysis tests, monitor their progress in real-time, and view the results. It's the main interface that operators use to interact with the UR2 Device.

## Purpose

React-based web application that provides an intuitive user interface for creating, monitoring, and managing UR2 analysis tests. The frontend connects to both the backend API for data management and Raspberry Pi devices via MQTT for real-time communication.

## How It Works (Quick Overview)

1. **Test Creation** - Users create new UR2 Experiment tests through a web form
2. **Real-time Monitoring** - Live updates from Raspberry Pi devices via MQTT
3. **Status Tracking** - Visual progress indicators and stage monitoring
4. **Results Display** - View analysis results and historical data
5. **Device Communication** - Send commands to and receive updates from laboratory devices

## Directory Structure

### Core Application Files
- **`src/App.js`** — Main application component with routing and MQTT initialization
- **`src/index.js`** — Application entry point and React rendering
- **`src/index.css`** — Global styles and Tailwind CSS configuration

### MQTT Communication
- **`src/mqtt/mqttservice.jsx`** — MQTT client for real-time device communication
  - Connects to HiveMQ Cloud broker
  - Publishes start commands to devices
  - Subscribes to status updates
  - Handles confirmation requests

### User Interface Components

#### Dashboard Components (`src/components/dashboard/`)
- **`Sidebar.jsx`** — Navigation menu with page selection
- **`MainView.jsx`** — Main content area with page routing
- **`Console.jsx`** — Real-time log display and system messages

#### Section Components (`src/components/sections/`)
- **`CreateTest.jsx`** — Form for creating new UR2 tests
- **`Home.jsx`** — Dashboard home page with system overview
- **`Settings.jsx`** — System configuration and settings

#### UI Components (`src/components/ui/`)
- **`TestRunCard.jsx`** — Display card for individual test runs
- **`ProcessModal.jsx`** — Modal for showing test progress
- **`TestDetailsModal.jsx`** — Detailed view of test information
- **`ConfirmationModal.jsx`** — User confirmation dialogs

## Key Features

### Test Management
- **Create Tests**: Start new UR2 Experiment runs with custom parameters
- **Monitor Progress**: Real-time status updates from laboratory devices
- **View Results**: Display analysis results and historical data
- **Track Stages**: Visual progress through analysis stages

### Real-time Communication
- **MQTT Integration**: Live communication with Raspberry Pi devices
- **Status Updates**: Automatic updates when devices change status
- **Command Sending**: Send start/stop commands to devices
- **Confirmation Handling**: User confirmation for critical operations

### User Experience
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Logs**: Live console showing system activity
- **Visual Feedback**: Clear indicators for connection status and progress
- **Error Handling**: User-friendly error messages and recovery

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm package manager
- Backend API running (see `ur2-backend-code`)
- MQTT broker access (HiveMQ Cloud configured)

### Local Development Setup

1. **Install Dependencies**:
   ```bash
   cd ur2-frontend-code
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```

3. **Access Application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser

4. **Verify Connections**:
   - Check MQTT connection status in the console
   - Ensure backend API is running on port 5000
   - Test device communication

### Production Build

1. **Build for Production**:
   ```bash
   npm run build
   ```

2. **Deploy Build Files**:
   The `build/` folder contains optimized production files

## MQTT Communication

### Topics Used
- **`ur2/test/init`** — Send start commands to devices
- **`ur2/test/stage`** — Receive status updates from devices
- **`ur2/test/confirm`** — Send user confirmations to devices

### Message Formats
```javascript
// Start command
{
  "command": "start",
  "testId": "unique_test_id",
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Status update
{
  "testId": "unique_test_id",
  "run_status": "running",
  "run_stage": 2,
  "cycle": 1
}

// Confirmation
{
  "testId": "unique_test_id",
  "confirmed": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## API Integration

### Backend Endpoints Used
- **POST** `/runs` — Create new test runs
- **GET** `/runs` — Retrieve all test runs
- **PUT** `/runs/:testId/status` — Update test status

### Data Flow
1. **Create Test**: Frontend → Backend API → Database
2. **Start Test**: Frontend → MQTT → Raspberry Pi
3. **Status Updates**: Raspberry Pi → MQTT → Frontend
4. **Results Storage**: Raspberry Pi → Backend API → Database

## User Interface Pages

### Home Page
- **System Overview**: Current test status and device connections
- **Quick Actions**: Start new tests or view recent results
- **System Health**: MQTT connection status and backend connectivity

### Create Test Page
- **Test Parameters**: Configure test name, operator, and sample size
- **Device Selection**: Choose which devices to use for the test
- **Validation**: Ensure all required fields are completed

### Settings Page
- **MQTT Configuration**: Broker settings and connection parameters
- **Backend Settings**: API endpoint configuration
- **Device Management**: Manage connected laboratory devices

## Testing Without Hardware

### Using Simulators
1. **Run the Fake RPi Simulator**:
   ```bash
   cd ur2-common-code/rpi-to-ui
   python3 new_enhanced_fake_rpi.py
   ```

2. **Test MQTT Communication**:
   - The simulator publishes test status updates
   - Frontend receives and displays updates
   - Test the complete workflow without physical devices

### Manual Testing
```bash
# Send test status update via MQTT
mosquitto_pub -h broker.hivemq.cloud -t "ur2/test/stage" \
  -m '{"testId": "test123", "run_status": "running", "run_stage": 2}'

# Send confirmation request
mosquitto_pub -h broker.hivemq.cloud -t "ur2/test/stage" \
  -m '{"testId": "test123", "run_status": "waiting_confirmation"}'
```

## Available Scripts

### Development
- **`npm start`** — Start development server with hot reload
- **`npm test`** — Run test suite
- **`npm run build`** — Create production build

### Production
- **`npm run build`** — Optimized production build
- **`npm run eject`** — Eject from Create React App (not recommended)

## Configuration

### MQTT Broker Settings
Edit `src/mqtt/mqttservice.jsx`:
```javascript
// Production broker
this.MQTT_BROKER_URL = '04e8fe793a8947ad8eda947204522088.s1.eu.hivemq.cloud'

// Testing broker  
this.MQTT_BROKER_URL = '69fd2157960d4f39950410b17ba9d85c.s1.eu.hivemq.cloud'

this.MQTT_USERNAME = "ur2gglab";
this.MQTT_PASSWORD = "Ur2gglab";
```

### Backend API Settings
The frontend expects the backend API to be running on `http://localhost:5000` by default. Update API calls in components if using different endpoints.

## Troubleshooting

### Common Issues

1. **MQTT Connection Failed**:
   - Check broker URL and credentials
   - Verify network connectivity
   - Check firewall settings

2. **Backend API Errors**:
   - Ensure backend server is running
   - Check API endpoint URLs
   - Verify CORS settings

3. **Device Communication Issues**:
   - Check MQTT topic subscriptions
   - Verify message formats
   - Test with simulator first

### Debugging
- Check browser console for JavaScript errors
- Monitor MQTT message flow in network tab
- Use browser developer tools to inspect API calls
- Check backend logs for server-side issues

## Integration Points

### With Backend (`ur2-backend-code`)
- Creates and manages test runs
- Stores analysis results
- Provides historical data access

### With Raspberry Pi (`ur2-common-code`)
- Sends start commands to devices
- Receives real-time status updates
- Handles user confirmations

### With Laboratory Devices
- Controls UR2 Experiment equipment
- Monitors test progress
- Displays results and alerts

## Security Considerations

### MQTT Security
- Use secure WebSocket connections (WSS)
- Implement authentication for production
- Use encrypted credentials

### API Security
- Validate all user inputs
- Implement rate limiting
- Use HTTPS in production


