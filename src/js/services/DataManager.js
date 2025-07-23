// Data manager - handles all data persistence and state management
class DataManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.calculationService = new CalculationService();
        
        // Application state
        this.state = {
            currentMerges: 0,
            mergeRatePer10Min: 0,
            targetGoal: 50000,
            weekStartDate: null,
            weekEndDate: null,
            dailyHistory: {},
            weeklyHistory: [],
            lastSyncTime: null,
            lastSyncCode: null
        };
        
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.storage.initialize();
            await this.loadAllData();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing DataManager:', error);
            this.loadFallbackData();
        }
    }

    async loadAllData() {
        try {
            // Load current progress
            const savedData = await this.storage.loadCurrentProgress();
            if (savedData) {
                this.state.currentMerges = savedData.currentMerges || 0;
                this.state.mergeRatePer10Min = savedData.mergeRatePer10Min || 0;
                this.state.targetGoal = savedData.targetGoal || 50000;
                this.state.dailyHistory = savedData.dailyHistory || {};
                
                // Parse date strings back to Date objects
                if (savedData.weekStartDate) {
                    this.state.weekStartDate = new Date(savedData.weekStartDate);
                }
                if (savedData.weekEndDate) {
                    this.state.weekEndDate = new Date(savedData.weekEndDate);
                }
            }
            
            // Load weekly history
            const historyData = await this.storage.loadWeeklyHistory();
            this.state.weeklyHistory = historyData || [];
            
            // Check for week transition before updating bounds
            if (this.state.weekEndDate && this.checkWeekTransition()) {
                await this.handleWeekTransition();
            } else {
                // Update week bounds if needed (only if no transition occurred)
                this.updateWeekBounds();
            }
            
            // Handle migration from old system
            this.migrateLegacyData();
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    loadFallbackData() {
        try {
            const fallbackData = localStorage.getItem('scrapCalculatorData');
            if (fallbackData) {
                const data = JSON.parse(fallbackData);
                this.state.currentMerges = data.currentMerges || 0;
                this.state.mergeRatePer10Min = data.mergeRatePer10Min || 0;
                this.state.targetGoal = data.targetGoal || 50000;
                this.state.dailyHistory = data.dailyHistory || {};
                
                if (data.weekStartDate) {
                    this.state.weekStartDate = new Date(data.weekStartDate);
                }
                if (data.weekEndDate) {
                    this.state.weekEndDate = new Date(data.weekEndDate);
                }
            }
        } catch (error) {
            console.error('Error loading fallback data:', error);
        }
        
        // Ensure we have valid week bounds
        this.updateWeekBounds();
    }

    updateWeekBounds() {
        const bounds = this.calculationService.calculateWeekBounds();
        this.state.weekStartDate = bounds.weekStartDate;
        this.state.weekEndDate = bounds.weekEndDate;
    }

    migrateLegacyData() {
        const weekId = this.calculationService.getWeekId(this.state.weekStartDate);
        
        // If we have current merges but no daily history for this week, 
        // assign all current merges to today to prevent the chart from being empty
        if (this.state.currentMerges > 0 && (!this.state.dailyHistory[weekId] || Object.keys(this.state.dailyHistory[weekId]).length === 0)) {
            const currentDayResult = this.calculationService.calculateCurrentDayTotal(
                this.state.currentMerges,
                this.state.weekStartDate,
                this.state.dailyHistory
            );
            
            if (!this.state.dailyHistory[weekId]) {
                this.state.dailyHistory[weekId] = {};
            }
            // Store cumulative total for migration
            this.state.dailyHistory[weekId][currentDayResult.today] = this.state.currentMerges;
        }
    }

    async saveCurrentProgress() {
        const data = {
            currentMerges: this.state.currentMerges,
            mergeRatePer10Min: this.state.mergeRatePer10Min,
            targetGoal: this.state.targetGoal,
            weekStartDate: this.state.weekStartDate?.toISOString(),
            weekEndDate: this.state.weekEndDate?.toISOString(),
            dailyHistory: this.state.dailyHistory
        };
        
        try {
            await this.storage.saveCurrentProgress(data);
        } catch (error) {
            console.error('Error saving data:', error);
            // Fallback to localStorage
            localStorage.setItem('scrapCalculatorData', JSON.stringify(data));
        }
    }

    async saveWeeklyHistory(weekData) {
        try {
            // Update local state first
            const existingIndex = this.state.weeklyHistory.findIndex(w => w.weekId === weekData.weekId);
            if (existingIndex >= 0) {
                this.state.weeklyHistory[existingIndex] = weekData;
            } else {
                this.state.weeklyHistory.push(weekData);
            }
            
            // Save the entire weekly history array
            await this.storage.saveWeeklyHistory(this.state.weeklyHistory);
        } catch (error) {
            console.error('Error saving weekly history:', error);
        }
    }

    async clearAllData() {
        try {
            await this.storage.clearAllData();
        } catch (error) {
            console.error('Error clearing data:', error);
            localStorage.removeItem('scrapCalculatorData');
        }
        
        // Reset state
        this.state = {
            currentMerges: 0,
            mergeRatePer10Min: 0,
            targetGoal: 50000,
            weekStartDate: null,
            weekEndDate: null,
            dailyHistory: {},
            weeklyHistory: [],
            lastSyncTime: null,
            lastSyncCode: null
        };
        
        this.updateWeekBounds();
    }

    // Force set merge count to match input (allows decreases)
    async forceSetCurrentMerges(value) {
        this.state.currentMerges = Math.max(0, parseInt(value) || 0);
        await this.updateCurrentDayTotal();
    }

    async resetStateToCurrentMerges() {
        try {
            const currentMerges = this.state.currentMerges;
            
            // Clear all historical data but keep current settings
            await this.storage.clearAllData();
            
            // Reset state but preserve current merge count and settings
            this.state = {
                currentMerges: currentMerges,
                mergeRatePer10Min: this.state.mergeRatePer10Min,
                targetGoal: this.state.targetGoal,
                weekStartDate: null,
                weekEndDate: null,
                dailyHistory: {},
                weeklyHistory: [],
                lastSyncTime: null,
                lastSyncCode: null
            };
            
            // Update week bounds
            this.updateWeekBounds();
            
            // Reset daily history to current state
            await this.updateCurrentDayTotal();
            
            // Save the reset state
            await this.saveCurrentProgress();
            
            return true;
        } catch (error) {
            console.error('Error resetting state:', error);
            return false;
        }
    }

    async exportData() {
        try {
            return await this.storage.exportData();
        } catch (error) {
            console.error('Error exporting data:', error);
            // Fallback export
            return {
                currentMerges: this.state.currentMerges,
                mergeRatePer10Min: this.state.mergeRatePer10Min,
                targetGoal: this.state.targetGoal,
                weekStartDate: this.state.weekStartDate?.toISOString(),
                weekEndDate: this.state.weekEndDate?.toISOString(),
                dailyHistory: this.state.dailyHistory,
                weeklyHistory: this.state.weeklyHistory,
                exportedAt: new Date().toISOString()
            };
        }
    }

    async importData(data) {
        try {
            await this.storage.importData(data);
            
            // Load the imported data without triggering current day updates
            const savedData = await this.storage.loadCurrentProgress();
            if (savedData) {
                this.state.currentMerges = savedData.currentMerges || 0;
                this.state.mergeRatePer10Min = savedData.mergeRatePer10Min || 0;
                this.state.targetGoal = savedData.targetGoal || 50000;
                
                // Preserve the imported daily history completely
                this.state.dailyHistory = savedData.dailyHistory || {};
                
                // Parse date strings back to Date objects
                if (savedData.weekStartDate) {
                    this.state.weekStartDate = new Date(savedData.weekStartDate);
                }
                if (savedData.weekEndDate) {
                    this.state.weekEndDate = new Date(savedData.weekEndDate);
                }
            }
            
            // Load weekly history
            const historyData = await this.storage.loadWeeklyHistory();
            this.state.weeklyHistory = historyData || [];
            
            // Update week bounds if needed (but don't update current day total yet)
            this.updateWeekBounds();
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    // State getters
    getCurrentMerges() {
        return this.state.currentMerges;
    }

    getMergeRatePer10Min() {
        return this.state.mergeRatePer10Min;
    }

    getTargetGoal() {
        return this.state.targetGoal;
    }

    getWeekStartDate() {
        return this.state.weekStartDate;
    }

    getWeekEndDate() {
        return this.state.weekEndDate;
    }

    getDailyHistory() {
        return this.state.dailyHistory;
    }

    getWeeklyHistory() {
        return this.state.weeklyHistory;
    }

    getCombinedWeeklyData() {
        // Get historical weeks
        const historicalWeeks = [...this.state.weeklyHistory];
        
        // Add current week if it has valid bounds
        if (this.state.weekStartDate && this.state.weekEndDate) {
            const currentWeekId = this.calculationService.getWeekId(this.state.weekStartDate);
            
            // Check if current week is already in history (shouldn't be, but just in case)
            const existsInHistory = historicalWeeks.some(week => week.weekId === currentWeekId);
            
            if (!existsInHistory) {
                const currentWeekData = {
                    weekId: currentWeekId,
                    weekStart: this.state.weekStartDate.toISOString(),
                    weekEnd: this.state.weekEndDate.toISOString(),
                    finalMerges: this.state.currentMerges,
                    targetGoal: this.state.targetGoal,
                    mergeRatePer10Min: this.state.mergeRatePer10Min,
                    completed: this.state.currentMerges >= this.state.targetGoal,
                    achievementRate: Math.round((this.state.currentMerges / this.state.targetGoal) * 100),
                    isCurrentWeek: true
                };
                
                historicalWeeks.push(currentWeekData);
            }
        }
        
        // Sort by week start date
        return historicalWeeks.sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    }

    getWeeklyTooltipData(weekId, weekData = null) {
        let data;
        
        if (weekData) {
            data = weekData;
        } else {
            // Find from combined data
            const combinedData = this.getCombinedWeeklyData();
            data = combinedData.find(week => week.weekId === weekId);
            if (!data) return null;
        }
        
        const startDate = new Date(data.weekStart);
        const endDate = new Date(data.weekEnd);
        
        const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        const merges = data.finalMerges.toLocaleString();
        const target = data.targetGoal.toLocaleString();
        const percentage = Math.round((data.finalMerges / data.targetGoal) * 100);
        
        let status = `${percentage}% of target`;
        if (data.completed) {
            status += ' (✓ Goal reached!)';
        }
        
        return {
            dateRange,
            merges,
            target,
            status,
            weekType: data.isCurrentWeek ? 'Current Week' : 'Completed Week',
            percentage
        };
    }

    getDailyProgress() {
        return this.calculationService.calculateDailyProgress(
            this.state.currentMerges,
            this.state.weekStartDate,
            this.state.dailyHistory
        );
    }

    // State setters
    async setCurrentMerges(value) {
        const newValue = Math.max(0, parseInt(value) || 0);
        const increment = newValue - this.state.currentMerges;
        
        if (newValue > this.state.currentMerges) {
            this.state.currentMerges = newValue;
            await this.updateCurrentDayTotal();
            return increment;
        }
        return 0;
    }

    setMergeRatePer10Min(value) {
        this.state.mergeRatePer10Min = Math.max(0, parseFloat(value) || 0);
    }

    setTargetGoal(value) {
        this.state.targetGoal = Math.max(1, parseInt(value) || 50000);
    }

    async addMerges(amount) {
        this.state.currentMerges = Math.max(0, this.state.currentMerges + amount);
        await this.updateCurrentDayTotal();
    }

    async updateCurrentDayTotal() {
        const currentDayResult = this.calculationService.calculateCurrentDayTotal(
            this.state.currentMerges,
            this.state.weekStartDate,
            this.state.dailyHistory
        );
        
        if (!this.state.dailyHistory[currentDayResult.weekId]) {
            this.state.dailyHistory[currentDayResult.weekId] = {};
        }
        
        // Only update if the merge count has actually changed from what's stored
        const existingTotal = this.state.dailyHistory[currentDayResult.weekId][currentDayResult.today];
        if (existingTotal === undefined || this.state.currentMerges !== existingTotal) {
            // Store cumulative total instead of daily increment
            this.state.dailyHistory[currentDayResult.weekId][currentDayResult.today] = this.state.currentMerges;
            
            // Trigger streak calculation for the current day
            await this.updateDailyProgressWithStreak(
                currentDayResult.today,
                this.state.currentMerges,
                this.state.targetGoal
            );
        }
    }

    async updateDailyProgressWithStreak(dateStr, merges, goalTarget) {
        // Calculate daily target and achievement status
        const dailyTarget = Math.ceil(goalTarget / 7);
        const achievedTarget = merges >= dailyTarget;

        // Create enhanced daily progress object with streak fields
        const dailyData = {
            id: dateStr,
            date: dateStr,
            merges: merges,
            goalTarget: goalTarget,
            dailyTarget: dailyTarget,
            achievedTarget: achievedTarget,
            lastUpdated: Date.now()
        };

        // Update the daily history with the new structure
        const weekId = this.calculationService.getWeekId(new Date(dateStr));
        if (!this.state.dailyHistory[weekId]) {
            this.state.dailyHistory[weekId] = {};
        }
        
        // Store both the cumulative total (for backward compatibility) and the enhanced data
        this.state.dailyHistory[weekId][dateStr] = {
            mergeTotal: merges, // Backward compatibility
            ...dailyData       // Enhanced structure
        };

        // Save updated state
        await this.saveCurrentProgress();

        // Recalculate and update streak summary if StreakCalculator is available
        if (window.StreakCalculator) {
            const allDailyProgress = this.getAllDailyProgressForStreaks();
            const calculator = new StreakCalculator();
            const newStreakSummary = calculator.calculateStreaks(allDailyProgress);
            
            // Save streak summary to database
            if (this.storage.saveStreakSummary) {
                await this.storage.saveStreakSummary({
                    ...newStreakSummary,
                    lastCalculated: Date.now()
                });
            }
        }

        return dailyData;
    }

    getAllDailyProgressForStreaks() {
        const allDailyProgress = [];
        
        // Convert the nested dailyHistory structure to flat array for streak calculation
        for (const weekId in this.state.dailyHistory) {
            for (const dateStr in this.state.dailyHistory[weekId]) {
                const dayData = this.state.dailyHistory[weekId][dateStr];
                
                // Handle both old format (number) and new format (object)
                if (typeof dayData === 'number') {
                    // Legacy format - convert to new structure
                    const dailyTarget = Math.ceil(this.state.targetGoal / 7);
                    allDailyProgress.push({
                        date: dateStr,
                        merges: dayData,
                        goalTarget: this.state.targetGoal,
                        dailyTarget: dailyTarget,
                        achievedTarget: dayData >= dailyTarget
                    });
                } else if (dayData && typeof dayData === 'object') {
                    // New enhanced format
                    allDailyProgress.push({
                        date: dateStr,
                        merges: dayData.merges || dayData.mergeTotal || 0,
                        goalTarget: dayData.goalTarget || this.state.targetGoal,
                        dailyTarget: dayData.dailyTarget || Math.ceil((dayData.goalTarget || this.state.targetGoal) / 7),
                        achievedTarget: dayData.achievedTarget !== undefined ? dayData.achievedTarget : 
                                       (dayData.merges || dayData.mergeTotal || 0) >= (dayData.dailyTarget || Math.ceil((dayData.goalTarget || this.state.targetGoal) / 7))
                    });
                }
            }
        }
        
        // Sort by date to ensure proper streak calculation
        return allDailyProgress.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    async getStreakSummary() {
        if (this.storage.loadStreakSummary) {
            return await this.storage.loadStreakSummary();
        }
        return null;
    }

    async saveCurrentWeekToHistory() {
        const weekId = this.calculationService.getWeekId(this.state.weekStartDate);
        const weekData = {
            weekId: weekId,
            weekStart: this.state.weekStartDate.toISOString(),
            weekEnd: this.state.weekEndDate.toISOString(),
            finalMerges: this.state.currentMerges,
            targetGoal: this.state.targetGoal,
            mergeRatePer10Min: this.state.mergeRatePer10Min,
            completed: this.state.currentMerges >= this.state.targetGoal,
            achievementRate: (this.state.currentMerges / this.state.targetGoal) * 100,
            dailyProgress: this.calculationService.calculateDailyProgress(
                this.state.currentMerges,
                this.state.weekStartDate,
                this.state.dailyHistory
            ),
            completedAt: new Date().toISOString()
        };

        await this.saveWeeklyHistory(weekData);
        return weekData;
    }

    checkWeekTransition() {
        const now = new Date();
        const timeDiff = this.state.weekEndDate - now;
        
        if (timeDiff <= 0) {
            // Week has ended, save current week to history and calculate new week
            return true;
        }
        
        return false;
    }

    async handleWeekTransition() {
        // Save current week to history
        await this.saveCurrentWeekToHistory();
        
        // Calculate new week bounds
        this.updateWeekBounds();
        
        // Reset current merges for new week
        this.state.currentMerges = 0;
        
        // Save the new state
        await this.saveCurrentProgress();
    }

    // Analytics data getters
    getWeeklyStats() {
        if (this.state.weeklyHistory.length === 0) return null;
        
        const completedWeeks = this.state.weeklyHistory.filter(week => week.completed);
        const averageCompletionRate = this.state.weeklyHistory.reduce((sum, week) => sum + week.achievementRate, 0) / this.state.weeklyHistory.length;
        
        return {
            totalWeeks: this.state.weeklyHistory.length,
            completedWeeks: completedWeeks.length,
            completionRate: (completedWeeks.length / this.state.weeklyHistory.length) * 100,
            averageAchievementRate: averageCompletionRate,
            streak: this.calculateStreak(),
            bestWeek: this.state.weeklyHistory.reduce((best, week) => 
                week.achievementRate > best.achievementRate ? week : best
            )
        };
    }

    calculateStreak() {
        if (this.state.weeklyHistory.length === 0) return 0;
        
        const sortedWeeks = this.state.weeklyHistory.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
        let streak = 0;
        
        for (const week of sortedWeeks) {
            if (week.completed) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    // Sync-related methods
    async saveSyncSetting(key, value) {
        try {
            await this.storage.saveSetting(key, value);
            if (key === 'lastSyncCode') {
                this.state.lastSyncCode = value;
            } else if (key === 'lastSyncTime') {
                this.state.lastSyncTime = value;
            }
        } catch (error) {
            console.error('Error saving sync setting:', error);
        }
    }

    async loadSyncSetting(key) {
        try {
            return await this.storage.loadSetting(key);
        } catch (error) {
            console.error('Error loading sync setting:', error);
            return null;
        }
    }

    async getSyncStatus() {
        try {
            const lastSyncCode = await this.loadSyncSetting('lastSyncCode');
            const lastSyncTime = await this.loadSyncSetting('lastSyncTime');
            
            return {
                hasSync: !!lastSyncCode,
                lastSyncCode: lastSyncCode,
                lastSyncTime: lastSyncTime ? new Date(lastSyncTime) : null
            };
        } catch (error) {
            console.error('Error getting sync status:', error);
            return {
                hasSync: false,
                lastSyncCode: null,
                lastSyncTime: null
            };
        }
    }

    async clearSyncData() {
        try {
            await this.saveSyncSetting('lastSyncCode', null);
            await this.saveSyncSetting('lastSyncTime', null);
            return true;
        } catch (error) {
            console.error('Error clearing sync data:', error);
            return false;
        }
    }

    // Utility methods
    isInitialized() {
        return this.initialized;
    }

    getState() {
        return { ...this.state }; // Return a copy to prevent direct mutation
    }

    // Debug method
    debugState() {
        console.log('DataManager State:', this.state);
    }
}

// Export for use in other modules
window.DataManager = DataManager;