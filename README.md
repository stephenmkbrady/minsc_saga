# Minsc Saga

React dashboard for Matrix chat visualization with PIN-based authentication and Matrix widget integration.

## ✨ Features

- **PIN Authentication**: 6-digit secure room access with 24-hour expiration
- **Matrix Widget Integration**: Embeddable widget for Matrix clients with automatic room detection
- **Message Display**: Timeline view with search, filtering, and media previews
- **Dark/Light Themes**: System preference detection with manual toggle
- **Responsive Design**: Mobile-friendly Tailwind CSS interface
- **API Integration**: Connects to boo_memories backend via JWT tokens

## 🚀 Quick Start

### Docker Method (Recommended)

```bash
cd minsc_saga/

# Development mode with hot reloading
docker-compose --profile development up --build -d
docker-compose logs minsc_saga-dev  # Check logs

# Production mode (optimized build)
docker-compose --profile production up --build -d
docker-compose logs minsc-saga

# Stop (CRITICAL - always clean up)
docker-compose down
```

### Local Development

```bash
cd minsc_saga/
npm install
npm start  # Opens http://localhost:3000
```

## ⚙️ Configuration

Create `.env` file in `minsc_saga/`:

```bash
# Backend API Configuration
REACT_APP_DATABASE_API_BASE_URL="https://your-api-domain.com"
REACT_APP_DATABASE_API_KEY="your_boo_memories_api_key"

# PIN Authentication
REACT_APP_PIN_AUTH_ENABLED=true

# Development Server
HOST=0.0.0.0
PORT=3000
```

## 🔐 PIN Authentication Flow

1. **User opens dashboard** → PIN prompt appears for room access
2. **User goes to Matrix room** → Sends `!pin` command to boo_bot
3. **boo_bot generates PIN** → 6-digit PIN valid for 24 hours  
4. **User enters PIN** → Dashboard validates and gets room access token
5. **Access granted** → Room messages and media displayed

### PIN Commands in Matrix
- `!pin` or `!getpin` - Request PIN for current room
- Rate limited: 3 requests per hour per room
- PINs expire after 24 hours for security

## 🔗 Matrix Widget Integration

Add widget to any Matrix room:

```bash
# In Matrix client, type in desired room:
/addwidget https://your-dashboard-domain.com/?matrix_user_id=$matrix_user_id&matrix_room_id=$matrix_room_id

# For local development:
/addwidget http://localhost:3000?matrix_user_id=$matrix_user_id&matrix_room_id=$matrix_room_id
```

Widget automatically detects room context and prompts for PIN authentication on first access.

## 🧪 Testing

```bash
# React tests
cd minsc_saga/
npm test
npm test -- --coverage --watchAll=false

# Full stack PIN test
# 1. Start all services
cd boo_memories && docker-compose --profile sqlite up -d
cd ../boo_bot && docker-compose up -d  
cd ../minsc_saga && docker-compose --profile development up -d

# 2. Test PIN flow
open "http://localhost:3000?matrix_user_id=@test:example.com&matrix_room_id=!test:example.com"

# 3. Clean up (CRITICAL)
cd boo_bot && docker-compose down
cd ../boo_memories && docker-compose --profile sqlite down
cd ../minsc_saga && docker-compose down
```

## 🏗️ Architecture

```
minsc_saga/
├── src/
│   ├── App.js              # Main application with PIN auth
│   ├── components/
│   │   ├── PINAuth.js      # PIN authentication modal
│   │   ├── Dashboard.js    # Main dashboard interface
│   │   └── MessageList.js  # Message display components
│   └── styles/
│       └── globals.css     # Tailwind CSS configuration
├── docker-compose.yml      # Multi-profile deployment
└── package.json           # React dependencies
```

## 🔗 Integration

Works with:
- **boo_bot**: Generates PINs via `!pin` command
- **boo_memories**: Backend API for message/media storage and PIN validation

## 📚 Technologies

- [React](https://react.dev/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first styling
- [Matrix Widget API](https://github.com/matrix-org/matrix-widget-api) - Widget integration
- [Lucide React](https://lucide.dev/) - Icon library
- Docker - Containerized deployment
