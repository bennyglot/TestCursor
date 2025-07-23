# Stock Monitor - Real-time Market Data Application

A modern full-stack application for monitoring premarket stock gainers with real-time alerts and historical analysis.

## 🚀 Features

### Frontend (React + TypeScript + Material-UI)
- **Real-time Dashboard** - Live stock data with WebSocket updates
- **Interactive Data Grid** - Sortable, filterable stock listings
- **Historical Analysis** - Detailed charts and performance metrics
- **Custom Alerts** - Configure personalized notification rules
- **Responsive Design** - Modern Material-UI dark theme
- **Live Notifications** - Browser push notifications for alerts

### Backend (Node.js + TypeScript + Express)
- **Web Scraping** - Automated data collection from stockanalysis.com
- **Real-time WebSocket API** - Instant data synchronization
- **Cron Scheduling** - Configurable data fetching intervals
- **SQLite Database** - Local data storage with historical tracking
- **RESTful API** - Complete CRUD operations for alerts and data
- **MVC Architecture** - Clean, maintainable code structure

### Key Capabilities
- 📊 Monitor top premarket gainers automatically
- 🔔 Get alerts for significant price movements
- 📈 View historical stock performance
- ⚡ Real-time data updates via WebSocket
- 🎯 Custom alert rules (symbol, percentage, volume)
- 📱 Mobile-responsive interface

## 🏗️ Architecture

```
stock-monitor-app/
├── client/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Node.js TypeScript backend
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # Express routes
│   │   ├── config/         # Database configuration
│   │   └── middleware/     # Express middleware
│   └── package.json
├── types/                  # Shared TypeScript interfaces
└── package.json           # Workspace configuration
```

## 🛠️ Technology Stack

**Frontend:**
- React 18 with TypeScript
- Material-UI (MUI) for components
- Vite for development and building
- React Query for data fetching
- WebSocket for real-time updates
- Recharts for data visualization
- Date-fns for date manipulation

**Backend:**
- Node.js with TypeScript
- Express.js web framework
- WebSocket (ws) for real-time communication
- SQLite3 for local database
- Cheerio for web scraping
- Axios for HTTP requests
- Node-cron for scheduled tasks
- Helmet for security

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Modern web browser with WebSocket support
- Internet connection for stock data scraping

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd stock-monitor-app

# Install dependencies for all workspaces
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Environment Configuration

```bash
# Server configuration
cd server
cp .env.example .env

# Edit .env file with your preferences
# PORT=3001
# WEBSOCKET_PORT=3002
# SCRAPING_INTERVAL_MINUTES=1
# DATABASE_PATH=./data/stocks.db
```

### 3. Development

```bash
# Start both client and server in development mode
npm run dev

# Or start them separately:
npm run dev:server  # Starts backend on http://localhost:3001
npm run dev:client  # Starts frontend on http://localhost:3000
```

### 4. Production Build

```bash
# Build both client and server
npm run build

# Start production server
npm start
```

## 🔧 Configuration

### Server Configuration (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | HTTP server port |
| `WEBSOCKET_PORT` | 3002 | WebSocket server port |
| `SCRAPING_INTERVAL_MINUTES` | 1 | Data fetch interval |
| `DATABASE_PATH` | ./data/stocks.db | SQLite database location |
| `SCRAPING_URL` | stockanalysis.com/markets/premarket/gainers/ | Data source URL |
| `MAX_STOCKS_TO_TRACK` | 50 | Maximum stocks to monitor |
| `ALERT_THRESHOLDS_PERCENT_CHANGE` | 20 | Default alert threshold |
| `CORS_ORIGINS` | http://localhost:3000,http://localhost:5173 | Allowed CORS origins |

### Client Configuration

The client automatically connects to the server using environment variables or defaults:
- API: `http://localhost:3001/api`
- WebSocket: `ws://localhost:3002`

## 📊 API Documentation

### Stock Endpoints

- `GET /api/stocks` - Get latest stocks
- `GET /api/stocks/top-gainers` - Get top performing stocks
- `GET /api/stocks/updates` - Get recent stock updates
- `GET /api/stocks/:symbol/history` - Get stock history
- `POST /api/stocks/scraping/trigger` - Trigger manual scraping
- `GET /api/stocks/scraping/status` - Get scraping status

### Alert Endpoints

- `GET /api/alerts` - Get all alert rules
- `GET /api/alerts/active` - Get active alert rules
- `POST /api/alerts` - Create new alert rule
- `PUT /api/alerts/:id` - Update alert rule
- `DELETE /api/alerts/:id` - Delete alert rule

### WebSocket Events

- `STOCKS_UPDATE` - Real-time stock data updates
- `ALERT` - Stock alert notifications
- `SCRAPING_STATUS` - Scraping process status
- `CONNECTION` - Connection status messages
- `ERROR` - Error notifications

## 🗄️ Database Schema

The application uses SQLite with the following tables:

- **stocks** - Current and historical stock data
- **stock_updates** - Price and rank change tracking
- **alert_rules** - User-defined alert configurations
- **scraping_logs** - Monitoring and debugging logs

## 🔔 Alert System

Create custom alerts based on:
- **Symbol-specific** - Monitor particular stocks
- **Percentage Change** - Alert on gain/loss thresholds
- **Volume** - High trading volume notifications
- **Rank Changes** - Position movement in gainers list

## 📱 Usage

### Dashboard
1. View real-time premarket gainers
2. Monitor live price changes
3. Click stocks to view detailed history
4. Use refresh button for manual updates

### Alerts
1. Navigate to Alerts page
2. Create custom rules with conditions
3. Enable/disable rules as needed
4. Receive browser notifications

### Historical Data
1. Click "View History" on any stock
2. Analyze price trends and volume
3. Compare performance metrics
4. Export data for further analysis

## 🔧 Development

### Project Structure
- **Types** - Shared TypeScript interfaces in `/types`
- **Styles** - Material-UI theme and custom styles
- **Services** - API and WebSocket communication
- **Components** - Reusable React components
- **Hooks** - Custom React hooks for state management

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration for code standards
- Consistent file naming conventions
- Comprehensive error handling

## 🚀 Deployment

### Local Production
```bash
npm run build
npm start
```

### Docker (Optional)
```bash
# Build Docker image
docker build -t stock-monitor .

# Run container
docker run -p 3001:3001 -p 3002:3002 stock-monitor
```

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure WebSocket connections

## 📈 Performance Optimizations

- **Database Indexing** - Optimized queries for large datasets
- **Connection Pooling** - Efficient WebSocket management
- **Data Compression** - Reduced bandwidth usage
- **Caching Strategies** - Smart data caching
- **Bundle Splitting** - Optimized client-side loading

## 🐛 Troubleshooting

### Common Issues

**WebSocket Connection Failed**
- Check firewall settings for port 3002
- Ensure server is running
- Verify CORS configuration

**Data Not Updating**
- Check internet connection
- Verify scraping URL accessibility
- Review server logs for errors

**Build Errors**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify TypeScript configuration

### Logs
- Server logs: Console output with timestamp
- Database: SQLite logs in `./data/`
- Client: Browser developer console

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Future Enhancements

- [ ] Multi-exchange support
- [ ] Advanced charting tools
- [ ] Email/SMS notifications
- [ ] Portfolio tracking
- [ ] Machine learning predictions
- [ ] Mobile app version
- [ ] Cloud deployment options
- [ ] Real-time news integration

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Open an issue on GitHub
4. Contact development team

---

**Built with ❤️ for stock market enthusiasts**