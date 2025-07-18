// Pure calculation service - no DOM dependencies
class CalculationService {
    constructor() {
        this.HOURS_PER_DAY = 24;
        this.MINUTES_PER_HOUR = 60;
        this.SECONDS_PER_MINUTE = 60;
        this.MS_PER_SECOND = 1000;
        this.MS_PER_HOUR = this.MS_PER_SECOND * this.SECONDS_PER_MINUTE * this.MINUTES_PER_HOUR;
        this.MS_PER_DAY = this.MS_PER_HOUR * this.HOURS_PER_DAY;
        this.MERGE_RATE_MULTIPLIER = 6; // Convert 10-minute rate to hourly
    }

    calculateWeekBounds(currentDate = new Date()) {
        const now = new Date(currentDate);
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentHour = now.getHours();
        
        // Calculate last Sunday at 5pm
        let lastSunday = new Date(now);
        let daysBack = currentDay;
        
        // If it's Sunday and before 5pm, go back to previous Sunday
        if (currentDay === 0 && currentHour < 17) {
            daysBack = 7;
        }
        
        lastSunday.setDate(now.getDate() - daysBack);
        lastSunday.setHours(17, 0, 0, 0);
        
        // Calculate next Sunday at 5pm
        let nextSunday = new Date(lastSunday);
        nextSunday.setDate(lastSunday.getDate() + 7);
        
        return {
            weekStartDate: lastSunday,
            weekEndDate: nextSunday
        };
    }

    calculateMergeRequirements(currentMerges, targetGoal, mergeRatePer10Min, weekStartDate, weekEndDate) {
        const now = new Date();
        
        // Core calculation formulas
        const mergeRatePerHour = mergeRatePer10Min * this.MERGE_RATE_MULTIPLIER;
        const mergesNeeded = Math.max(0, targetGoal - currentMerges);
        const hoursRequired = mergeRatePerHour > 0 ? mergesNeeded / mergeRatePerHour : 0;
        
        // Calculate time remaining
        const timeRemaining = weekEndDate - now;
        const hoursRemaining = Math.max(0, timeRemaining / this.MS_PER_HOUR);
        const daysRemaining = Math.max(0, timeRemaining / this.MS_PER_DAY);
        
        const averageHoursPerDay = hoursRequired / Math.max(1, daysRemaining);
        
        return {
            mergesNeeded,
            hoursRequired,
            averageHoursPerDay,
            hoursRemaining,
            daysRemaining,
            timeRemaining
        };
    }

    calculatePaceTracking(currentMerges, mergesNeeded, weekStartDate, hoursRemaining) {
        const now = new Date();
        const timeSinceWeekStart = now - weekStartDate;
        const hoursSinceWeekStart = Math.max(1, timeSinceWeekStart / this.MS_PER_HOUR);
        
        const currentPace = currentMerges / hoursSinceWeekStart;
        const requiredPace = mergesNeeded / Math.max(1, hoursRemaining);
        const isOnTrack = currentPace >= requiredPace || mergesNeeded <= 0;
        
        return {
            currentPace,
            requiredPace,
            isOnTrack,
            hoursSinceWeekStart
        };
    }

    calculateProgressPercentage(currentMerges, targetGoal) {
        return Math.min(100, (currentMerges / targetGoal) * 100);
    }

    calculateTimeDisplay(hours) {
        const totalHours = Math.floor(hours);
        const totalMinutes = Math.round((hours - totalHours) * 60);
        
        if (totalHours > 0) {
            return `${totalHours}h ${totalMinutes}m`;
        } else {
            return `${totalMinutes}m`;
        }
    }

    calculateEnhancedStatus(currentMerges, targetGoal, currentPace, requiredPace, hoursRemaining) {
        const mergesNeeded = Math.max(0, targetGoal - currentMerges);
        const progressPercentage = (currentMerges / targetGoal) * 100;
        
        if (mergesNeeded <= 0) {
            return {
                status: 'completed',
                text: 'Goal Reached!',
                className: 'completed',
                paceRatio: 1,
                level: 'excellent'
            };
        }
        
        const paceRatio = requiredPace > 0 ? currentPace / requiredPace : 0;
        const timeRatio = hoursRemaining / (7 * 24); // Fraction of week remaining
        
        // Enhanced status categories with granular thresholds
        if (paceRatio >= 1.5) {
            return {
                status: 'excellent',
                text: 'Excellent Pace',
                className: 'excellent',
                paceRatio,
                level: 'excellent'
            };
        } else if (paceRatio >= 1.2) {
            return {
                status: 'good',
                text: 'Good Pace',
                className: 'good',
                paceRatio,
                level: 'good'
            };
        } else if (paceRatio >= 1.0) {
            return {
                status: 'on-track',
                text: 'On Track',
                className: 'on-track',
                paceRatio,
                level: 'on-track'
            };
        } else if (paceRatio >= 0.85) {
            return {
                status: 'close',
                text: 'Close',
                className: 'close',
                paceRatio,
                level: 'close'
            };
        } else if (paceRatio >= 0.6) {
            return {
                status: 'behind',
                text: 'Behind',
                className: 'behind',
                paceRatio,
                level: 'behind'
            };
        } else {
            return {
                status: 'critical',
                text: 'Critical',
                className: 'critical',
                paceRatio,
                level: 'critical'
            };
        }
    }

