# Scrap Calculator - Project Overview

## Purpose
This documentation provides a comprehensive overview of the Scrap Calculator Progressive Web App for future AI assistants to understand the project structure, functionality, and implementation details.

## Project Description
The Scrap Calculator is a Progressive Web App (PWA) designed to help players of the game "Scraps 2" calculate and track their weekly merge goals. The app helps players determine how many hours they need to play to reach their weekly merge targets (typically 50,000 merges by Sunday 5pm).

## Current Implementation Status
- **Version**: 1.0.0 (Production Ready)
- **Architecture**: Service-oriented with clear separation of concerns
- **Data Storage**: IndexedDB primary, localStorage fallback
- **Charts**: Chart.js for all visualizations
- **PWA Features**: Service worker, manifest, offline support

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
/
├── src/
│   ├── js/
│   │   ├── services/
│   │   │   ├── CalculationService.js    # Pure calculation logic (344 lines)
│   │   │   ├── DataManager.js           # Data persistence & state (514 lines)
│   │   │   ├── DisplayManager.js        # UI updates & rendering (384 lines)
│   │   │   └── AnalyticsService.js      # Advanced analytics (211 lines)
│   │   ├── AppController.js             # Main orchestration controller (548 lines)
│   │   ├── app.js                       # Application initialization (45 lines)
│   │   ├── charts.js                    # Chart.js implementations (447 lines)
│   │   └── storage.js                   # IndexedDB wrapper (198 lines)
│   └── styles/
│       └── main.css                     # Application styles
├── index.html                           # Main HTML file (183 lines)
├── manifest.json                        # PWA manifest
├── sw.js                               # Service worker
├── package.json                        # Dependencies (Chart.js 4.4.0)
└── CLAUDE.md                           # Project instructions
```

### Key Classes

#### CalculationService (344 lines)
- Pure calculation logic with zero DOM dependencies
- Handles all merge calculations, time tracking, and progress analysis
- **Critical Methods**:
  - `calculateWeekBounds()`: Determines Sunday 5pm boundaries with timezone handling
  - `getDayIndexSince5pm()`: Calculates day index using 5pm boundaries (not midnight)
  - `calculateDailyProgress()`: Computes daily increments from cumulative data
  - `calculateMergeRequirements()`: Core calculation engine for hours/pace
  - `calculateEnhancedStatus()`: 6-level status system (excellent/good/on-track/close/behind/critical)
  - `calculatePredictiveFinishTime()`: ML-like predictions with time estimation
- **Constants**: Proper time multipliers (6x for 10min→hourly conversion)
- **Error Handling**: Robust handling of edge cases and invalid data

#### DataManager (514 lines)
- Manages complete application state and data persistence layer
- Orchestrates IndexedDB operations through StorageManager
- **State Management**:
  - Complete application state object with history tracking
  - Automatic week boundary updates and transitions
  - Legacy data migration for backward compatibility
- **Critical Methods**:
  - `updateCurrentDayTotal()`: Updates daily history with change detection and cumulative storage
  - `importData()`: Complete data import with integrity preservation
  - `exportData()`: Full backup export with metadata
  - `handleWeekTransition()`: Automatic Sunday 5pm week rollover
  - `calculateStreak()`: Achievement streak calculation
  - `getWeeklyStats()`: Comprehensive analytics data generation
- **Data Integrity**: Change detection prevents unnecessary overwrites
- **Fallback Strategy**: localStorage backup when IndexedDB fails

#### DisplayManager (384 lines)
- Handles all DOM manipulation and UI state management
- Zero business logic - pure presentation layer
- **UI Components**:
  - Real-time countdown timer with automatic updates
  - Dynamic progress bars with percentage display
  - Color-coded status system with smooth transitions
  - Collapsible config and sync panels with state persistence
  - Touch gesture support for mobile devices
- **Display Features**:
  - Animated status changes with scale effects
  - Pulse effects for user feedback
  - Responsive card-based layout
  - Advanced analytics display with recommendations
  - Import/export UI with file handling
- **Performance**: Cached DOM elements, throttled updates, efficient redraws

#### AnalyticsService (211 lines)
- Advanced analytics engine with predictive capabilities
- Generates insights, recommendations, and trends
- **Analytics Features**:
  - Multi-week efficiency calculations with consistency tracking
  - Predictive completion probability using historical patterns
  - Smart recommendations based on current performance
  - Trend analysis (improving/stable/declining)
  - Real-time insights with performance thresholds
- **Prediction Engine**:
  - Completion probability calculation (15-95% range)
  - Recommended daily targets based on remaining time
  - Estimated completion dates with current pace
- **Insights Generation**: Dynamic insights based on performance patterns

## Data Structure

### Data Storage Architecture

#### IndexedDB Schema
- **Database**: ScrapCalculatorDB (version 1)
- **Object Stores**:
  - `currentProgress`: Current week data with daily history
  - `weeklyHistory`: Completed weeks with achievement data
  - `settings`: User preferences and sync settings

#### Daily History Format
```javascript
dailyHistory: {
  "2025-01-12": {  // Week ID (Sunday date in YYYY-MM-DD)
    "Sun Jan 12 2025": 10000,  // Cumulative total at end of Sunday
    "Mon Jan 13 2025": 25000,  // Cumulative total at end of Monday
    "Tue Jan 14 2025": 35000,  // Cumulative total at end of Tuesday
    // Days store CUMULATIVE totals, not daily increments
    // Missing days = 0 merges (not carried forward)
  }
}
```

#### Weekly History Format
```javascript
weekData: {
  weekId: "2025-01-12",
  weekStart: "2025-01-12T17:00:00.000Z",  // Sunday 5pm UTC
  weekEnd: "2025-01-19T17:00:00.000Z",    // Next Sunday 5pm UTC
  finalMerges: 52000,
  targetGoal: 50000,
  completed: true,
  achievementRate: 104.0,
  dailyProgress: [...],  // Daily breakdown for charts
  completedAt: "2025-01-19T16:45:00.000Z"
}
```

### Complete Application State
```javascript
state: {
  // Current week progress
  currentMerges: 0,
  mergeRatePer10Min: 0,
  targetGoal: 50000,
  
  // Time boundaries (Sunday 5pm to Sunday 5pm)
  weekStartDate: Date,
  weekEndDate: Date,
  
  // Historical data
  dailyHistory: {},     // Current and past weeks by week ID
  weeklyHistory: [],    // Completed weeks with full metadata
  
  // Sync and backup
  lastSyncTime: null,
  lastSyncCode: null,
  
  // Internal state
  initialized: false
}
```

## Critical Implementation Details

### 5pm Day Boundaries (Core Architecture)
- **Why**: The game's weekly reset happens at Sunday 5pm (not midnight)
- **Implementation**: 
  - `getDayIndexSince5pm()` calculates days as 24-hour periods starting at 5pm
  - `calculateWeekBounds()` handles Sunday transitions properly
  - All date calculations use 5pm as day boundary, not midnight
- **Impact**: 
  - Daily progress charts show 5pm-to-5pm periods
  - Week transitions happen exactly at Sunday 5pm
  - Import/export preserves these boundaries
  - Missing days show as 0 merges (not carried forward)

### Multi-Layer Data Persistence Strategy
- **Primary**: IndexedDB via StorageManager class (structured, async)
- **Fallback**: localStorage for legacy compatibility and emergency backup
- **Import/Export**: 
  - Complete JSON export with metadata and version tracking
  - Import preserves all historical data without overwriting
  - Change detection prevents unnecessary storage operations
  - File-based backup system with timestamp naming
- **Data Integrity**: 
  - Automatic migration for legacy data formats
  - Validation on import with error handling
  - Atomic operations for consistency

### Advanced Data Handling
- **Missing Data Strategy**:
  - Missing days show as 0 merges (not carried forward from previous day)
  - Charts display empty bars to maintain visual accuracy
  - Calculations handle undefined/null data points gracefully
  - Future days with imported data are displayed correctly
- **Cumulative vs Incremental**:
  - Storage uses cumulative totals for each day
  - Charts calculate daily increments dynamically
  - Prevents data loss during partial imports
- **Edge Cases**:
  - Week boundary transitions at exactly Sunday 5pm
  - Timezone handling for different user locations
  - Goal completion scenarios and post-completion tracking

## Performance Optimizations
- **Target Response Times**:
  - Calculations: < 50ms (pure functions, no DOM access)
  - Chart rendering: < 100ms (throttled updates, efficient redraws)
  - UI updates: < 100ms (cached DOM elements, batch operations)
  - Data operations: < 200ms (IndexedDB async operations)
- **Bundle Optimization**:
  - Total size: ~2.5MB (including Chart.js CDN)
  - Core app: < 100KB (HTML/CSS/JS combined)
  - Lazy loading: Charts only render when needed
- **Memory Management**:
  - Chart update throttling prevents excessive redraws
  - DOM element caching reduces query overhead
  - Service-oriented architecture prevents memory leaks
- **Offline Capability**: Full functionality without network via service worker

## Testing Requirements

### Critical Test Cases
1. **5pm Boundary Test**: 
   - Verify merges at 4:59pm vs 5:01pm count for different days
   - Test week transitions exactly at Sunday 5pm
   - Validate day index calculations across different dates
2. **Missing Days Test**: 
   - Confirm missing days display as 0 merges, not previous totals
   - Test chart rendering with gaps in data
   - Verify cumulative calculations with missing data points
3. **Import/Export Test**: 
   - Ensure imported data preserves all historical information
   - Test backward compatibility with different export versions
   - Validate data integrity after import operations
4. **Week Transition Test**: 
   - Verify proper handling of Sunday 5pm week boundaries
   - Test automatic week rollover functionality
   - Confirm new week state initialization
5. **Chart Performance Test**:
   - Test chart updates with large datasets
   - Verify chart destruction and recreation logic
   - Test responsive behavior on different screen sizes

## Architecture & Extension Points

### Service-Oriented Design Benefits
- **Separation of Concerns**: Each service has single responsibility
- **Testability**: Services can be unit tested independently
- **Maintainability**: Changes isolated to specific services
- **Extensibility**: New services can be added without modifying existing code

### Current Limitations & Design Decisions
- **No Backend**: Local-first approach by design (privacy, offline-first)
- **Chart.js Dependency**: External CDN for chart rendering (4.4.0)
- **Browser Compatibility**: Requires modern browsers with IndexedDB support
- **Sync Limitations**: File-based backup only (no cloud sync)

### Extension Points
- **AnalyticsService**: Add new chart types, metrics, or prediction algorithms
- **CalculationService**: Implement new calculation methods or status levels
- **DataManager**: Add new export formats or data transformation logic
- **DisplayManager**: Create new UI components or interaction patterns
- **StorageManager**: Implement new storage backends or sync mechanisms

### Maintenance & Updates
- **Chart.js Updates**: May require chart configuration adjustments
- **IndexedDB Schema**: Changes need migration logic in StorageManager
- **Service Worker**: Updates require cache invalidation strategy
- **Browser APIs**: Monitor for deprecations in IndexedDB, localStorage

### Code Quality Metrics
- **Total Lines**: ~2,691 lines of JavaScript
- **Service Distribution**: Balanced across services (200-550 lines each)
- **Dependencies**: Minimal external dependencies (Chart.js only)
- **Error Handling**: Comprehensive try-catch blocks and fallbacks throughout

## Technology Stack & Dependencies

### Core Dependencies
- **Chart.js 4.4.0**: Advanced charting library (loaded via CDN)
- **IndexedDB**: Browser-native structured data storage
- **Service Worker**: PWA functionality and offline caching
- **Web App Manifest**: PWA installation and theming

### Browser APIs Used
- **Local Storage**: Fallback data persistence
- **File API**: Import/export functionality
- **Touch Events**: Mobile gesture support
- **Date/Time APIs**: Week boundary calculations
- **Canvas API**: Chart rendering surface

### Development Dependencies
- **http-server**: Local development server
- **gh-pages**: Deployment to GitHub Pages

### PWA Features Implemented
- **Offline Support**: Service worker caches all assets
- **Installation**: Can be installed as native-like app
- **Responsive Design**: Mobile-first approach
- **Theme Colors**: Consistent branding across platforms

## Project Maturity & Production Readiness

This project represents a **production-ready PWA** with:
- **Robust Architecture**: Service-oriented design with clear boundaries
- **Comprehensive Features**: Full calculation engine, analytics, and data management
- **Error Handling**: Extensive error handling and fallback mechanisms
- **Performance Optimized**: Efficient rendering and data operations
- **User Experience**: Intuitive interface with advanced features
- **Data Integrity**: Reliable persistence with import/export capabilities
- **Mobile Support**: Touch gestures and responsive design

The codebase demonstrates professional software development practices with clear separation of concerns, comprehensive error handling, and extensible architecture suitable for long-term maintenance and feature expansion.