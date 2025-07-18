# Daily Progress Graph Specification

## Overview
This specification defines the requirements and behavior for the daily progress graph feature in the Scrap 2 Merge Calculator app. The graph tracks daily merge progress with proper 5pm-to-5pm day boundaries.

## Current Issues & Fixes Required

### 1. Day Boundary Calculation (5pm to 5pm)
**Issue**: The current implementation uses midnight-to-midnight boundaries (`MS_PER_DAY`) instead of 5pm-to-5pm boundaries.

**Current Code Problem**:
```javascript
// In calculateDailyProgress() and calculateCurrentDayTotal()
const daysSinceStart = Math.floor(timeSinceStart / this.MS_PER_DAY);
```

**Required Fix**: Days should be calculated based on 5pm boundaries, not midnight. Each "day" runs from 5pm to 5pm.

### 2. Import/Export Data Persistence
**Issue**: When importing data with modified daily history, the graph doesn't update because `updateCurrentDayTotal()` overwrites imported data.

**Current Problem**: After import, `updateCurrentDayTotal()` immediately recalculates and overwrites the imported daily history for the current day.

**Required Fix**: Import should preserve all historical data and only update the current day if the merge count has changed since import.

## Technical Requirements

### 1. Day Boundary Definition
- A "day" is defined as 5pm to 5pm (17:00 to 17:00)
- Sunday 5pm marks the start of a new week
- Each day within the week runs from 5pm to 5pm
- Example: Monday's merges = all merges from Monday 5pm to Tuesday 5pm

### 2. Data Storage Structure
```javascript
dailyHistory: {
  "2025-01-12": {  // Week ID (Sunday date)
    "Sun Jan 12 2025": 10000,  // Cumulative total at end of Sunday (5pm Monday)
    "Mon Jan 13 2025": 25000,  // Cumulative total at end of Monday (5pm Tuesday)
    "Tue Jan 14 2025": 35000,  // Cumulative total at end of Tuesday (5pm Wednesday)
    // ... etc
  }
}
```

### 3. Daily Increment Calculation
- Daily increment = Current day's cumulative total - Previous day's cumulative total
- First day of week: Daily increment = Sunday's cumulative total (no previous day)
- Missing days should show as 0 merges, not carry forward the previous total

### 4. Real-time Updates
- When user updates merge count, only the current day's total should update
- Multiple updates within the same day should overwrite, not accumulate
- The graph should refresh immediately upon update

### 5. Target Line Feature
- Display a horizontal line showing required daily merges
- Formula: `requiredDailyMerges = mergesRemaining / daysRemaining`
- The target line should dynamically adjust as progress is made
- If user exceeds daily target, recalculate for remaining days

### 6. Export/Import Behavior
- Export must include complete dailyHistory structure
- Import must preserve all historical daily data
- After import, graph should immediately reflect imported data
- Current day should only update if merge count changes post-import

## Implementation Details

### Calculate Day Index with 5pm Boundaries
```javascript
function getDayIndexSince5pm(weekStartDate, currentDate) {
    // Week starts at Sunday 5pm
    const timeSinceStart = currentDate - weekStartDate;
    const hoursSinceStart = timeSinceStart / (1000 * 60 * 60);
    
    // Each day is 24 hours starting from 5pm
    return Math.floor(hoursSinceStart / 24);
}
```

### Determine Current Day's Date Key
```javascript
function getCurrentDayDateKey(weekStartDate, currentDate) {
    const dayIndex = getDayIndexSince5pm(weekStartDate, currentDate);
    const dayDate = new Date(weekStartDate);
    dayDate.setDate(weekStartDate.getDate() + dayIndex);
    return dayDate.toDateString();
}
```

### Handle Missing Days
When calculating daily progress, ensure missing days show as 0:
```javascript
for (let i = 0; i <= currentDayIndex && i < 7; i++) {
    const dayDate = new Date(weekStartDate);
    dayDate.setDate(weekStartDate.getDate() + i);
    const dateKey = dayDate.toDateString();
    
    const cumulativeForDay = dailyHistory?.[weekId]?.[dateKey];
    
    if (cumulativeForDay === undefined && i < currentDayIndex) {
        // Missing historical day - show as 0
        dailyIncrement = 0;
    } else if (cumulativeForDay === undefined && i === currentDayIndex) {
        // Current day with no data yet
        dailyIncrement = currentMerges - previousCumulative;
    } else {
        // Has data
        dailyIncrement = Math.max(0, cumulativeForDay - previousCumulative);
    }
}
```

## Visual Requirements

### Chart Display
- Keep existing bar chart format
- X-axis: Day names (Sun, Mon, Tue, etc.)
- Y-axis: Merge count
- Bars: Show daily increment (not cumulative)
- Target line: Horizontal line at required daily merges
- Colors: 
  - Green bars: Met or exceeded daily target
  - Yellow bars: Within 90% of daily target
  - Red bars: Below 90% of daily target

### Chart Updates
- Real-time update when merge count changes
- Smooth animation for bar height changes
- Target line should animate to new position

## Testing Requirements

### Test Cases
1. **Day Boundary Test**: 
   - Input merges at 4:59pm and 5:01pm
   - Verify they count for different days

2. **Week Transition Test**:
   - Input merges on Sunday at 4:59pm (counts for current week)
   - Input merges on Sunday at 5:01pm (counts for next week)

3. **Missing Days Test**:
   - Skip logging for 2 days
   - Verify those days show 0 merges, not previous day's total

4. **Import/Export Test**:
   - Export data
   - Modify daily history in JSON
   - Import modified data
   - Verify graph reflects imported values

5. **Target Line Test**:
   - Set goal of 50,000 merges
   - Log 10,000 on day 1
   - Verify target line adjusts to show (40,000 / 6 days) = 6,667 per day

## Performance Requirements
- Chart render: < 100ms
- Data calculation: < 50ms
- No UI freezing during updates
- Efficient storage queries (index on weekId)

## Error Handling
- Invalid import data: Show error, preserve existing data
- Missing required fields: Use sensible defaults
- Future dates: Ignore entries beyond current time
- Negative merge values: Treat as 0