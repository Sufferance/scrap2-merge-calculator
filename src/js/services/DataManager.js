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
            
            // Update week bounds if needed
            this.updateWeekBounds();
            
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
        // record the baseline and start tracking increments going forward
        if (this.state.currentMerges > 0 && (!this.state.dailyHistory[weekId] || Object.keys(this.state.dailyHistory[weekId]).length === 0)) {
            if (!this.state.dailyHistory[weekId]) {
                this.state.dailyHistory[weekId] = {};
            }
            
            // Create a special marker to indicate we have a baseline but no daily breakdown
            // This prevents the system from trying to assign all merges to today
            this.state.dailyHistory[weekId]['_baseline'] = this.state.currentMerges;
            this.state.dailyHistory[weekId]['_baselineDate'] = new Date().toISOString();
            
            // Don't assign any merges to specific days - let future updates be tracked properly
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
            await this.storage.saveWeeklyHistory(weekData);
            
            // Update local state
            const existingIndex = this.state.weeklyHistory.findIndex(w => w.weekId === weekData.weekId);
            if (existingIndex >= 0) {
                this.state.weeklyHistory[existingIndex] = weekData;
            } else {
                this.state.weeklyHistory.push(weekData);
            }
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
    forceSetCurrentMerges(value) {
        this.state.currentMerges = Math.max(0, parseInt(value) || 0);
        this.updateCurrentDayTotal();
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
            this.updateCurrentDayTotal();
            
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
            await this.loadAllData();
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

    getDailyProgress() {
        return this.calculationService.calculateDailyProgress(
            this.state.currentMerges,
            this.state.weekStartDate,
            this.state.dailyHistory
        );
    }

    // State setters
    setCurrentMerges(value) {
        const newValue = Math.max(0, parseInt(value) || 0);
        const increment = newValue - this.state.currentMerges;
        
        // Update the current merge count
        this.state.currentMerges = newValue;
        
        // Always update current day total for real-time chart updates
        this.updateCurrentDayTotal();
        
        // Only return increment if value increased (for tracking purposes)
        if (increment > 0) {
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

    addMerges(amount) {
        this.state.currentMerges = Math.max(0, this.state.currentMerges + amount);
        this.updateCurrentDayTotal();
    }

    updateCurrentDayTotal() {
        const currentDayResult = this.calculationService.calculateCurrentDayTotal(
            this.state.currentMerges,
            this.state.weekStartDate,
            this.state.dailyHistory
        );
        
        if (!this.state.dailyHistory[currentDayResult.weekId]) {
            this.state.dailyHistory[currentDayResult.weekId] = {};
        }
        
        this.state.dailyHistory[currentDayResult.weekId][currentDayResult.today] = currentDayResult.todaysMerges;
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