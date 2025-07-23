// Streak calculation service - handles daily target achievement tracking
class StreakCalculator {
    constructor() {
        this.MS_PER_DAY = 24 * 60 * 60 * 1000; // Milliseconds in a day
        this.maxHistorySize = 100; // Limit streak history size for memory efficiency
        this.validationEnabled = true; // Enable data validation by default
    }

    calculateDailyTarget(weeklyGoal) {
        try {
            if (typeof weeklyGoal !== 'number' || weeklyGoal <= 0 || !isFinite(weeklyGoal)) {
                console.warn('Invalid weekly goal provided:', weeklyGoal);
                return 0;
            }
            return Math.ceil(weeklyGoal / 7);
        } catch (error) {
            console.error('Error calculating daily target:', error);
            return 0;
        }
    }

    isDailyTargetAchieved(merges, dailyTarget) {
        try {
            if (typeof merges !== 'number' || typeof dailyTarget !== 'number') {
                console.warn('Invalid merge count or daily target:', { merges, dailyTarget });
                return false;
            }
            if (!isFinite(merges) || !isFinite(dailyTarget)) {
                console.warn('Non-finite values provided:', { merges, dailyTarget });
                return false;
            }
            return merges >= dailyTarget;
        } catch (error) {
            console.error('Error checking daily target achievement:', error);
            return false;
        }
    }

    // Data validation methods
    validateDailyAchievementData(dailyAchievements) {
        if (!Array.isArray(dailyAchievements)) {
            throw new Error('Daily achievements data must be an array');
        }

        const errors = [];
        const seenDates = new Set();

        dailyAchievements.forEach((day, index) => {
            // Check required fields
            if (!day.hasOwnProperty('date') || !day.hasOwnProperty('achievedTarget')) {
                errors.push(`Item at index ${index} missing required fields`);
                return;
            }

            // Validate date format
            if (typeof day.date !== 'string' || !this.isValidDateString(day.date)) {
                errors.push(`Invalid date format at index ${index}: ${day.date}`);
            }

            // Check for duplicate dates
            if (seenDates.has(day.date)) {
                errors.push(`Duplicate date found: ${day.date}`);
            } else {
                seenDates.add(day.date);
            }

            // Validate achievedTarget field
            if (typeof day.achievedTarget !== 'boolean') {
                errors.push(`Invalid achievedTarget value at index ${index}: ${day.achievedTarget}`);
            }

            // Validate numeric fields if present
            if (day.hasOwnProperty('merges') && (typeof day.merges !== 'number' || !isFinite(day.merges))) {
                errors.push(`Invalid merges value at index ${index}: ${day.merges}`);
            }

            if (day.hasOwnProperty('dailyTarget') && (typeof day.dailyTarget !== 'number' || !isFinite(day.dailyTarget))) {
                errors.push(`Invalid dailyTarget value at index ${index}: ${day.dailyTarget}`);
            }
        });

        return errors;
    }

    isValidDateString(dateStr) {
        try {
            // Check basic format (YYYY-MM-DD or similar)
            if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                return false;
            }

            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return false;
            }

