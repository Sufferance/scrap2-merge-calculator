# Scrap Calculator

A Progressive Web App (PWA) for calculating and tracking weekly merge goals in the game Scraps 2. The app helps players determine how many hours they need to play to reach their weekly merge targets (typically 50,000 merges by Sunday 5pm).

## Features

- **Real-time Calculations**: Instantly calculate merge requirements based on current progress
- **Time Tracking**: Live countdown to next Sunday 5pm deadline
- **Progress Visualization**: Dynamic progress bar with color-coded status indicators
- **Multi-week History**: Track and visualize progress over multiple weeks
- **Cross-device Sync**: Share progress across devices with secure 6-character sync codes
- **Offline Support**: Full PWA functionality with offline capability
- **Mobile-first Design**: Touch-friendly interface optimized for all devices

## How It Works

The app calculates your merge requirements using:
- Current merge count (user input)
- Target goal (default 50,000, customizable)
- Merge rate per 10 minutes (for accuracy)
- Time remaining until next Sunday 5pm

### Key Formulas
```javascript
mergeRatePerHour = mergeRatePer10Min * 6
mergesNeeded = targetGoal - currentMerges
hoursRequired = mergesNeeded / mergeRatePerHour
averageHoursPerDay = hoursRequired / daysRemaining
```

## Usage

1. Open the app in your browser
2. Enter your current merge count
3. Set your merge rate per 10 minutes
4. View real-time calculations and progress
5. Track your progress throughout the week
6. Use sync codes to access from multiple devices

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: IndexedDB for local data persistence
- **Charts**: Chart.js for progress visualizations
- **PWA**: Service workers and web app manifest
- **Sync**: Encrypted data sharing with expiring codes

## Installation

### As a PWA
1. Visit the app in your browser
2. Click "Install" or "Add to Home Screen"
3. Use like a native app

### Local Development
1. Clone the repository
2. Open `index.html` in your browser
3. Or serve with a local HTTP server for full PWA features

## Data Privacy

- **Local-first**: All data stored locally on your device
- **No accounts**: Anonymous usage, no personal data collection
- **Optional sync**: Encrypted sync codes for cross-device access only
- **Secure**: HTTPS only, no third-party tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details