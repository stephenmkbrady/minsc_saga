/**
 * Room Authentication Utilities
 * Manages room-specific access tokens for PIN-based authentication
 */

const STORAGE_KEY = 'minsc_saga_room_auth';

/**
 * Room authentication data structure:
 * {
 *   [roomId]: {
 *     accessToken: string,
 *     expiresAt: ISO string,
 *     createdAt: ISO string
 *   }
 * }
 */

export class RoomAuthManager {
  constructor() {
    this.authData = this.loadFromStorage();
  }

  /**
   * Load authentication data from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading room auth from storage:', error);
      return {};
    }
  }

  /**
   * Save authentication data to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.authData));
    } catch (error) {
      console.error('Error saving room auth to storage:', error);
    }
  }

  /**
   * Store room access token
   */
  setRoomAuth(roomId, accessToken, expiresAt) {
    this.authData[roomId] = {
      accessToken,
      expiresAt,
      createdAt: new Date().toISOString()
    };
    this.saveToStorage();
  }

  /**
   * Get room access token if valid
   */
  getRoomAuth(roomId) {
    const auth = this.authData[roomId];
    if (!auth) return null;

    // Check if token is expired
    if (new Date(auth.expiresAt) <= new Date()) {
      this.clearRoomAuth(roomId);
      return null;
    }

    return auth;
  }

  /**
   * Check if room has valid authentication
   */
  isRoomAuthenticated(roomId) {
    return this.getRoomAuth(roomId) !== null;
  }

  /**
   * Clear authentication for specific room
   */
  clearRoomAuth(roomId) {
    delete this.authData[roomId];
    this.saveToStorage();
  }

  /**
   * Clear all room authentication data
   */
  clearAllAuth() {
    this.authData = {};
    this.saveToStorage();
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpired() {
    const now = new Date();
    let hasChanges = false;

    Object.keys(this.authData).forEach(roomId => {
      const auth = this.authData[roomId];
      if (new Date(auth.expiresAt) <= now) {
        delete this.authData[roomId];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveToStorage();
    }
  }

  /**
   * Get authentication status for room
   */
  getRoomAuthStatus(roomId) {
    const auth = this.authData[roomId];
    if (!auth) {
      return { 
        authenticated: false, 
        status: 'no_auth',
        message: 'No authentication found'
      };
    }

    const expiresAt = new Date(auth.expiresAt);
    const now = new Date();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) {
      this.clearRoomAuth(roomId);
      return { 
        authenticated: false, 
        status: 'expired',
        message: 'Authentication expired'
      };
    }

    // Warn if expiring soon (within 1 hour)
    const oneHour = 60 * 60 * 1000;
    if (timeLeft <= oneHour) {
      return {
        authenticated: true,
        status: 'expiring_soon',
        message: `Expires in ${Math.ceil(timeLeft / (60 * 1000))} minutes`,
        expiresAt: auth.expiresAt,
        accessToken: auth.accessToken
      };
    }

    return {
      authenticated: true,
      status: 'valid',
      message: `Valid until ${expiresAt.toLocaleString()}`,
      expiresAt: auth.expiresAt,
      accessToken: auth.accessToken
    };
  }

  /**
   * Get all authenticated rooms
   */
  getAuthenticatedRooms() {
    this.cleanupExpired();
    return Object.keys(this.authData);
  }

  /**
   * Create authenticated headers for API requests
   */
  createAuthHeaders(roomId, additionalHeaders = {}) {
    const auth = this.getRoomAuth(roomId);
    if (!auth) {
      throw new Error(`No valid authentication for room ${roomId}`);
    }

    return {
      ...additionalHeaders,
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json'
    };
  }
}

// Default export for use in components
export default RoomAuthManager;

// Utility functions for direct use
export const roomAuthManager = new RoomAuthManager();

/**
 * Hook-like function for React components
 */
export const useRoomAuth = (roomId) => {
  const manager = roomAuthManager;
  
  return {
    isAuthenticated: manager.isRoomAuthenticated(roomId),
    authStatus: manager.getRoomAuthStatus(roomId),
    setAuth: (accessToken, expiresAt) => manager.setRoomAuth(roomId, accessToken, expiresAt),
    clearAuth: () => manager.clearRoomAuth(roomId),
    createHeaders: (additionalHeaders) => manager.createAuthHeaders(roomId, additionalHeaders)
  };
};