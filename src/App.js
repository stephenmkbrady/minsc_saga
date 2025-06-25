import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Download, Image, FileText, Video, Music, Sun, Moon, Lock, AlertCircle, Filter, X, ChevronDown } from 'lucide-react';
import styles from './MatrixIntegration.module.css';
import PINAuth from './components/PINAuth';
import { roomAuthManager } from './utils/roomAuth';

// Add keyframes animation for smooth refresh indicator and new messages
const animationStyles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes fadeInSlide {
    from { 
      opacity: 0; 
      transform: translateY(-10px);
      background-color: rgba(59, 130, 246, 0.1);
    }
    to { 
      opacity: 1; 
      transform: translateY(0);
      background-color: transparent;
    }
  }
`;

// Inject the keyframes into the document head
if (typeof document !== 'undefined') {
  const existingStyle = document.querySelector('#matrix-animations');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'matrix-animations';
    styleSheet.textContent = animationStyles;
    document.head.appendChild(styleSheet);
  }
}

// Helper function to format file size (moved outside component to avoid redefinition)
const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown size';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Media Preview Component
const MediaPreview = ({ message, apiKey, apiBaseUrl, onError, authToken, pinAuthEnabled }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mediaUrl = message.media_url;
  const mediaType = message.media_mimetype || '';
  const messageType = message.message_type;

  // Create authenticated media URL
  const getAuthenticatedMediaUrl = () => {
    if (!mediaUrl) return null;
    // If URL is relative, prepend the API base URL
    if (mediaUrl.startsWith('/')) {
      return `${apiBaseUrl}${mediaUrl}`;
    }
    return mediaUrl;
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
    if (onError) onError(`Failed to load ${message.media_filename}`);
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Custom Image component with authentication
  const AuthenticatedImage = ({ src, alt, className, onLoad, onError }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let objectUrl = null;
      
      const loadImage = async () => {
        try {
          const headers = {};
          
          // Use appropriate authentication method
          if (pinAuthEnabled && authToken) {
            console.log('🔍 MediaPreview - Using PIN auth token:', authToken.substring(0, 20) + '...');
            headers['Authorization'] = `Bearer ${authToken}`;
          } else if (apiKey) {
            console.log('🔍 MediaPreview - Using API key:', apiKey.substring(0, 10) + '...');
            headers['Authorization'] = `Bearer ${apiKey}`;
          } else {
            console.log('🔍 MediaPreview - No authentication available');
          }

          const response = await fetch(src, { headers });
          if (!response.ok) throw new Error('Failed to load image');
          
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          setImageSrc(objectUrl);
          setLoading(false);
          if (onLoad) onLoad();
        } catch (error) {
          setLoading(false);
          if (onError) onError();
        }
      };

      if (src) {
        loadImage();
      }

      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [src, apiKey, authToken, pinAuthEnabled, onLoad, onError]);

    if (loading) {
      return <div className={styles.mediaThumbnailLoader}>Loading...</div>;
    }

    if (!imageSrc) {
      return <div className={styles.mediaThumbnailError}>Failed to load</div>;
    }

    return <img src={imageSrc} alt={alt} className={className} />;
  };

  // Custom Video component with authentication
  const AuthenticatedVideo = ({ src, className, onLoad, onError }) => {
    const [videoSrc, setVideoSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      let objectUrl = null;
      
      const loadVideo = async () => {
        try {
          setLoading(true);
          setError(false);
          
          const headers = {};
          
          // Use appropriate authentication method
          if (pinAuthEnabled && authToken) {
            console.log('🔍 AuthenticatedVideo - Using PIN auth token:', authToken.substring(0, 20) + '...');
            headers['Authorization'] = `Bearer ${authToken}`;
          } else if (apiKey) {
            console.log('🔍 AuthenticatedVideo - Using API key:', apiKey.substring(0, 10) + '...');
            headers['Authorization'] = `Bearer ${apiKey}`;
          } else {
            console.log('🔍 AuthenticatedVideo - No authentication available');
          }

          const response = await fetch(src, { headers });
          if (!response.ok) {
            throw new Error(`Failed to load video: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          setVideoSrc(objectUrl);
          setLoading(false);
          if (onLoad) onLoad();
        } catch (error) {
          console.error('AuthenticatedVideo error:', error);
          setLoading(false);
          setError(true);
          if (onError) onError(error);
        }
      };

      if (src) {
        loadVideo();
      }

      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [src, apiKey, authToken, pinAuthEnabled, onLoad, onError]);

    if (loading) {
      return (
        <div className={styles.mediaThumbnailLoader}>
          <div className={styles.spinner}></div>
          <span>Loading video...</span>
        </div>
      );
    }

    if (error || !videoSrc) {
      return (
        <div className={styles.mediaThumbnailError}>
          <Video className={styles.smallIcon} />
          <span>Video preview failed</span>
        </div>
      );
    }

    return (
      <video
        src={videoSrc}
        className={className}
        controls
        preload="metadata"
        onLoadStart={() => console.log('Video loading started')}
        onError={(e) => {
          console.error('Video element error:', e);
          setError(true);
          if (onError) onError(e);
        }}
      >
        Your browser doesn't support video playback.
      </video>
    );
  };

  // Render based on media type
  if (messageType === 'image' || mediaType.startsWith('image/')) {
    return (
      <div className={styles.mediaPreviewContainer}>
        <div className={styles.imageThumbnailWrapper} onClick={handleFullscreenToggle}>
          <AuthenticatedImage
            src={getAuthenticatedMediaUrl()}
            alt={message.media_filename}
            className={styles.imageThumbnail}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          {isLoading && (
            <div className={styles.mediaThumbnailLoader}>
              <div className={styles.spinner}></div>
            </div>
          )}
          {error && (
            <div className={styles.mediaThumbnailError}>
              <Image className={styles.smallIcon} />
              <span>Preview failed</span>
            </div>
          )}
          <div className={styles.imageOverlay}>
            <span className={styles.imageOverlayText}>Click to view full size</span>
          </div>
        </div>

        {/* Fullscreen Modal */}
        {isFullscreen && (
          <div className={styles.fullscreenModal} onClick={handleFullscreenToggle}>
            <div className={styles.fullscreenContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeButton} onClick={handleFullscreenToggle}>
                <X className={styles.icon} />
              </button>
              <AuthenticatedImage
                src={getAuthenticatedMediaUrl()}
                alt={message.media_filename}
                className={styles.fullscreenImage}
              />
              <div className={styles.fullscreenInfo}>
                <p>{message.media_filename}</p>
                <p>{message.media_mimetype} • {formatFileSize(message.media_size)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (messageType === 'video' || mediaType.startsWith('video/')) {
    return (
      <div className={styles.mediaPreviewContainer}>
        <div className={styles.videoThumbnailWrapper}>
          <AuthenticatedVideo
            src={getAuthenticatedMediaUrl()}
            className={styles.videoThumbnail}
            onLoad={() => setIsLoading(false)}
            onError={handleImageError}
          />
        </div>
      </div>
    );
  }

  if (messageType === 'audio' || mediaType.startsWith('audio/')) {
    return (
      <div className={styles.mediaPreviewContainer}>
        <div className={styles.audioPlayerWrapper}>
          <div className={styles.audioControls}>
            <Music className={styles.audioIcon} />
            <div className={styles.audioInfo}>
              <p className={styles.audioFilename}>{message.media_filename}</p>
              <p className={styles.audioDetails}>{formatFileSize(message.media_size)}</p>
            </div>
          </div>
          <audio
            className={styles.audioPlayer}
            controls
            preload="metadata"
            onLoadStart={() => setIsLoading(false)}
            onError={handleImageError}
          >
            <source src={getAuthenticatedMediaUrl()} type={mediaType} />
            Your browser doesn't support audio playback.
          </audio>
          {error && (
            <div className={styles.mediaThumbnailError}>
              <Music className={styles.smallIcon} />
              <span>Audio preview failed</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For other file types, show a file preview
  return (
    <div className={styles.mediaPreviewContainer}>
      <div className={styles.filePreviewWrapper}>
        <div className={styles.filePreview}>
          <FileText className={styles.fileIcon} />
          <div className={styles.fileInfo}>
            <p className={styles.fileName}>{message.media_filename}</p>
            <p className={styles.fileDetails}>
              {message.media_mimetype} • {formatFileSize(message.media_size)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MatrixIntegration = () => {
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('matrix-dashboard-theme');
    return saved ? JSON.parse(saved) : true;
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [matrixUserId, setMatrixUserId] = useState('');
  const [widgetApi, setWidgetApi] = useState(null);
  
  // PIN Authentication state
  const [pinAuthRequired, setPinAuthRequired] = useState(false);
  const [roomAuthStatus, setRoomAuthStatus] = useState(null);

  // Faceted search filters
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    messageTypes: [],
    senders: [],
    fileSizeMin: '',
    fileSizeMax: '',
    hasMedia: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Configuration - API URL and API key
  const API_BASE_URL = process.env.REACT_APP_DATABASE_API_BASE_URL || '';
  const API_KEY = process.env.REACT_APP_DATABASE_API_KEY || '';
  const PIN_AUTH_ENABLED = process.env.REACT_APP_PIN_AUTH_ENABLED === 'true';

  // Save theme preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('matrix-dashboard-theme', JSON.stringify(isDarkMode));
    // Apply theme class to body
    document.body.className = isDarkMode ? styles.darkBody : styles.lightBody;
  }, [isDarkMode]);

  // Helper function to load widget API script
  const loadWidgetApiScript = () => {
    return new Promise((resolve, reject) => {
      if (window.mxwidgets) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = process.env.REACT_APP_MATRIX_WIDGET_API_URL || 'https://unpkg.com/matrix-widget-api@0.1.0/dist/api.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Matrix Widget API'));
      document.head.appendChild(script);
    });
  };

  // Helper function to extract parameters from URL that might be replaced by Matrix
  const extractFromUrl = (param) => {
    const url = window.location.href;
    const patterns = [
      new RegExp(`[?&]${param}=([^&]+)`),
      new RegExp(`[?&]\\$${param}=([^&]+)`),
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  };

  const initializeWidgetApi = useCallback(async () => {
    try {
      setAuthLoading(true);
      
      // Always try URL parameters first, regardless of parent window
      const urlParams = new URLSearchParams(window.location.search);
      const userIdFromUrl = urlParams.get('matrix_user_id') || urlParams.get('user_id');
      const roomIdFromUrl = urlParams.get('matrix_room_id') || urlParams.get('room_id');
      
      console.log('🔧 URL parameter extraction:');
      console.log('  Full URL:', window.location.href);
      console.log('  Search params:', window.location.search);
      console.log('  Extracted user_id:', userIdFromUrl);
      console.log('  Extracted room_id:', roomIdFromUrl);
      
      if (userIdFromUrl && roomIdFromUrl) {
        console.log('🔑 Using URL parameters for authentication');
        setMatrixUserId(userIdFromUrl);
        setRoomId(roomIdFromUrl);
        setAuthenticated(true);
        setAuthLoading(false);
        return;
      }
      
      // Only try widget API if URL params are missing
      if (!window.parent || window.parent === window) {
        setError('This page must be opened as a Matrix widget or with proper authentication parameters.');
        setAuthLoading(false);
        return;
      }

      try {
        if (!window.mxwidgets) {
          await loadWidgetApiScript();
        }

        const api = new window.mxwidgets.WidgetApi();
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Widget API initialization timeout'));
          }, 10000);

          api.on('ready', () => {
            clearTimeout(timeout);
            resolve();
          });

          api.start();
        });

        await api.requestCapabilities([
          window.mxwidgets.MatrixCapabilities.AlwaysOnScreen,
        ]);

        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('matrix_user_id') || 
                      urlParams.get('$matrix_user_id') ||
                      extractFromUrl('matrix_user_id');
        const roomIdFromWidget = urlParams.get('matrix_room_id') || 
                                urlParams.get('$matrix_room_id') ||
                                extractFromUrl('matrix_room_id');

        if (!userId || !roomIdFromWidget) {
          throw new Error('Missing Matrix user or room information');
        }

        console.log('🔑 Widget API authentication successful');
        console.log('👤 User ID from widget:', userId);
        console.log('🏠 Room ID from widget:', roomIdFromWidget);

        setWidgetApi(api);
        setMatrixUserId(userId);
        setRoomId(roomIdFromWidget);
        setAuthenticated(true);

      } catch (widgetError) {
        console.log('⚠️ Widget API failed, trying fallback authentication:', widgetError.message);
        
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('matrix_user_id') || extractFromUrl('matrix_user_id');
        const roomIdFromUrl = urlParams.get('matrix_room_id') || extractFromUrl('matrix_room_id');
        
        if (userId && roomIdFromUrl) {
          console.log('🔑 Using fallback authentication');
          setMatrixUserId(userId);
          setRoomId(roomIdFromUrl);
          setAuthenticated(true);
        } else {
          throw new Error('Unable to authenticate. Please ensure this is opened as a Matrix widget.');
        }
      }

    } catch (error) {
      console.error('Authentication error:', error);
      setError(`Authentication failed: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  }, [API_BASE_URL, API_KEY]);

  // Simplified fetchMessages without membership verification
  const fetchMessages = useCallback(async (isInitialLoad = false) => {
    console.log('📨 FETCHMESSAGES called with:');
    console.log('  Current matrixUserId state:', matrixUserId);
    console.log('  Current roomId state:', roomId);
    console.log('  PIN_AUTH_ENABLED:', PIN_AUTH_ENABLED);
    
    if (!roomId || !matrixUserId) {
      console.log('⚠️ Skipping message fetch - missing room ID or user ID');
      return;
    }

    // Check authentication requirements
    if (PIN_AUTH_ENABLED) {
      const authStatus = roomAuthManager.getRoomAuthStatus(roomId);
      console.log('🔐 Auth status check in fetchMessages:', authStatus);
      if (!authStatus.authenticated) {
        console.log('⚠️ Skipping message fetch - PIN authentication required');
        setPinAuthRequired(true);
        return;
      }
      console.log('✅ PIN authentication verified, proceeding with fetch');
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      
      // Choose API endpoint based on authentication method
      let apiUrl, headers;
      
      if (PIN_AUTH_ENABLED) {
        // Use UI proxy endpoint with room access token
        apiUrl = `${API_BASE_URL}/ui/rooms/${encodeURIComponent(roomId)}/messages`;
        const authStatus = roomAuthManager.getRoomAuthStatus(roomId);
        console.log('🔍 FetchMessages - Auth status:', authStatus);
        console.log('🔍 FetchMessages - Using token:', authStatus.accessToken?.substring(0, 20) + '...');
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStatus.accessToken}`
        };
        
        // Add query parameters
        const queryParams = new URLSearchParams({
          include_media: 'true',
          limit: '1000'
        });
        apiUrl += `?${queryParams}`;
      } else {
        // Use legacy direct API endpoint with API key
        const queryParams = new URLSearchParams({
          room_id: roomId,
          include_media: 'true',
          limit: '1000'
        });
        apiUrl = `${API_BASE_URL}/messages?${queryParams}`;
        headers = {
          'Content-Type': 'application/json',
        };
        
        if (API_KEY) {
          headers['Authorization'] = `Bearer ${API_KEY}`;
        }
      }
      
      console.log('📊 API CALL PARAMETERS:');
      console.log('  room_id being sent:', roomId);
      console.log('  authentication method:', PIN_AUTH_ENABLED ? 'PIN' : 'API_KEY');
      console.log(`📨 Fetching messages from: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
      });

      const rawResponseText = await response.text();
      
      if (!response.ok) {
        console.error('Fetch error:', response.status, response.statusText);
        console.error('Response body:', rawResponseText);
        
        // Handle authentication failures
        if (response.status === 401 || response.status === 403) {
          console.log('🔒 Authentication failed - clearing token and showing PIN modal');
          roomAuthManager.clearRoomAuth(roomId);
          setPinAuthRequired(true);
          throw new Error('Authentication expired. Please enter PIN again.');
        }
        
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }
      
      let data;
      try {
        data = JSON.parse(rawResponseText);
        console.log('📥 API Response structure:', {
          isArray: Array.isArray(data),
          hasMessages: 'messages' in data,
          keys: Object.keys(data),
          dataType: typeof data
        });
      } catch (e) {
        console.error('JSON Parse Error:', e);
        console.error('Raw response:', rawResponseText);
        throw new Error('Server returned invalid JSON');
      }
      
      // Handle both old API format (array) and new API format (object with messages property)
      let messagesArray;
      if (Array.isArray(data)) {
        // Old API format - direct array
        messagesArray = data;
        console.log('📥 Using legacy API format (direct array)');
      } else if (data && Array.isArray(data.messages)) {
        // New API format - object with messages property
        messagesArray = data.messages;
        console.log('📥 Using new API format (object with messages array)');
        console.log(`📊 API reports: ${data.count} messages in response`);
      } else {
        console.error('Unexpected API response format:', data);
        throw new Error('Unexpected API response format');
      }
      
      const transformedMessages = messagesArray.map(msg => ({
        id: msg.id,
        event_id: msg.event_id,
        timestamp: msg.timestamp,
        sender: msg.sender,
        content: msg.content || '',
        message_type: msg.message_type,
        room_id: msg.room_id,
        media_filename: msg.media_filename,
        media_mimetype: msg.media_mimetype,
        media_size: msg.media_size_bytes,
        media_url: msg.media_filename ? `${API_BASE_URL}/media/${msg.media_filename}` : null
      }));

      console.log(`📊 Processed ${transformedMessages.length} messages`);
      console.log('📊 Sample message:', transformedMessages[0]);
      
      // Track new messages for animation using current messages state
      setMessages(currentMessages => {
        // Track new messages for animation
        if (!isInitialLoad && currentMessages.length > 0) {
          const existingIds = new Set(currentMessages.map(m => m.event_id));
          const newIds = new Set();
          transformedMessages.forEach(msg => {
            if (!existingIds.has(msg.event_id)) {
              newIds.add(msg.event_id);
            }
          });
          
          if (newIds.size > 0) {
            setNewMessageIds(newIds);
            // Clear the new message indicators after animation
            setTimeout(() => setNewMessageIds(new Set()), 1000);
          }
        }
        
        return transformedMessages;
      });
      
      setLastUpdateTime(new Date());
      
      if (widgetApi) {
        try {
          await widgetApi.transport.send('content_loaded', {});
        } catch (e) {
          console.log('Could not notify widget of content load:', e);
        }
      }

    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(`Failed to load messages: ${error.message}`);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [roomId, matrixUserId, widgetApi, API_BASE_URL, API_KEY, PIN_AUTH_ENABLED]);

  const fetchStats = useCallback(async () => {
    try {
      let headers;
      
      if (PIN_AUTH_ENABLED) {
        // For PIN authentication, use room access token if available
        const authStatus = roomAuthManager.getRoomAuthStatus(roomId);
        if (!authStatus.authenticated) {
          console.log('⚠️ Skipping stats fetch - PIN authentication required');
          return;
        }
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStatus.accessToken}`
        };
      } else {
        // Use legacy API key authentication
        headers = {
          'Content-Type': 'application/json',
        };
        
        if (API_KEY) {
          headers['Authorization'] = `Bearer ${API_KEY}`;
        }
      }
      
      // Use appropriate stats endpoint based on authentication method
      const statsUrl = PIN_AUTH_ENABLED 
        ? `${API_BASE_URL}/ui/rooms/${encodeURIComponent(roomId)}/stats`
        : `${API_BASE_URL}/stats`;
      
      const response = await fetch(statsUrl, {
        method: 'GET',
        headers: headers,
      });
      
      const rawResponseText = await response.text();

      if (response.ok) {
        try {
          const statsData = JSON.parse(rawResponseText);
          console.log('📊 Stats data:', statsData);
          setStats(statsData);
        } catch (e) {
          console.error('Stats JSON Parse Error:', e);
        }
      } else {
        console.error('Stats fetch failed:', response.status, rawResponseText);
        
        // Handle authentication failures
        if (response.status === 401 || response.status === 403) {
          console.log('🔒 Stats authentication failed - clearing token and showing PIN modal');
          roomAuthManager.clearRoomAuth(roomId);
          setPinAuthRequired(true);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [API_BASE_URL, API_KEY, PIN_AUTH_ENABLED, roomId]);

  // Initialize Matrix Widget API
  useEffect(() => {
    console.log('🔧 INITIALIZATION useEffect triggered');
    console.log('🔧 Configuration check:');
    console.log('  API_BASE_URL:', API_BASE_URL);
    console.log('  API_KEY available:', API_KEY ? 'Yes' : 'No');
    console.log('  Current window.location.href:', window.location.href);
    console.log('  Current window.location.search:', window.location.search);
    console.log('  URLSearchParams test:', new URLSearchParams(window.location.search).toString());
    console.log('  Direct param check - matrix_user_id:', new URLSearchParams(window.location.search).get('matrix_user_id'));
    console.log('  Direct param check - matrix_room_id:', new URLSearchParams(window.location.search).get('matrix_room_id'));
    console.log('🔧 About to call initializeWidgetApi...');
    
    initializeWidgetApi();
  }, [initializeWidgetApi, API_BASE_URL, API_KEY]);

  // Check room authentication status
  const checkRoomAuth = useCallback(() => {
    if (!roomId || !PIN_AUTH_ENABLED) {
      setPinAuthRequired(false);
      setRoomAuthStatus(null);
      return;
    }

    const authStatus = roomAuthManager.getRoomAuthStatus(roomId);
    setRoomAuthStatus(authStatus);
    setPinAuthRequired(!authStatus.authenticated);
  }, [roomId, PIN_AUTH_ENABLED]);

  // Handle successful PIN authentication
  const handlePinAuthSuccess = useCallback((authData) => {
    console.log('🎉 PIN authentication successful:', authData);
    roomAuthManager.setRoomAuth(authData.roomId, authData.accessToken, authData.expiresAt);
    setPinAuthRequired(false);
    const newAuthStatus = roomAuthManager.getRoomAuthStatus(roomId);
    console.log('🔐 New auth status after PIN success:', newAuthStatus);
    setRoomAuthStatus(newAuthStatus);
    // Trigger data fetch after successful authentication
    if (roomId && matrixUserId) {
      console.log('🚀 Triggering data fetch after successful PIN auth');
      fetchMessages(true);
      fetchStats();
    }
  }, [roomId, matrixUserId, fetchMessages, fetchStats]);

  // Handle PIN authentication error
  const handlePinAuthError = useCallback((error) => {
    console.error('❌ PIN authentication error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    setError(`PIN authentication failed: ${error}`);
  }, []);

  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    console.log('🚀 USEEFFECT triggered with:');
    console.log('  authenticated:', authenticated);
    console.log('  roomId:', roomId);
    console.log('  matrixUserId:', matrixUserId);
    
    if (authenticated && roomId && matrixUserId) {
      console.log(`🚀 Starting data fetch for room: ${roomId} (user: ${matrixUserId})`);
      fetchMessages(true); // Initial load
      fetchStats();
      
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh triggered');
        fetchMessages(false); // Refresh, not initial load
        fetchStats();
      }, 30000);
      
      return () => {
        console.log('🧹 Cleaning up interval');
        clearInterval(interval);
      };
    } else {
      console.log('⏸️ Conditions not met for data fetch:');
      console.log('  authenticated:', authenticated);
      console.log('  roomId:', roomId);
      console.log('  matrixUserId:', matrixUserId);
    }
  }, [authenticated, roomId, matrixUserId, fetchMessages, fetchStats]);

  // Check room authentication when roomId changes
  useEffect(() => {
    if (roomId) {
      checkRoomAuth();
    }
  }, [roomId, checkRoomAuth]);

  // Periodic token expiration check
  useEffect(() => {
    if (!PIN_AUTH_ENABLED || !roomId) return;

    const interval = setInterval(() => {
      const authStatus = roomAuthManager.getRoomAuthStatus(roomId);
      if (!authStatus.authenticated) {
        console.log('🔒 Periodic check: Token expired, showing PIN modal');
        setPinAuthRequired(true);
      } else if (authStatus.status === 'expiring_soon') {
        console.log('⚠️ Token expiring soon, consider refreshing');
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [roomId, PIN_AUTH_ENABLED]);

  // Get unique values for filter dropdowns
  const uniqueSenders = useMemo(() => {
    return [...new Set(messages.map(m => m.sender))].sort();
  }, [messages]);

  const uniqueMessageTypes = useMemo(() => {
    return [...new Set(messages.map(m => m.message_type))].sort();
  }, [messages]);

  // Helper function to parse file size input
  const parseFileSize = (sizeStr) => {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'b').toLowerCase();
    
    const multipliers = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    return value * (multipliers[unit] || 1);
  };

  // Enhanced filter function
  const filteredMessages = useMemo(() => {
    let result = messages;
    
    if (searchTerm) {
      result = result.filter(message => 
        message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (message.media_filename && message.media_filename.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter(message => new Date(message.timestamp) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(message => new Date(message.timestamp) <= toDate);
    }

    if (filters.messageTypes.length > 0) {
      result = result.filter(message => filters.messageTypes.includes(message.message_type));
    }

    if (filters.senders.length > 0) {
      result = result.filter(message => filters.senders.includes(message.sender));
    }

    if (filters.hasMedia === 'with-media') {
      result = result.filter(message => message.media_filename);
    } else if (filters.hasMedia === 'text-only') {
      result = result.filter(message => !message.media_filename);
    }

    if (filters.fileSizeMin || filters.fileSizeMax) {
      result = result.filter(message => {
        if (!message.media_size) return !filters.fileSizeMin && !filters.fileSizeMax;
        
        const minSize = parseFileSize(filters.fileSizeMin);
        const maxSize = parseFileSize(filters.fileSizeMax);
        
        if (minSize && message.media_size < minSize) return false;
        if (maxSize && message.media_size > maxSize) return false;
        
        return true;
      });
    }

    return result;
  }, [messages, searchTerm, filters]);

  // Sort messages by timestamp (newest first)
  const sortedMessages = useMemo(() => {
    return [...filteredMessages].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [filteredMessages]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMediaIcon = (messageType) => {
    switch (messageType) {
      case 'image':
      case 'm.image':
        return <Image className={styles.iconBlue} />;
      case 'video':
      case 'm.video':
        return <Video className={styles.iconPurple} />;
      case 'audio':
      case 'm.audio':
        return <Music className={styles.iconGreen} />;
      case 'file':
      case 'm.file':
        return <FileText className={styles.iconRed} />;
      default:
        return null;
    }
  };

  const handleDownload = async (mediaUrl, filename) => {
    try {
      let headers = {};
      
      if (PIN_AUTH_ENABLED) {
        // For PIN authentication, use room access token
        const authStatus = roomAuthManager.getRoomAuthStatus(roomId);
        if (authStatus.authenticated) {
          headers['Authorization'] = `Bearer ${authStatus.accessToken}`;
        }
      } else {
        // Use legacy API key authentication
        if (API_KEY) {
          headers['Authorization'] = `Bearer ${API_KEY}`;
        }
      }
      
      const response = await fetch(mediaUrl, {
        headers: headers
      });
      
      if (!response.ok) {
        // Handle authentication failures
        if (response.status === 401 || response.status === 403) {
          console.log('🔒 Download authentication failed - clearing token and showing PIN modal');
          roomAuthManager.clearRoomAuth(roomId);
          setPinAuthRequired(true);
          throw new Error('Authentication expired. Please enter PIN again.');
        }
        
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      messageTypes: [],
      senders: [],
      fileSizeMin: '',
      fileSizeMax: '',
      hasMedia: 'all'
    });
  };

  const hasActiveFilters = () => {
    return filters.dateFrom || filters.dateTo || filters.messageTypes.length > 0 || 
           filters.senders.length > 0 || filters.fileSizeMin || filters.fileSizeMax || 
           filters.hasMedia !== 'all';
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!refreshing) {
      await fetchMessages(false);
      await fetchStats();
    }
  };

  // Get theme-aware classes
  const getThemeClass = (baseClass) => {
    return `${styles[baseClass]} ${isDarkMode ? styles.dark : styles.light}`;
  };

  // Authentication loading screen
  if (authLoading) {
    return (
      <div className={getThemeClass('loadingScreen')}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={getThemeClass('loadingText')}>
            Connecting to Matrix...
          </p>
        </div>
      </div>
    );
  }

  // Authentication error screen
  if (!authenticated) {
    return (
      <div className={getThemeClass('loadingScreen')}>
        <div className={getThemeClass('authErrorCard')}>
          <Lock className={getThemeClass('authErrorIcon')} />
          <h1 className={getThemeClass('authErrorTitle')}>Matrix Widget Authentication</h1>
          <p className={getThemeClass('authErrorText')}>{error}</p>
          <div className={getThemeClass('authInstructions')}>
            <p>To use this dashboard:</p>
            <ol className={styles.authInstructionsList}>
              <li>Add this as a widget to your Matrix room</li>
              <li>Use: <code className={styles.codeSnippet}>/addwidget {window.location.href}?matrix_user_id=$matrix_user_id&matrix_room_id=$matrix_room_id</code></li>
              <li>Or open directly with proper parameters</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // PIN Authentication Modal
  console.log('🔐 PIN Modal Check:', { authenticated, pinAuthRequired, PIN_AUTH_ENABLED });
  if (authenticated && pinAuthRequired && PIN_AUTH_ENABLED) {
    console.log('🔐 Showing PIN modal');
    return (
      <PINAuth
        roomId={roomId}
        onAuthSuccess={handlePinAuthSuccess}
        onAuthError={handlePinAuthError}
        apiBaseUrl={API_BASE_URL}
        apiKey={API_KEY}
        isDarkMode={isDarkMode}
      />
    );
  }

  // Main loading screen
  if (loading) {
    return (
      <div className={getThemeClass('loadingScreen')}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={getThemeClass('loadingText')}>Loading Matrix messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={getThemeClass('container')} data-testid="matrix-integration-container">
      <div className={styles.maxWidth}>
        {/* Header */}
        <div className={getThemeClass('card')}>
          <div className={styles.headerContent}>
            <div className={styles.headerInfo}>
              <h1 className={getThemeClass('title')}>Matrix Integration Dashboard</h1>
              <p className={getThemeClass('subtitle')}>
                Connected as: <span className={styles.monospace}>{matrixUserId}</span>
              </p>
              <p className={getThemeClass('roomInfo')}>
                Room: <span className={styles.monospace}>{roomId}</span>
              </p>
              
              {/* PIN Authentication Status */}
              {PIN_AUTH_ENABLED && roomAuthStatus && (
                <div className={styles.authStatus}>
                  {roomAuthStatus.authenticated ? (
                    <span className={`${styles.authIndicator} ${styles.authSuccess}`}>
                      🔐 Authenticated
                      {roomAuthStatus.status === 'expiring_soon' && (
                        <span className={styles.authWarning}> (expires soon)</span>
                      )}
                    </span>
                  ) : (
                    <span className={`${styles.authIndicator} ${styles.authRequired}`}>
                      🔒 PIN Required
                    </span>
                  )}
                </div>
              )}
              
              <div className={getThemeClass('statusInfo')}>
                Auto-refreshing every 30 seconds • Last updated: {lastUpdateTime.toLocaleTimeString()}
                {refreshing && (
                  <span style={{ 
                    marginLeft: '12px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: '0.875rem',
                    color: isDarkMode ? '#60a5fa' : '#2563eb',
                    opacity: 0.8
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Refreshing...
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Manual refresh button */}
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className={getThemeClass('themeToggle')}
                aria-label="Refresh messages"
                title="Refresh messages now"
                style={{ 
                  opacity: refreshing ? 0.6 : 1,
                  cursor: refreshing ? 'not-allowed' : 'pointer'
                }}
              >
                <div style={{
                  transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)',
                  transition: 'transform 0.6s ease-in-out'
                }}>
                  🔄
                </div>
              </button>
              
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={getThemeClass('themeToggle')}
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className={styles.icon} /> : <Moon className={styles.icon} />}
              </button>
            </div>
          </div>
        </div>

        {/* API Configuration Warnings */}
        {!process.env.REACT_APP_DATABASE_API_BASE_URL && (
          <div className={`${styles.alert} ${styles.alertOrange}`}>
            <AlertCircle className={styles.alertIcon} />
            <div>
              <p className={styles.alertTitle}>Using Default API URL</p>
              <p className={styles.alertText}>Environment variable REACT_APP_DATABASE_API_BASE_URL is not set. Using fallback: {API_BASE_URL}</p>
            </div>
          </div>
        )}

        {!API_KEY && (
          <div className={`${styles.alert} ${styles.alertYellow}`}>
            <AlertCircle className={styles.alertIcon} />
            <div>
              <p className={styles.alertTitle}>Missing API Key</p>
              <p className={styles.alertText}>Environment variable REACT_APP_DATABASE_API_KEY is not set. API requests will fail.</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className={`${styles.alert} ${styles.alertRed}`}>
            <AlertCircle className={styles.alertIcon} />
            <p className={styles.alertErrorText}>{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className={getThemeClass('card')}>
          <div className={styles.searchContainer}>
            {/* Search Bar */}
            <div className={styles.searchInputWrapper}>
              <Search className={getThemeClass('searchIcon')} />
              <input
                type="text"
                placeholder="Search messages, senders, or files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={getThemeClass('searchInput')}
              />
            </div>

            {/* Filters Toggle */}
            <div className={styles.filtersHeader}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={getThemeClass('filtersToggle')}
              >
                <Filter className={styles.smallIcon} />
                Filters
                <ChevronDown className={`${styles.smallIcon} ${showFilters ? styles.rotated : ''}`} />
                {hasActiveFilters() && <span className={styles.activeIndicator}></span>}
              </button>

              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className={styles.clearFiltersBtn}
                >
                  <X className={styles.tinyIcon} />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className={getThemeClass('filtersPanel')}>
                {/* Date Range */}
                <div className={styles.filterGroup}>
                  <label className={getThemeClass('filterLabel')}>Date Range</label>
                  <div className={styles.dateInputs}>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className={getThemeClass('filterInput')}
                    />
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      className={getThemeClass('filterInput')}
                    />
                  </div>
                </div>

                {/* Message Types */}
                <div className={styles.filterGroup}>
                  <label className={getThemeClass('filterLabel')}>Message Types</label>
                  <select
                    multiple
                    value={filters.messageTypes}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      messageTypes: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                    className={getThemeClass('filterSelect')}
                  >
                    {uniqueMessageTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Senders */}
                <div className={styles.filterGroup}>
                  <label className={getThemeClass('filterLabel')}>Senders</label>
                  <select
                    multiple
                    value={filters.senders}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      senders: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                    className={getThemeClass('filterSelect')}
                  >
                    {uniqueSenders.map(sender => (
                      <option key={sender} value={sender}>{sender}</option>
                    ))}
                  </select>
                </div>

                {/* Media Filter */}
                <div className={styles.filterGroup}>
                  <label className={getThemeClass('filterLabel')}>Content Type</label>
                  <select
                    value={filters.hasMedia}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasMedia: e.target.value }))}
                    className={getThemeClass('filterInput')}
                  >
                    <option value="all">All Messages</option>
                    <option value="with-media">With Media</option>
                    <option value="text-only">Text Only</option>
                  </select>
                </div>

                {/* File Size Range */}
                <div className={styles.filterGroupWide}>
                  <label className={getThemeClass('filterLabel')}>File Size Range (e.g., 1MB, 500KB)</label>
                  <div className={styles.sizeInputs}>
                    <input
                      type="text"
                      placeholder="Min size"
                      value={filters.fileSizeMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, fileSizeMin: e.target.value }))}
                      className={getThemeClass('filterInput')}
                    />
                    <input
                      type="text"
                      placeholder="Max size"
                      value={filters.fileSizeMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, fileSizeMax: e.target.value }))}
                      className={getThemeClass('filterInput')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className={styles.resultsInfo}>
              <p className={getThemeClass('resultsText')}>
                Showing {sortedMessages.length} of {messages.length} messages
                {(searchTerm || hasActiveFilters()) && ` matching your ${searchTerm ? 'search' : ''}${searchTerm && hasActiveFilters() ? ' and ' : ''}${hasActiveFilters() ? 'filters' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className={styles.messagesList}>
          {sortedMessages.length === 0 ? (
            <div className={getThemeClass('emptyState')}>
              <p className={getThemeClass('emptyStateText')}>No messages found</p>
              {(searchTerm || hasActiveFilters()) && (
                <p className={getThemeClass('emptyStateSubtext')}>Try adjusting your search terms or filters</p>
              )}
            </div>
          ) : (
            sortedMessages.map((message) => {
              const isNewMessage = newMessageIds.has(message.event_id);
              return (
                <div 
                  key={message.event_id} 
                  className={getThemeClass('messageCard')}
                  style={isNewMessage ? {
                    animation: 'fadeInSlide 0.6s ease-out',
                    border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)'
                  } : {}}
                >
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <span className={getThemeClass('messageSender')}>{message.sender}</span>
                      <span className={getThemeClass('messageType')}>
                        {message.message_type}
                      </span>
                      <span className={getThemeClass('messageTime')}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    <div className={styles.messageBody}>
                      {getMediaIcon(message.message_type)}
                      <div className={styles.messageTextContent}>
                        <p className={getThemeClass('messageText')}>{message.content}</p>
                        
                        {/* Media Preview */}
                        {message.media_filename && (
                          <div className={styles.mediaSection}>
                            <MediaPreview 
                              message={message}
                              apiKey={API_KEY}
                              apiBaseUrl={API_BASE_URL}
                              authToken={PIN_AUTH_ENABLED ? roomAuthManager.getRoomAuthStatus(roomId)?.accessToken : null}
                              pinAuthEnabled={PIN_AUTH_ENABLED}
                              onError={(error) => console.error('Media preview error:', error)}
                            />
                            
                            <div className={styles.mediaInfo}>
                              <span className={getThemeClass('mediaDetails')}>
                                📎 {message.media_filename} • {formatFileSize(message.media_size)}
                                {message.media_mimetype && ` • ${message.media_mimetype}`}
                              </span>
                              <button
                                onClick={() => handleDownload(
                                  message.media_url?.startsWith('/') 
                                    ? `${API_BASE_URL}${message.media_url}` 
                                    : message.media_url, 
                                  message.media_filename
                                )}
                                className={styles.downloadBtn}
                              >
                                <Download className={styles.smallIcon} />
                                Download
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className={getThemeClass('card')}>
            <h3 className={getThemeClass('statsTitle')}>Database Statistics</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <p className={styles.statValueBlue}>{stats.total_messages || messages.length}</p>
                <p className={getThemeClass('statLabel')}>Total Messages</p>
              </div>
              <div className={styles.statItem}>
                <p className={styles.statValueGreen}>{stats.total_media_files || 0}</p>
                <p className={getThemeClass('statLabel')}>Media Files</p>
              </div>
              <div className={styles.statItem}>
                <p className={styles.statValuePurple}>
                  {new Set(messages.map(m => m.sender)).size}
                </p>
                <p className={getThemeClass('statLabel')}>Unique Senders</p>
              </div>
              <div className={styles.statItem}>
                <p className={styles.statValueOrange}>
                  {stats.total_size_mb ? `${stats.total_size_mb.toFixed(1)} MB` : '0 MB'}
                </p>
                <p className={getThemeClass('statLabel')}>Storage Used</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatrixIntegration;
