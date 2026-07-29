/**
 * SSE Service — replaces the Socket.IO-based mqttService.
 *
 * Uses @microsoft/fetch-event-source to consume the backend's
 * GET /mqtt/stream SSE endpoint. REST calls handle connect/disconnect/
 * startTest/confirm actions.
 *
 * Maintains the same callback API as the old mqttService so existing
 * modal components can be wired up unchanged.
 */

import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_BASE_URL } from '../config/api';
import { authFetch, getAccessToken, refreshAccessToken } from './authService';

class SSEService {
  constructor() {
    // Connection state
    this.isConnected = false;   // MQTT connected (reported by backend)
    this.isConnecting = false;
    this._sseConnected = false; // SSE stream open
    this._abortController = null;

    // Callbacks
    this.stageUpdateCallback = null;
    this.confirmationCallback = null;
    this.imageCallback = null;
    this.statusCallback = null;
    this._messageHandlers = [];
  }

  // ── SSE stream ───────────────────────────────────────────────────────

  /**
   * Open the SSE stream to /mqtt/stream.
   * Automatically reconnects on transient errors.
   */
  async connect() {
    if (this._sseConnected || this.isConnecting) return;
    this.isConnecting = true;

    this._abortController = new AbortController();

    try {
      await fetchEventSource(`${API_BASE_URL}/mqtt/stream`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
        signal: this._abortController.signal,
        credentials: 'include',

        onopen: async (response) => {
          if (response.ok) {
            this._sseConnected = true;
            this.isConnecting = false;
            console.log('✅ SSE stream opened');
          } else if (response.status === 401) {
            // Try to refresh and reconnect
            const newToken = await refreshAccessToken();
            if (!newToken) throw new Error('Auth failed');
            // fetchEventSource will retry automatically
          } else {
            throw new Error(`SSE open failed: ${response.status}`);
          }
        },

        onmessage: (event) => {
          this._handleSSEEvent(event);
        },

        onerror: (err) => {
          console.error('❌ SSE error:', err);
          this._sseConnected = false;
          this.isConnecting = false;
          // Return undefined to let fetchEventSource retry automatically.
          // Throw to stop retrying.
        },

        onclose: () => {
          console.log('🔌 SSE stream closed');
          this._sseConnected = false;
          this.isConnecting = false;
        },
      });
    } catch (err) {
      // AbortError is expected when disconnect() is called
      if (err.name !== 'AbortError') {
        console.error('SSE connection error:', err);
      }
      this._sseConnected = false;
      this.isConnecting = false;
    }
  }

  /** Route each named SSE event to the appropriate handler. */
  _handleSSEEvent(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return; // ignore non-JSON frames (e.g. ping comments)
    }

    switch (event.event) {
      case 'sse_on':
        console.log('📡 SSE handshake:', data.message);
        break;

      case 'mqtt:status':
        this.isConnected = data.connected;
        console.log('📡 MQTT status:', data.connected ? 'Connected' : 'Disconnected');
        if (this.statusCallback) this.statusCallback(data);
        break;

      case 'run:update': {
        const { run_status } = data;

        if (run_status === 'waiting_confirmation') {
          if (this.confirmationCallback) this.confirmationCallback(data);
        } else {
          if (this.stageUpdateCallback) this.stageUpdateCallback(data);
        }

        // Image payloads (if the backend includes base64 image data in run:update)
        if (data.image) {
          if (this.imageCallback) this.imageCallback(data, null);
          this._messageHandlers.forEach((h) => {
            try { h('ur2/test/image', JSON.stringify(data)); } catch {}
          });
        }
        break;
      }

      default:
        // Future-proof: log unrecognised events
        console.log('SSE event:', event.event, data);
    }
  }

  // ── REST actions ─────────────────────────────────────────────────────

  /** Request the backend to initiate its MQTT broker connection. */
  async connectMqtt() {
    try {
      const res = await authFetch(`${API_BASE_URL}/mqtt/connect`, { method: 'POST' });
      const data = await res.json();
      console.log('MQTT connect response:', data);
      return data;
    } catch (err) {
      console.error('MQTT connect failed:', err);
      throw err;
    }
  }

  /** Request the backend to disconnect from the MQTT broker. */
  async disconnectMqtt() {
    try {
      const res = await authFetch(`${API_BASE_URL}/mqtt/disconnect`, { method: 'POST' });
      return await res.json();
    } catch (err) {
      console.error('MQTT disconnect failed:', err);
      throw err;
    }
  }

  /** Start a test — POST /mqtt/test/start */
  async startTest({ testId, sample_size, debug }) {
    try {
      const res = await authFetch(`${API_BASE_URL}/mqtt/test/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, sample_size, debug }),
      });
      const data = await res.json();
      console.log('📤 Start test response:', data);
      return data;
    } catch (err) {
      console.error('Start test failed:', err);
      return { success: false, error: err.message };
    }
  }

  /** Confirm / decline a confirmation prompt — POST /mqtt/confirm */
  async confirm({ testId, confirmed }) {
    try {
      const res = await authFetch(`${API_BASE_URL}/mqtt/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, confirmed }),
      });
      return await res.json();
    } catch (err) {
      console.error('Confirm failed:', err);
      return { success: false, error: err.message };
    }
  }

  /** Get current MQTT status from the backend */
  async getMqttStatus() {
    try {
      const res = await authFetch(`${API_BASE_URL}/mqtt/status`);
      const data = await res.json();
      this.isConnected = data.connected;
      return data;
    } catch (err) {
      console.error('Get MQTT status failed:', err);
      return { connected: false };
    }
  }

  // ── Legacy-compatible methods ────────────────────────────────────────

  /** Send start command (mirrors old mqttService.sendStartCommand). */
  sendStartCommand(testId, startStageOrDebug = 0, debugMode = false) {
    // Handle the old calling convention: (testId, debugMode) or (testId, startStage, debugMode)
    let debug = debugMode;
    if (typeof startStageOrDebug === 'boolean') {
      debug = startStageOrDebug;
    }

    this.startTest({ testId, debug });
    console.log('📤 Sent start command for test:', testId);
    return true;
  }

  /** Send confirmation (mirrors old mqttService.sendConfirmation). */
  sendConfirmation(testId, confirmed) {
    this.confirm({ testId, confirmed });
    console.log('📤 Sent confirmation for test:', testId, 'confirmed:', confirmed);
    return true;
  }

  /** Image analysis command (not yet supported in REST backend, stub for compat). */
  sendImageAnalysisCommand(analysisId, sampleType = 'al') {
    console.warn('sendImageAnalysisCommand: not implemented in REST backend yet');
    return false;
  }

  // ── Callback setters (same API as old mqttService) ───────────────────

  setStageUpdateCallback(cb) { this.stageUpdateCallback = cb; }
  setConfirmationCallback(cb) { this.confirmationCallback = cb; }
  setImageCallback(cb) { this.imageCallback = cb; }
  setStatusCallback(cb) { this.statusCallback = cb; }

  // ── Disconnect / cleanup ─────────────────────────────────────────────

  disconnect() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this._sseConnected = false;
    console.log('🔌 SSE service disconnected');
  }

  // Backward compat
  get client() {
    const self = this;
    return {
      get connected() { return self.isConnected; },
      subscribe: () => {},
      on: (event, handler) => {
        if (event === 'message') self._messageHandlers.push(handler);
      },
      removeListener: (event, handler) => {
        if (event === 'message') {
          self._messageHandlers = self._messageHandlers.filter(h => h !== handler);
        }
      },
      publish: (topic, message) => {
        console.warn('client.publish() is deprecated. Use REST endpoints.');
      },
    };
  }

  async loadConfiguration() { return true; }
}

export const sseService = new SSEService();
export default sseService;