            // Check for reasonable date range (not too far in past/future)
            const currentYear = new Date().getFullYear();
            const dateYear = date.getFullYear();
            if (dateYear < currentYear - 10 || dateYear > currentYear + 5) {
                console.warn(`Date outside reasonable range: ${dateStr}`);
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    // Sanitize and repair corrupted data
    sanitizeDailyAchievementData(dailyAchievements) {
        if (!Array.isArray(dailyAchievements)) {
            console.warn('Sanitizing non-array data to empty array');
            return [];
        }

        const sanitized = [];
        const seenDates = new Set();

        dailyAchievements.forEach((day, index) => {
            try {
                // Skip items missing critical fields
                if (!day || typeof day !== 'object') {
                    console.warn(`Skipping invalid item at index ${index}:`, day);
                    return;
                }

                if (!day.hasOwnProperty('date') || !day.hasOwnProperty('achievedTarget')) {
                    console.warn(`Skipping item missing required fields at index ${index}:`, day);
                    return;
                }

                // Skip invalid or duplicate dates
                if (!this.isValidDateString(day.date) || seenDates.has(day.date)) {
                    console.warn(`Skipping item with invalid/duplicate date at index ${index}:`, day.date);
                    return;
                }

                seenDates.add(day.date);

                // Create sanitized version
                const sanitizedDay = {
                    date: day.date,
                    achievedTarget: Boolean(day.achievedTarget),
                    merges: this.sanitizeNumber(day.merges, 0),
                    dailyTarget: this.sanitizeNumber(day.dailyTarget, 0),
                    goalTarget: this.sanitizeNumber(day.goalTarget, 50000)
                };

                sanitized.push(sanitizedDay);
            } catch (error) {
                console.warn(`Error sanitizing item at index ${index}:`, error);
            }
        });

        return sanitized;
    }

    sanitizeNumber(value, defaultValue = 0) {
        if (typeof value !== 'number' || !isFinite(value) || value < 0) {
            return defaultValue;
        }
        return Math.max(0, Math.round(value));
    }

    // Recovery methods for corrupted streak data
    recoverFromCorruptedData(corruptedData, fallbackData = null) {
        console.warn('Attempting to recover from corrupted streak data');

        try {
            // Try to extract any valid daily achievements
            let recoveredData = [];

            if (Array.isArray(corruptedData)) {
                recoveredData = this.sanitizeDailyAchievementData(corruptedData);
            } else if (corruptedData && typeof corruptedData === 'object') {
                // Try to extract from object structure
                const possibleArrays = [
                    corruptedData.dailyAchievements,
                    corruptedData.dailyProgress,
                    corruptedData.data,
                    Object.values(corruptedData)
                ].filter(val => Array.isArray(val));

                for (const arr of possibleArrays) {
                    const sanitized = this.sanitizeDailyAchievementData(arr);
                    if (sanitized.length > recoveredData.length) {
                        recoveredData = sanitized;
                    }
                }
            }

            // If we still have no data, use fallback
            if (recoveredData.length === 0 && fallbackData) {
                console.info('Using fallback data for recovery');
                recoveredData = this.sanitizeDailyAchievementData(fallbackData);
            }

            console.info(`Recovered ${recoveredData.length} daily achievement records`);
            return recoveredData;

        } catch (error) {
            console.error('Failed to recover from corrupted data:', error);
            return [];
        }
    }

    // Safe calculation wrapper with error handling
    safeCalculateStreaks(dailyAchievements, options = {}) {
        const {
            validateData = this.validationEnabled,
            sanitizeData = true,
            fallbackData = null
        } = options;

        try {
            let processedData = dailyAchievements;

            // Validate data if requested
            if (validateData && processedData) {
                const validationErrors = this.validateDailyAchievementData(processedData);
                if (validationErrors.length > 0) {
                    console.warn('Data validation errors found:', validationErrors);
                    
                    if (sanitizeData) {
                        console.info('Attempting to sanitize data...');
                        processedData = this.sanitizeDailyAchievementData(processedData);
                    } else {
                        throw new Error(`Data validation failed: ${validationErrors.join(', ')}`);
                    }
                }
            }

            // Perform calculation
            return this.calculateStreaks(processedData);

        } catch (error) {
            console.error('Error in streak calculation:', error);

            // Attempt recovery
            try {
                console.info('Attempting data recovery...');
                const recoveredData = this.recoverFromCorruptedData(dailyAchievements, fallbackData);
                
                if (recoveredData.length > 0) {
                    console.info('Successfully recovered data, recalculating streaks...');
                    return this.calculateStreaks(recoveredData);
                }
            } catch (recoveryError) {
                console.error('Recovery attempt failed:', recoveryError);
            }

            // Return safe default values
            console.warn('Returning default values due to unrecoverable errors');
            return {
                currentStreak: 0,
                longestStreak: 0,
                streakHistory: [],
                totalDaysAchieved: 0,
                error: error.message,
                recovered: false
            };
        }
    }

    isConsecutiveDay(prevDate, currentDate) {
        const prev = new Date(prevDate);
        const current = new Date(currentDate);
        
        // For date strings like '2025-07-23', we want to check if they're consecutive calendar days
        // rather than exactly 24 hours apart, since the tests use date strings without times
        
        // If these are date strings without times, compare the day difference
        if (typeof prevDate === 'string' && !prevDate.includes('T')) {
            // Parse as date strings and check if they're exactly 1 day apart
            const timeDiff = current.getTime() - prev.getTime();
            const daysDiff = Math.round(timeDiff / (24 * 60 * 60 * 1000));
            return daysDiff === 1;
        }
        
        // For full datetime strings, check if exactly 24 hours apart
        const timeDiff = current.getTime() - prev.getTime();
        const hoursDiff = timeDiff / (60 * 60 * 1000);
        return Math.abs(hoursDiff - 24) < 0.1; // Within 6 minutes tolerance
    }

    // Optimized version for cached Date objects - avoids creating new Date instances
    isConsecutiveDayOptimized(prevDateObj, currentDateObj) {
        // For large datasets, we can assume date strings without times
        // Check if they're exactly 1 day apart using pre-computed Date objects
        const timeDiff = currentDateObj.getTime() - prevDateObj.getTime();
        const daysDiff = Math.round(timeDiff / (24 * 60 * 60 * 1000));
        return daysDiff === 1;
    }

    calculateStreaks(dailyAchievements) {
        if (!dailyAchievements || dailyAchievements.length === 0) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                streakHistory: [],
                totalDaysAchieved: 0
            };
        }

        // Performance optimization: Use pre-computed date cache for large datasets
        const dateCache = new Map();
        const getDateObject = (dateStr) => {
            if (!dateCache.has(dateStr)) {
                dateCache.set(dateStr, new Date(dateStr));
            }
            return dateCache.get(dateStr);
        };

