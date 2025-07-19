# Scrap Calculator

A Progressive Web App (PWA) for calculating and tracking weekly merge goals in the game Scraps 2. Helps players determine how many hours they need to play to reach their weekly merge targets (typically 50,000 merges by Sunday 5pm).

## Features

### Core Functionality
- **Smart Merge Calculator**: Calculate required playing time based on current progress and merge rate (per 10 minutes)
- **5pm-to-5pm Week Tracking**: Week runs from Sunday 5pm to Sunday 5pm (not midnight-based)
- **Real-time Progress**: Live countdown to next Sunday 5pm deadline with color-coded status indicators
- **Pace Analysis**: Compare current pace vs required pace to stay on track
- **Predictive Finish Time**: Estimate when you'll complete your weekly goal

### Data Visualization
Four interactive charts to track your progress:
- **Daily Progress Chart**: Bar chart showing daily merge increments for the current week
- **Weekly Trend Chart**: Line chart comparing weekly totals against target goals over time
- **Achievement Rate Chart**: Doughnut chart visualizing completed vs incomplete weeks
- **Recent Performance Chart**: Bar chart showing achievement rate for the last 4 weeks

### Advanced Analytics
- **Weekly Statistics**: Completion rate, achievement percentage, and streak tracking
- **Efficiency Metrics**: Track merge rate consistency and performance patterns
- **Predictive Analytics**: Completion probability based on current pace and historical data
- **Personalized Recommendations**: Get tailored advice based on your performance trends
- **Trend Analysis**: Monitor if your performance is improving, stable, or declining

### Data Management
- **Local Storage**: All data stored locally using IndexedDB (no account required)
- **Import/Export**: Download your data as JSON for backup or device transfer
- **Progress History**: Track multiple weeks of merge data with cumulative daily totals
- **Offline Support**: Full functionality without internet connection as a PWA

### Progressive Web App
- **Installable**: Add to home screen on mobile devices
- **Offline Mode**: Service worker enables full offline functionality
- **Mobile-First Design**: Responsive interface optimized for phones and tablets
- **Fast Performance**: Instant calculations and cached resources

## Usage

1. **Set Your Goal**: Default is 50,000 merges (customizable)
2. **Enter Current Merges**: Input your current merge count
3. **Configure Merge Rate**: Set your average merges per 10 minutes
4. **Track Progress**: Monitor real-time calculations and visual indicators
5. **Review Analytics**: Check charts and recommendations for insights
6. **Export Data**: Back up your progress history as needed

## Technical Details

- **Frontend**: Vanilla JavaScript with service-oriented architecture
- **Charts**: Chart.js for data visualizations
- **Storage**: IndexedDB with localStorage fallback
- **PWA**: Service worker with cache-first strategy
- **No Backend**: Fully client-side application for privacy and performance