    calculatePredictiveFinishTime(mergesNeeded, currentPace, weekEndDate) {
        if (mergesNeeded <= 0) {
            return {
                status: 'completed',
                message: 'Goal completed!',
                className: 'predicted-finish completed'
            };
        }
        
        if (currentPace <= 0) {
            return {
                status: 'no-data',
                message: 'No progress data',
                className: 'predicted-finish no-data'
            };
        }
        
        const hoursToFinish = mergesNeeded / currentPace;
        const finishDate = new Date(Date.now() + (hoursToFinish * this.MS_PER_HOUR));
        const deadlineDate = weekEndDate;
        
        // Format the predicted finish time
        const finishTime = finishDate.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        // Determine if we'll finish on time
        const willFinishOnTime = finishDate <= deadlineDate;
        const timeDifference = Math.abs(finishDate - deadlineDate) / this.MS_PER_HOUR; // hours
        
        let statusClass = 'predicted-finish ';
        let statusText = '';
        
        if (willFinishOnTime) {
            if (timeDifference > 24) {
                statusClass += 'excellent';
                statusText = `Will finish ${finishTime} (${Math.round(timeDifference)}h early)`;
            } else if (timeDifference > 6) {
                statusClass += 'good';
                statusText = `Will finish ${finishTime} (${Math.round(timeDifference)}h early)`;
            } else {
                statusClass += 'on-track';
                statusText = `Will finish ${finishTime} (on time)`;
            }
        } else {
            if (timeDifference > 24) {
                statusClass += 'critical';
                statusText = `Will finish ${finishTime} (${Math.round(timeDifference)}h late)`;
            } else {
                statusClass += 'behind';
                statusText = `Will finish ${finishTime} (${Math.round(timeDifference)}h late)`;
            }
        }
        
        return {
            status: willFinishOnTime ? 'on-time' : 'late',
            message: statusText,
            className: statusClass,
            finishDate,
            timeDifference
        };
    }

    calculateDailyProgress(currentMerges, weekStartDate, dailyHistory) {
        const now = new Date();
        const weekId = this.getWeekId(weekStartDate);
        const timeSinceStart = now - weekStartDate;
        const daysSinceStart = Math.floor(timeSinceStart / this.MS_PER_DAY);
        
        const weekData = dailyHistory?.[weekId];
        const baseline = weekData?.['_baseline'] || 0;
        const baselineDate = weekData?.['_baselineDate'] ? new Date(weekData['_baselineDate']) : null;
        
        const dailyProgress = [];
        for (let i = 0; i <= daysSinceStart; i++) {
            const dayDate = new Date(weekStartDate);
            dayDate.setDate(weekStartDate.getDate() + i);
            const dateKey = dayDate.toDateString();
            
            // Get actual daily progress from stored data
            let mergesForDay = weekData?.[dateKey] || 0;
            
            // If we have a baseline and this day is before the baseline was set,
            // don't show any data (to avoid misleading zero values)
            if (baseline > 0 && baselineDate && dayDate < baselineDate) {
                // Skip days before baseline was established
                continue;
            }
            
            dailyProgress.push({
                date: dayDate.toISOString(),
                merges: mergesForDay,
                dayOfWeek: dayDate.getDay(),
                dateKey: dateKey,
                isBaseline: baseline > 0 && !mergesForDay // Flag for UI to show differently
            });
        }
        
        return dailyProgress;
    }

    getWeekId(weekStartDate) {
        const year = weekStartDate.getFullYear();
        const month = weekStartDate.getMonth() + 1;
        const day = weekStartDate.getDate();
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    calculateCurrentDayTotal(currentMerges, weekStartDate, dailyHistory) {
        const now = new Date();
        const weekId = this.getWeekId(weekStartDate);
        const timeSinceStart = now - weekStartDate;
        const daysSinceStart = Math.floor(timeSinceStart / this.MS_PER_DAY);
        
        // Get the date key for this day within the week
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + daysSinceStart);
        const today = dayDate.toDateString();
        
        // Check if we have a baseline (from legacy data migration)
        const weekData = dailyHistory?.[weekId];
        const baseline = weekData?.['_baseline'] || 0;
        
        // Calculate how many merges belong to previous days (excluding baseline markers)
        let previousDaysMerges = 0;
        for (let i = 0; i < daysSinceStart; i++) {
            const prevDate = new Date(weekStartDate);
            prevDate.setDate(weekStartDate.getDate() + i);
            const prevDateKey = prevDate.toDateString();
            previousDaysMerges += weekData?.[prevDateKey] || 0;
        }
        
        // Calculate today's total
        // If we have a baseline, only count merges above the baseline
        let todaysMerges;
        if (baseline > 0) {
            // Only count increments above the baseline
            const incrementAboveBaseline = Math.max(0, currentMerges - baseline);
            todaysMerges = Math.max(0, incrementAboveBaseline - previousDaysMerges);
        } else {
            // Normal calculation
            todaysMerges = Math.max(0, currentMerges - previousDaysMerges);
        }
        
        return {
            weekId,
            today,
            todaysMerges,
            previousDaysMerges,
            baseline
        };
    }
}

// Export for use in other modules
window.CalculationService = CalculationService;