import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Clock, RefreshCw, Eye, EyeOff } from 'lucide-react';
import styles from '../PINAuth.module.css';

const PINAuth = ({ 
  roomId, 
  onAuthSuccess, 
  onAuthError, 
  apiBaseUrl, 
  apiKey,
  isDarkMode 
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // Reset state when roomId changes
  useEffect(() => {
    setPin('');
    setError('');
  }, [roomId]);

  const validatePin = (pinValue) => {
    // PIN should be 6 digits
    return /^\d{6}$/.test(pinValue);
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setPin(value);
      setError(''); // Clear error when user types
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePin(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    // Test JSON serialization first
    const testObj = { room_id: roomId, pin: pin };
    const testJson = JSON.stringify(testObj);
    console.log('🧪 JSON TEST - Object:', testObj);
    console.log('🧪 JSON TEST - Stringified:', testJson);
    console.log('🧪 JSON TEST - Room ID chars:', Array.from(roomId).map(c => `${c}(${c.charCodeAt(0)})`));

    try {
      console.log('🔐 Attempting PIN authentication:');
      console.log('  API Base URL:', apiBaseUrl);
      console.log('  Room ID:', roomId);
      console.log('  PIN:', pin);
      console.log('  API Key available:', apiKey ? 'Yes' : 'No');
      
      // Create the request body
      const requestBody = {
        room_id: roomId,
        pin: pin
      };
      
      const jsonBody = JSON.stringify(requestBody);
      console.log('🔐 Request body object:', requestBody);
      console.log('🔐 JSON body:', jsonBody);
      
      // Call the internal PIN validation endpoint (no API key needed for PIN auth)
      const response = await fetch(`${apiBaseUrl}/internal/auth/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: jsonBody
      });
      
      console.log('🔐 PIN response status:', response.status);
      console.log('🔐 PIN response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('🔐 PIN request failed with status:', response.status);
        console.error('🔐 Response headers:', Object.fromEntries(response.headers.entries()));
        
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('🔐 Response body:', errorText);
        } catch (e) {
          console.error('🔐 Could not read response body:', e);
        }
        
        if (response.status === 401) {
          throw new Error('Invalid PIN or PIN expired. Please request a new PIN from the bot.');
        } else if (response.status === 403) {
          throw new Error(`Access forbidden. Response: ${errorText}`);
        } else if (response.status === 429) {
          throw new Error('Too many PIN requests. Please wait before trying again.');
        } else if (response.status === 503) {
          throw new Error('PIN authentication is currently disabled.');
        } else {
          throw new Error(`Authentication failed: ${response.status}. Response: ${errorText}`);
        }
      }

      const data = await response.json();
      
      // Store the room access token and expiration
      const authData = {
        accessToken: data.access_token,
        expiresAt: data.expires_at,
        roomId: data.room_id
      };

      // Call success callback
      onAuthSuccess(authData);

    } catch (error) {
      console.error('🔐 PIN authentication error:', error);
      console.error('🔐 Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setError(error.message);
      if (onAuthError) {
        onAuthError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getThemeClass = (baseClass) => {
    return `${styles[baseClass]} ${isDarkMode ? styles.dark : styles.light}`;
  };

  return (
    <div className={getThemeClass('pinAuthOverlay')}>
      <div className={getThemeClass('pinAuthModal')}>
        <div className={styles.pinAuthHeader}>
          <Lock className={getThemeClass('pinAuthIcon')} />
          <h2 className={getThemeClass('pinAuthTitle')}>Room Access Required</h2>
          <p className={getThemeClass('pinAuthSubtitle')}>
            Enter the PIN for room: <code className={styles.roomIdCode}>{roomId}</code>
          </p>
        </div>

        <div className={getThemeClass('pinAuthInstructions')}>
          <div className={styles.instructionStep}>
            <span className={styles.stepNumber}>1</span>
            <span>Go to the Matrix room and send <code>!pin</code> to the bot</span>
          </div>
          <div className={styles.instructionStep}>
            <span className={styles.stepNumber}>2</span>
            <span>Copy the 6-digit PIN from the bot's response</span>
          </div>
          <div className={styles.instructionStep}>
            <span className={styles.stepNumber}>3</span>
            <span>Enter the PIN below</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.pinForm}>
          <div className={styles.pinInputContainer}>
            <div className={styles.pinInputWrapper}>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={handlePinChange}
                placeholder="000000"
                className={getThemeClass('pinInput')}
                maxLength={6}
                autoComplete="off"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className={styles.pinToggle}
                disabled={loading}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className={styles.pinInputHelp}>
              {pin.length}/6 digits
            </div>
          </div>

          {error && (
            <div className={styles.pinError}>
              <AlertCircle className={styles.errorIcon} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!validatePin(pin) || loading}
            className={getThemeClass('pinSubmitButton')}
          >
            {loading ? (
              <>
                <RefreshCw className={styles.spinningIcon} />
                Verifying...
              </>
            ) : (
              <>
                <Lock className={styles.buttonIcon} />
                Access Room Messages
              </>
            )}
          </button>
        </form>

        <div className={getThemeClass('pinAuthFooter')}>
          <div className={styles.securityNote}>
            <Clock className={styles.securityIcon} />
            <span>PINs expire after 24 hours for security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PINAuth;