        // Sort by date ascending to process chronologically
        // Optimization: Avoid creating new array for small datasets
        let sortedDays;
        if (dailyAchievements.length > 100) {
            // For large datasets, use optimized sorting with cached dates
            sortedDays = dailyAchievements.slice().sort((a, b) => {
                return getDateObject(a.date).getTime() - getDateObject(b.date).getTime();
            });
        } else {
            // For small datasets, use simple approach
            sortedDays = [...dailyAchievements].sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA.getTime() - dateB.getTime();
            });
        }

        let currentStreak = 0;
        let longestStreak = 0;
        let streakHistory = [];
        let streakStartDate = null;
        let totalDaysAchieved = 0;

        // Performance optimization: Pre-allocate arrays for large datasets
        if (sortedDays.length > 365) {
            streakHistory = new Array();
            // Estimate initial capacity based on typical streak patterns
            const estimatedStreaks = Math.floor(sortedDays.length / 10);
            if (estimatedStreaks > 0) {
                streakHistory.length = 0; // Reset but keep capacity hint
            }
        }

        // Optimization: Cache previous date for consecutive day checking
        let prevDateCache = null;
        let prevDateStr = null;

        for (let i = 0; i < sortedDays.length; i++) {
            const day = sortedDays[i];
            const prevDay = i > 0 ? sortedDays[i - 1] : null;

            if (day.achievedTarget) {
                totalDaysAchieved++;
                
                // Optimization: Use cached date objects for consecutive day checking
                let isConsecutive = false;
                if (prevDay && prevDay.achievedTarget) {
                    // Only check consecutiveness if previous day was also achieved
                    if (prevDateStr !== prevDay.date) {
                        prevDateCache = getDateObject(prevDay.date);
                        prevDateStr = prevDay.date;
                    }
                    isConsecutive = this.isConsecutiveDayOptimized(
                        prevDateCache, 
                        getDateObject(day.date)
                    );
                }

                if (isConsecutive && currentStreak > 0) {
                    // Continue existing streak
                    currentStreak++;
                } else {
                    // Start new streak
                    currentStreak = 1;
                    streakStartDate = day.date;
                }

                // Optimization: Only update longestStreak when necessary
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                }
            } else {
                // Target not achieved - end current streak if any
                if (currentStreak > 0) {
                    streakHistory.push({
                        startDate: streakStartDate,
                        endDate: prevDay.date,
                        length: currentStreak
                    });
                    currentStreak = 0;
                    streakStartDate = null;
                }
            }
        }

        // Optimization: Limit streak history size for memory efficiency
        if (streakHistory.length > 100) {
            // Keep only the most recent 100 streaks and longest streaks
            streakHistory.sort((a, b) => b.length - a.length);
            const topStreaks = streakHistory.slice(0, 50); // Top 50 by length
            
            // Add recent streaks (by end date)
            streakHistory.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
            const recentStreaks = streakHistory.slice(0, 50).filter(
                s => !topStreaks.some(t => t.startDate === s.startDate && t.endDate === s.endDate)
            );
            
            streakHistory = [...topStreaks, ...recentStreaks].slice(0, 100);
        }

        return {
            currentStreak,
            longestStreak,
            streakHistory,
            totalDaysAchieved
        };
    }

    // Enhanced method that processes raw daily progress data
    calculateStreaksFromDailyProgress(dailyProgressData, weeklyGoal) {
        if (!dailyProgressData || dailyProgressData.length === 0) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                streakHistory: [],
                totalDaysAchieved: 0
            };
        }

        const dailyTarget = this.calculateDailyTarget(weeklyGoal);
        
        // Transform daily progress into achievement data
        const achievementData = dailyProgressData.map(day => ({
            date: day.date,
            merges: day.merges,
            dailyTarget: dailyTarget,
            achievedTarget: this.isDailyTargetAchieved(day.merges, dailyTarget)
        }));

        return this.calculateStreaks(achievementData);
    }

    // Helper method to get streak status for display
    getStreakStatus(streakData) {
        const { currentStreak, longestStreak } = streakData;
        
        if (currentStreak === 0) {
            return {
                status: 'none',
                message: 'No current streak',
                className: 'streak-none'
            };
        } else if (currentStreak >= 30) {
            return {
                status: 'legendary',
                message: `${currentStreak} day streak! 🔥`,
                className: 'streak-legendary'
            };
        } else if (currentStreak >= 14) {
            return {
                status: 'excellent',
                message: `${currentStreak} day streak! 🌟`,
                className: 'streak-excellent'
            };
        } else if (currentStreak >= 7) {
            return {
                status: 'good',
                message: `${currentStreak} day streak! ⭐`,
                className: 'streak-good'
            };
        } else {
            return {
                status: 'building',
                message: `${currentStreak} day streak`,
                className: 'streak-building'
            };
        }
    }

    // Helper method to check if a milestone was reached
    checkMilestone(previousStreak, currentStreak) {
        const milestones = [7, 14, 30, 50, 100];
        
        for (const milestone of milestones) {
            if (previousStreak < milestone && currentStreak >= milestone) {
                return {
                    reached: true,
                    milestone: milestone,
                    message: `🎉 ${milestone} Day Streak Achievement!`
                };
            }
        }
        
        return { reached: false };
    }
}

// Export for use in other modules
window.StreakCalculator = StreakCalculator;