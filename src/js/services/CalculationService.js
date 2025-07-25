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
        if (!weekStartDate) {
            return [];
        }
        const now = new Date();
        const weekId = this.getWeekId(weekStartDate);
        const daysSinceStart = this.getDayIndexSince5pm(weekStartDate, now);

        const dailyProgress = [];
        let previousCumulative = 0;

        // Check all days in the week, not just up to current day
        // This ensures imported data for future days is displayed
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStartDate);
            dayDate.setDate(weekStartDate.getDate() + i);
            const dateKey = dayDate.toDateString();

            // Get cumulative total for this day
            const cumulativeForDay = dailyHistory?.[weekId]?.[dateKey];
            
            let dailyIncrement;
            if (cumulativeForDay === undefined) {
                if (i < daysSinceStart) {
                    // Missing historical day - show as 0
                    dailyIncrement = 0;
                } else if (i === daysSinceStart) {
                    // Current day with no data yet
                    dailyIncrement = Math.max(0, currentMerges - previousCumulative);
                } else {
                    // Future day with no data - don't show
                    continue;
                }
            } else {
                // Has data (including imported data for any day)
                dailyIncrement = Math.max(0, cumulativeForDay - previousCumulative);
                previousCumulative = cumulativeForDay;
            }

            dailyProgress.push({
                date: dayDate.toISOString(),
                merges: dailyIncrement,
                dayOfWeek: dayDate.getDay(),
                dateKey: dateKey
            });
        }
        
        return dailyProgress;
    }

    getWeekId(weekStartDate) {
        if (!weekStartDate) {
            return null;
        }
        const year = weekStartDate.getFullYear();
        const month = weekStartDate.getMonth() + 1;
        const day = weekStartDate.getDate();
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    getDayIndexSince5pm(weekStartDate, currentDate) {
        // Week starts at Sunday 5pm
        const timeSinceStart = currentDate - weekStartDate;
        const hoursSinceStart = timeSinceStart / (1000 * 60 * 60);
        
        // Each day is 24 hours starting from 5pm
        return Math.floor(hoursSinceStart / 24);
    }

    getCurrentDayDateKey(weekStartDate, currentDate) {
        const dayIndex = this.getDayIndexSince5pm(weekStartDate, currentDate);
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + dayIndex);
        return dayDate.toDateString();
    }

    calculateCurrentDayTotal(currentMerges, weekStartDate, dailyHistory) {
        // Input validation
        if (!this.validateCalculationInputs(currentMerges, weekStartDate)) {
            console.warn('CalculationService: Invalid inputs for calculateCurrentDayTotal');
            return this.getDefaultCurrentDayResult(weekStartDate);
        }
        
        const now = new Date();
        const weekId = this.getWeekId(weekStartDate);
        const daysSinceStart = this.getDayIndexSince5pm(weekStartDate, now);
        
        // Get the date key for this day within the week
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + daysSinceStart);
        const today = dayDate.toDateString();

        // Calculate how many merges belong to previous days with improved accuracy
        let previousDaysMerges = 0;
        if (daysSinceStart > 0) {
            // Get yesterday's date (most recent completed day)
            const yesterdayDate = new Date(weekStartDate);
            yesterdayDate.setDate(weekStartDate.getDate() + (daysSinceStart - 1));
            const yesterdayKey = yesterdayDate.toDateString();
            const yesterdayTotal = dailyHistory?.[weekId]?.[yesterdayKey];
            
            if (yesterdayTotal !== undefined) {
                // Handle both old format (number) and new format (object with mergeTotal)
                previousDaysMerges = typeof yesterdayTotal === 'number' ? 
                    yesterdayTotal : (yesterdayTotal.mergeTotal || 0);
                
                // Validate previous day merge count
                if (!Number.isFinite(previousDaysMerges) || previousDaysMerges < 0) {
                    console.warn(`CalculationService: Invalid previous day merges for ${yesterdayKey}: ${previousDaysMerges}, defaulting to 0`);
                    previousDaysMerges = 0;
                }
            }
        }
        
        // Calculate today's total with validation
        const todaysMerges = Math.max(0, currentMerges - previousDaysMerges);
        
        // Consistency check: today's merges shouldn't exceed current total
        if (todaysMerges > currentMerges) {
            console.warn(`CalculationService: Inconsistent daily merge calculation. Today: ${todaysMerges}, Total: ${currentMerges}`);
        }
        
        return {
            weekId,
            today,
            todaysMerges,
            previousDaysMerges,
            isValid: true
        };
    }
    
    // Validation methods for calculation inputs
    validateCalculationInputs(currentMerges, weekStartDate) {
        // Validate current merges
        if (typeof currentMerges !== 'number' || !Number.isFinite(currentMerges) || currentMerges < 0) {
            console.error('CalculationService: Invalid currentMerges:', currentMerges);
            return false;
        }
        
        // Validate week start date
        if (!weekStartDate || !(weekStartDate instanceof Date) || isNaN(weekStartDate.getTime())) {
            console.error('CalculationService: Invalid weekStartDate:', weekStartDate);
            return false;
        }
        
        return true;
    }
    
    validateMergeRateInputs(mergeRatePer10Min, targetGoal) {
        // Validate merge rate
        if (typeof mergeRatePer10Min !== 'number' || !Number.isFinite(mergeRatePer10Min) || mergeRatePer10Min < 0) {
            console.error('CalculationService: Invalid mergeRatePer10Min:', mergeRatePer10Min);
            return false;
        }
        
        // Validate target goal
        if (typeof targetGoal !== 'number' || !Number.isFinite(targetGoal) || targetGoal <= 0) {
            console.error('CalculationService: Invalid targetGoal:', targetGoal);
            return false;
        }
        
        return true;
    }
    
    getDefaultCurrentDayResult(weekStartDate) {
        const now = new Date();
        const weekId = weekStartDate ? this.getWeekId(weekStartDate) : 'unknown';
        const today = now.toDateString();
        
        return {
            weekId,
            today,
            todaysMerges: 0,
            previousDaysMerges: 0,
            isValid: false
        };
    }
    
    // Enhanced daily target calculation with consistency checks
    calculateDailyTarget(targetGoal, daysInWeek = 7) {
        if (!this.validateMergeRateInputs(1, targetGoal)) {
            console.warn('CalculationService: Invalid target goal for daily calculation, using default');
            return Math.ceil(50000 / 7); // Default fallback
        }
        
        const dailyTarget = Math.ceil(targetGoal / daysInWeek);
        
        // Consistency check: daily target should be reasonable
        if (dailyTarget > targetGoal) {
            console.warn(`CalculationService: Daily target (${dailyTarget}) exceeds total goal (${targetGoal})`);
        }
        
        return dailyTarget;
    }
    
    // Data consistency validation between cumulative and daily values
    validateDailyProgressConsistency(dailyHistory, weekId) {
        const issues = [];
        
        if (!dailyHistory || !dailyHistory[weekId]) {
            return { isValid: true, issues: [] };
        }
        
        const weekData = dailyHistory[weekId];
        const dates = Object.keys(weekData).sort();
        let expectedCumulative = 0;
        
        for (let i = 0; i < dates.length; i++) {
            const dateStr = dates[i];
            const dayData = weekData[dateStr];
            
            if (typeof dayData === 'number') {
                // Legacy format - assume it's cumulative
                if (i > 0 && dayData < expectedCumulative) {
                    issues.push({
                        date: dateStr,
                        issue: 'cumulative_decrease',
                        expected: expectedCumulative,
                        actual: dayData
                    });
                }
                expectedCumulative = dayData;
            } else if (dayData && typeof dayData === 'object') {
                // New format - check consistency
                const { merges, mergeTotal } = dayData;
                
                if (typeof merges === 'number' && typeof mergeTotal === 'number') {
                    expectedCumulative += merges;
                    
                    if (Math.abs(mergeTotal - expectedCumulative) > 1) { // Allow for small rounding errors
                        issues.push({
                            date: dateStr,
                            issue: 'cumulative_mismatch',
                            expected: expectedCumulative,
                            actual: mergeTotal,
                            dailyMerges: merges
                        });
                    }
                    
                    expectedCumulative = mergeTotal; // Use actual value for next iteration
                }
                
                // Validate achievement flag consistency
                if (typeof merges === 'number' && typeof dayData.dailyTarget === 'number') {
                    const expectedAchievement = merges >= dayData.dailyTarget;
                    if (dayData.achievedTarget !== expectedAchievement) {
                        issues.push({
                            date: dateStr,
                            issue: 'achievement_flag_mismatch',
                            expected: expectedAchievement,
                            actual: dayData.achievedTarget,
                            merges,
                            dailyTarget: dayData.dailyTarget
                        });
                    }
                }
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            totalDaysChecked: dates.length
        };
    }
    
    // Enhanced merge requirements calculation with validation
    calculateMergeRequirementsWithValidation(currentMerges, targetGoal, mergeRatePer10Min, weekStartDate, weekEndDate) {
        // Input validation
        if (!this.validateCalculationInputs(currentMerges, weekStartDate)) {
            return null;
        }
        
        if (!this.validateMergeRateInputs(mergeRatePer10Min, targetGoal)) {
            return null;
        }
        
        if (!weekEndDate || !(weekEndDate instanceof Date) || isNaN(weekEndDate.getTime())) {
            console.error('CalculationService: Invalid weekEndDate:', weekEndDate);
            return null;
        }
        
        // Perform calculation with validation
        const result = this.calculateMergeRequirements(currentMerges, targetGoal, mergeRatePer10Min, weekStartDate, weekEndDate);
        
        // Add validation flags
        result.inputsValid = true;
        result.calculationWarnings = [];
        
        // Check for edge cases
        if (result.hoursRequired > result.hoursRemaining * 2) {
            result.calculationWarnings.push('Very high play time required - check merge rate accuracy');
        }
        
        if (result.mergeRatePerHour === 0) {
            result.calculationWarnings.push('Zero merge rate - calculations may be inaccurate');
        }
        
        if (result.mergesNeeded <= 0) {
            result.calculationWarnings.push('Goal already achieved');
        }
        
        return result;
    }
}

// Export for use in other modules
window.CalculationService = CalculationService;