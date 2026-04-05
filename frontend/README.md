# Algo Trading Platform - Frontend

React/Next.js frontend for the algorithmic trading platform with Zerodha integration.

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── pages/          # Page components (Next.js routes)
├── components/     # Reusable components
├── hooks/          # Custom React hooks
├── store/          # Zustand state management
├── lib/            # Utilities and API clients
├── types/          # TypeScript types
└── styles/         # Global and component styles
```

## Key Features

### Pages

- **`/login`** - User login with email/password
- **`/register`** - New user registration
- **`/dashboard`** - Main trading dashboard
  - Real-time portfolio P&L
  - Open positions with live prices
  - Active strategies with stop controls
  - Quick navigation to other pages

- **`/strategies`** - Strategy management
  - View available strategies
  - Start new strategy execution
  - Allocate capital per strategy
  - View strategy details

### Hooks

- **`useAuth()`** - Get current user and auth state
- **`useApi()`** - Get auth token and user ID
- **`usePositions()`** - Fetch and track positions
- **`useStrategies()`** - Fetch strategy list
- **`useWebSocket()`** - Real-time WebSocket connection

### State Management

**Auth Store** (`src/store/auth.ts`):
- User profile management
- Token persistence
- Login/Register/Logout actions

### API Client

**`src/lib/api-client.ts`**:
- Centralized API calls
- Automatic token refresh
- Error handling
- WebSocket management

## Key Components

### Login Page
```tsx
- Email and password inputs
- Error messaging
- Link to registration
```

### Dashboard
```tsx
- Portfolio summary (Total P&L, positions, strategies)
- Active strategies with stop button
- Open positions table with real-time P&L
- Strategy tagging for easy identification
```

### Strategies Page
```tsx
- Available strategies list
- Strategy details display
- Capital allocation form
- Start strategy button
```

## Real-Time Updates

WebSocket connection for live updates:
```tsx
const { connected } = useWebSocket((message) => {
  if (message.type === 'positions_update') {
    // Handle position update
  }
})
```

## Styling

Uses Tailwind CSS with custom component classes:
- `.btn-primary` - Primary button
- `.card` - Card container
- `.input-field` - Form input

## API Integration

All API calls go through `apiClient`:

```tsx
// Login
await apiClient.login(email, password)

// Get positions
await apiClient.getPositions(userId, token)

// Start strategy
await apiClient.startStrategy(strategyId, capital, userId, token)
```

## Features to Implement

- [ ] Trade history page with filters
- [ ] Analytics dashboard with charts
- [ ] Strategy creation/editing UI
- [ ] Broker account linking (OAuth flow)
- [ ] Email/Telegram notifications
- [ ] Mobile-responsive design improvements
- [ ] Dark mode toggle
- [ ] Order placement UI
- [ ] Risk management dashboard
- [ ] Backtesting visualizer

## Troubleshooting

### CORS Issues
Ensure backend CORS is properly configured:
```python
allow_origins=["http://localhost:3000"]
```

### API Connection Failed
Check `NEXT_PUBLIC_API_URL` in `.env.local` points to correct backend.

### WebSocket Connection Failed
Ensure backend WebSocket endpoint is deployed and token is valid.

## Security Notes

- Tokens are stored in localStorage
- Add httpOnly cookies for production
- Implement CSRF protection
- Validate all user inputs
- Use HTTPS in production

## Performance Optimization

- Image optimization with Next.js `<Image>`
- Code splitting with dynamic imports
- CSS-in-JS for component styles
- Caching strategies for API calls

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
