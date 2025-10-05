# ur2-frontend-code — Onboarding

Purpose
-------
React-based operator GUI for creating and monitoring runs. Connects to devices via MQTT and to the backend via HTTP.

Who should read this
---------------------
- Frontend engineers working on UI and user flows
- QA engineers testing the operator experience

Quick overview
--------------
- `src/App.js` — App entry; initializes `mqttservice` and mounts UI pages.
- `src/mqtt/mqttservice.jsx` — MQTT client (HiveMQ Cloud in code). Topics of interest:
  - Publish start: `ur2/test/init`
  - Subscribe stage updates: `ur2/test/stage`
  - Publish confirmations: `ur2/test/confirm`
- `src/components/sections/CreateTest.jsx` — Create run UI
- `src/components/dashboard/*` — Sidebar, MainView, Console

Quickstart (local development)
------------------------------
1. Install and run:

   cd ur2-frontend-code
   npm install
   npm start

2. App runs on http://localhost:3000 by default.

MQTT and backend
-----------------
- MQTT broker credentials are in `src/mqtt/mqttservice.jsx` (for testing). Replace with your broker credentials for production.
- The UI calls the backend endpoints described in `ur2-backend-code/README.md`.

Testing without a Pi
--------------------
- Use the simulator scripts in `ur2-common-code/rpi-to-ui` to publish MQTT messages that mimic Pi stage updates.
- Or run the simple Python MQTT publisher to send a `waiting_confirmation` message and confirm the UI shows the modal.

Notes & gotchas
----------------
- React 19 + react-scripts 5 may require a compatible Node version; if `npm start` fails, try Node 18.
- WebSocket MQTT (wss) requires the broker to be reachable from the browser and proper TLS certs for production.

Next tasks for contributors
--------------------------
- Standardize on `trial_id` for MQTT payloads to match backend expectations.
- Add tests for the CreateTest workflow and a mock MQTT broker for CI tests.
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
