# Scrap Calculator - Project Overview

## Purpose
This documentation provides a comprehensive overview of the Scrap Calculator Progressive Web App for future AI assistants to understand the project structure, functionality, and implementation details.

## Project Description
The Scrap Calculator is a Progressive Web App (PWA) designed to help players of the game "Scraps 2" calculate and track their weekly merge goals. The app helps players determine how many hours they need to play to reach their weekly merge targets (typically 50,000 merges by Sunday 5pm).

## Core Features

### 1. Merge Calculation Engine
- **Input**: Current merge count, target goal (default 50,000), merge rate per 10 minutes
- **Output**: Time requirements, pace tracking, goal projections
- **Time Boundaries**: All calculations use 5pm-to-5pm day boundaries (not midnight-to-midnight)
- **Week Definition**: Sunday 5pm to Sunday 5pm

### 2. Progress Tracking
- **Real-time Progress**: Visual progress bar with percentage completion
- **Pace Analysis**: Current pace vs required pace comparison
- **Status Indicators**: Color-coded status (excellent/good/on-track/close/behind/critical)
- **Predictive Finish**: Estimates completion time based on current pace

### 3. Daily Progress Visualization
- **Chart Type**: Bar chart showing daily merge increments (not cumulative)
- **Day Boundaries**: Each day runs from 5pm to 5pm
- **Missing Days**: Shows 0 merges for days with no data (doesn't carry forward)
- **Target Line**: Horizontal line showing required daily merges

### 4. Data Persistence
- **Local Storage**: IndexedDB for all data (no backend required)
- **Data Structure**: Week-based organization with cumulative daily totals
- **Export/Import**: JSON-based data backup and transfer
- **Cross-Device Sync**: Shareable sync codes for device synchronization

### 5. Progressive Web App Features
- **Offline Support**: Service worker for offline functionality
- **Responsive Design**: Mobile-first design with touch-friendly controls
- **Installation**: Can be installed as a native-like app

## Architecture

### Frontend Structure
```
/src
├── js/
│   ├── services/
│   │   ├── CalculationService.js    # Pure calculation logic
│   │   ├── DataManager.js           # Data persistence & state
│   │   ├── DisplayManager.js        # UI updates & rendering
│   │   └── AnalyticsService.js      # Charts & analytics
│   ├── AppController.js             # Main application controller
│   ├── app.js                       # Application initialization
│   ├── charts.js                    # Chart.js implementations
│   └── storage.js                   # IndexedDB wrapper
├── styles/
│   └── main.css                     # Application styles
└── index.html                       # Main HTML file
```

### Key Classes

#### CalculationService
- Pure calculation logic with no DOM dependencies
- Handles all merge calculations, time tracking, and progress analysis
- **Critical Methods**:
  - `calculateWeekBounds()`: Determines Sunday 5pm boundaries
  - `getDayIndexSince5pm()`: Calculates day index using 5pm boundaries
  - `calculateDailyProgress()`: Computes daily increments from cumulative data

#### DataManager
- Manages application state and data persistence
- Handles import/export functionality
- **Critical Methods**:
  - `updateCurrentDayTotal()`: Updates daily history with change detection
  - `importData()`: Preserves imported historical data integrity

#### DisplayManager
- Handles all UI updates and user interactions
- Manages real-time display updates

#### AnalyticsService
- Generates charts using Chart.js
- Provides weekly statistics and trend analysis

## Data Structure

### Daily History Format
```javascript
dailyHistory: {
  "2025-01-12": {  // Week ID (Sunday date)
    "Sun Jan 12 2025": 10000,  // Cumulative total at end of Sunday
    "Mon Jan 13 2025": 25000,  // Cumulative total at end of Monday
    "Tue Jan 14 2025": 35000,  // Cumulative total at end of Tuesday
    // ... etc
  }
}
```

### Application State
```javascript
state: {
  currentMerges: 0,
  mergeRatePer10Min: 0,
  targetGoal: 50000,
  weekStartDate: Date,
  weekEndDate: Date,
  dailyHistory: {},
  weeklyHistory: [],
  lastSyncTime: null,
  lastSyncCode: null
}
```

## Critical Implementation Details

### 5pm Day Boundaries
- **Why**: The game's weekly reset happens at Sunday 5pm
- **Implementation**: `getDayIndexSince5pm()` calculates days as 24-hour periods starting at 5pm
- **Impact**: All daily calculations, progress tracking, and chart displays use this boundary

### Data Persistence Strategy
- **Primary**: IndexedDB for structured data storage
- **Fallback**: localStorage for compatibility
- **Import/Export**: Complete data preservation with change detection to prevent overwrites

### Missing Data Handling
- **Daily Progress**: Missing days show as 0 merges (not carried forward from previous day)
- **Charts**: Empty bars for missing days maintain visual accuracy
- **Calculations**: Robust handling of undefined/null data points

## Performance Considerations
- **Target Response Times**:
  - Calculations: < 50ms
  - Chart rendering: < 100ms
  - UI updates: < 100ms
- **Bundle Size**: < 100KB initial load
- **Offline Capability**: Full functionality without network

## Testing Requirements

### Critical Test Cases
1. **5pm Boundary Test**: Verify merges at 4:59pm vs 5:01pm count for different days
2. **Missing Days Test**: Confirm missing days display as 0 merges, not previous totals
3. **Import/Export Test**: Ensure imported data preserves all historical information
4. **Week Transition**: Verify proper handling of Sunday 5pm week boundaries

## Future Development Notes

### Known Limitations
- No backend synchronization (by design - local-first approach)
- Chart.js dependency for visualizations
- 30-day expiration on sync codes

### Extension Points
- Additional chart types can be added via AnalyticsService
- New calculation methods can be added to CalculationService
- Additional export formats can be implemented in DataManager

### Maintenance Considerations
- Chart.js version updates may require chart configuration updates
- IndexedDB schema changes need migration logic
- Service worker updates require cache invalidation

## Dependencies
- **Chart.js**: For data visualizations
- **IndexedDB**: Browser-native data storage
- **Service Worker**: For PWA functionality and offline support

This project follows a service-oriented architecture with clear separation of concerns between calculation logic, data management, and UI rendering, making it maintainable and extensible for future enhancements.