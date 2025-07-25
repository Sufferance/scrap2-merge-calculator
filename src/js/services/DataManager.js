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
        
        
        // Achievement timing and debouncing
        this.achievementDebounceTimer = null;
        this.achievementDebounceDelay = 100; // 100ms debounce
        
        // Data consistency monitoring
        this.lastDataCheck = null;
        this.dataCheckInterval = 5 * 60 * 1000; // 5 minutes
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.storage.initialize();
            await this.loadAllData();
            
            // Start periodic data consistency monitoring
            this.startDataConsistencyMonitoring();
            
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
            
            // Validate and repair data consistency
            await this.validateAndRepairData();
            
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
        
        // Migrate all legacy number format entries to new object format
        this.migrateDailyHistoryFormat();
        
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
            
            // Store in new standardized format
            const dailyTarget = Math.ceil(this.state.targetGoal / 7);
            this.state.dailyHistory[weekId][currentDayResult.today] = {
                date: currentDayResult.today,
                merges: this.state.currentMerges, // Daily merges (in migration case, all merges are for today)
                mergeTotal: this.state.currentMerges, // Backward compatibility
                goalTarget: this.state.targetGoal,
                dailyTarget: dailyTarget,
                achievedTarget: this.state.currentMerges >= dailyTarget,
                lastUpdated: Date.now(),
                migrated: true
            };
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

    // Data migration and normalization methods
    migrateDailyHistoryFormat() {
        let migrationPerformed = false;
        
        for (const weekId in this.state.dailyHistory) {
            const weekData = this.state.dailyHistory[weekId];
            
            for (const dateStr in weekData) {
                const dayData = weekData[dateStr];
                
                // Convert legacy number format to standardized object format
                if (typeof dayData === 'number') {
                    const dailyTarget = Math.ceil(this.state.targetGoal / 7);
                    this.state.dailyHistory[weekId][dateStr] = {
                        date: dateStr,
                        merges: dayData, // In legacy format, this was cumulative, but treat as daily for consistency
                        mergeTotal: dayData, // Backward compatibility
                        goalTarget: this.state.targetGoal,
                        dailyTarget: dailyTarget,
                        achievedTarget: dayData >= dailyTarget,
                        lastUpdated: Date.now(),
                        migrated: true
                    };
                    migrationPerformed = true;
                } else if (dayData && typeof dayData === 'object') {
                    // Ensure all object entries have required fields and fix achievement flags
                    const dailyTarget = dayData.dailyTarget || Math.ceil((dayData.goalTarget || this.state.targetGoal) / 7);
                    const merges = dayData.merges || dayData.mergeTotal || 0;
                    const correctAchievement = merges >= dailyTarget;
                    
                    // Check if we need to fix the achievement flag
                    const needsAchievementFix = dayData.achievedTarget !== correctAchievement;
                    
                    this.state.dailyHistory[weekId][dateStr] = {
                        ...dayData, // Preserve other fields first
                        date: dateStr,
                        merges: merges,
                        mergeTotal: dayData.mergeTotal || merges, // Backward compatibility
                        goalTarget: dayData.goalTarget || this.state.targetGoal,
                        dailyTarget: dailyTarget,
                        achievedTarget: correctAchievement, // Always use calculated value (overrides spread)
                        lastUpdated: dayData.lastUpdated || Date.now()
                    };
                    
                    if (needsAchievementFix || !dayData.date) {
                        migrationPerformed = true;
                    }
                }
            }
        }
        
        if (migrationPerformed) {
            console.info('DataManager: Legacy data migration completed');
        }
    }

    normalizeDailyDataEntry(dateStr, dayData, weekId) {
        if (!dayData) {
            console.warn(`DataManager: Invalid day data for ${dateStr}:`, dayData);
            return null;
        }
        
        // Handle legacy number format
        if (typeof dayData === 'number') {
            const dailyTarget = Math.ceil(this.state.targetGoal / 7);
            return {
                date: dateStr,
                merges: dayData,
                goalTarget: this.state.targetGoal,
                dailyTarget: dailyTarget,
                achievedTarget: dayData >= dailyTarget
            };
        }
        
        // Handle object format
        if (dayData && typeof dayData === 'object') {
            const goalTarget = dayData.goalTarget || this.state.targetGoal;
            const dailyTarget = dayData.dailyTarget || Math.ceil(goalTarget / 7);
            const merges = dayData.merges || dayData.mergeTotal || 0;
            
            return {
                date: dateStr,
                merges: merges,
                goalTarget: goalTarget,
                dailyTarget: dailyTarget,
                achievedTarget: dayData.achievedTarget !== undefined ? 
                    dayData.achievedTarget : 
                    (merges >= dailyTarget)
            };
        }
        
        console.warn(`DataManager: Unrecognized data format for ${dateStr}:`, dayData);
        return null;
    }

    /**
     * Validates date format for both current and legacy formats
     * 
     * Date Format Standards:
     * - Current: Date.toDateString() format - "Mon Jan 13 2025" 
     *   Used by CalculationService for generating daily history keys
     * - Legacy: ISO date format - "2025-01-13"
     *   Supported for backward compatibility with older data
     * 
     * @param {string} dateStr - Date string to validate
     * @returns {boolean} - True if date format is valid
     */
    isValidDateFormat(dateStr) {
        if (typeof dateStr !== 'string') return false;
        
        // Current format: Date.toDateString() - "Mon Jan 13 2025"
        const toDateStringPattern = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2} \d{4}$/;
        
        // Legacy format: YYYY-MM-DD
        const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
        
        // Check if matches either format
        if (toDateStringPattern.test(dateStr) || isoDatePattern.test(dateStr)) {
            // Additional validation: ensure the date can be parsed
            const parsedDate = new Date(dateStr);
            return !isNaN(parsedDate.getTime());
        }
        
        return false;
    }

    validateDailyHistoryStructure() {
        const errors = [];
        const warnings = [];
        const stats = {
            totalEntries: 0,
            legacyFormat: 0,
            validObjects: 0,
            corruptedEntries: 0,
            missingFields: 0,
            inconsistentAchievements: 0,
            toDateStringFormat: 0,
            isoDateFormat: 0,
            mixedFormatWeeks: 0
        };
        
        for (const weekId in this.state.dailyHistory) {
            const weekData = this.state.dailyHistory[weekId];
            
            // Validate weekId format
            if (!weekId.match(/^\d{4}-W\d{2}$/)) {
                warnings.push(`Invalid weekId format: ${weekId}`);
            }
            
            // Track date format consistency within each week
            const weekDateFormats = new Set();
            
            for (const dateStr in weekData) {
                stats.totalEntries++;
                const dayData = weekData[dateStr];
                
                // Validate date format (supports both YYYY-MM-DD and Date.toDateString() format)
                if (!this.isValidDateFormat(dateStr)) {
                    errors.push(`Invalid date format for ${dateStr}`);
                    continue;
                }
                
                // Track date format type for consistency monitoring
                const isToDateString = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2} \d{4}$/.test(dateStr);
                const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
                
                if (isToDateString) {
                    stats.toDateStringFormat++;
                    weekDateFormats.add('toDateString');
                } else if (isIsoDate) {
                    stats.isoDateFormat++;
                    weekDateFormats.add('isoDate');
                }
                
                // Check for legacy format
                if (typeof dayData === 'number') {
                    stats.legacyFormat++;
                    warnings.push(`Legacy number format found for ${dateStr}: ${dayData}`);
                    continue;
                }
                
                // Validate object format
                if (!dayData || typeof dayData !== 'object') {
                    stats.corruptedEntries++;
                    errors.push(`Invalid data type for ${dateStr}: ${typeof dayData}`);
                    continue;
                }
                
                stats.validObjects++;
                
                // Enhanced field validation
                const requiredFields = ['date', 'merges', 'dailyTarget', 'achievedTarget'];
                const recommendedFields = ['mergeTotal', 'goalTarget', 'lastUpdated'];
                const newFields = ['achievedAt']; // From Task 2.1
                
                for (const field of requiredFields) {
                    if (dayData[field] === undefined) {
                        stats.missingFields++;
                        errors.push(`Missing required field '${field}' for ${dateStr}`);
                    }
                }
                
                for (const field of recommendedFields) {
                    if (dayData[field] === undefined) {
                        warnings.push(`Missing recommended field '${field}' for ${dateStr}`);
                    }
                }
                
                // Data consistency checks
                if (dayData.date && dayData.date !== dateStr) {
                    errors.push(`Date field mismatch for ${dateStr}: stored as ${dayData.date}`);
                }
                
                // Achievement flag consistency
                if (typeof dayData.merges === 'number' && typeof dayData.dailyTarget === 'number') {
                    const expectedAchievement = dayData.merges >= dayData.dailyTarget;
                    if (dayData.achievedTarget !== expectedAchievement) {
                        stats.inconsistentAchievements++;
                        warnings.push(`Achievement flag inconsistency for ${dateStr}: ${dayData.achievedTarget} should be ${expectedAchievement}`);
                    }
                }
                
                // Validate numeric fields
                if (typeof dayData.merges === 'number' && (dayData.merges < 0 || !Number.isFinite(dayData.merges))) {
                    errors.push(`Invalid merge count for ${dateStr}: ${dayData.merges}`);
                }
                
                if (typeof dayData.dailyTarget === 'number' && (dayData.dailyTarget <= 0 || !Number.isFinite(dayData.dailyTarget))) {
                    errors.push(`Invalid daily target for ${dateStr}: ${dayData.dailyTarget}`);
                }
                
                // Validate timestamp fields
                if (dayData.lastUpdated && (typeof dayData.lastUpdated !== 'number' || dayData.lastUpdated <= 0)) {
                    warnings.push(`Invalid lastUpdated timestamp for ${dateStr}: ${dayData.lastUpdated}`);
                }
                
                if (dayData.achievedAt && (typeof dayData.achievedAt !== 'number' || dayData.achievedAt <= 0)) {
                    warnings.push(`Invalid achievedAt timestamp for ${dateStr}: ${dayData.achievedAt}`);
                }
            }
            
            // Check for mixed date formats within the same week
            if (weekDateFormats.size > 1) {
                stats.mixedFormatWeeks++;
                warnings.push(`Mixed date formats detected in week ${weekId}: ${Array.from(weekDateFormats).join(', ')}`);
            }
        }
        
        console.log('DataManager: Validation completed:', stats);
        return { errors, warnings, stats };
    }

    async validateAndRepairData() {
        const validation = this.validateDailyHistoryStructure();
        
        if (validation.errors.length > 0) {
            console.warn('DataManager: Data validation errors found:', validation.errors);
        }
        
        if (validation.warnings.length > 0) {
            console.info('DataManager: Data validation warnings:', validation.warnings);
        }
        
        // Report validation statistics
        if (validation.stats) {
            console.log('DataManager: Data quality report:', {
                totalEntries: validation.stats.totalEntries,
                legacyFormat: validation.stats.legacyFormat,
                validObjects: validation.stats.validObjects,
                issues: validation.stats.corruptedEntries + validation.stats.missingFields + validation.stats.inconsistentAchievements
            });
        }
        
        // Enhanced auto-repair with better error handling
        let repairsMade = false;
        const repairedEntries = [];
        const failedRepairs = [];
        
        for (const weekId in this.state.dailyHistory) {
            const weekData = this.state.dailyHistory[weekId];
            
            for (const dateStr in weekData) {
                const dayData = weekData[dateStr];
                
                try {
                    // Repair corrupted or invalid entries
                    if (!dayData || (typeof dayData !== 'object' && typeof dayData !== 'number')) {
                        console.warn(`DataManager: Removing corrupted entry for ${dateStr}`);
                        delete this.state.dailyHistory[weekId][dateStr];
                        failedRepairs.push({ dateStr, reason: 'corrupted_data', original: dayData });
                        repairsMade = true;
                        continue;
                    }
                    
                    // Skip legacy number format (handled by migration)
                    if (typeof dayData === 'number') {
                        continue;
                    }
                    
                    // Repair missing required fields
                    if (!dayData.date) {
                        dayData.date = dateStr;
                        repairsMade = true;
                        repairedEntries.push({ dateStr, field: 'date', value: dateStr });
                    }
                    
                    if (dayData.lastUpdated === undefined) {
                        dayData.lastUpdated = Date.now();
                        repairsMade = true;
                        repairedEntries.push({ dateStr, field: 'lastUpdated', value: 'current_timestamp' });
                    }
                    
                    // Repair achievement flags based on current data
                    if (dayData.merges !== undefined && dayData.dailyTarget !== undefined) {
                        const expectedAchievement = dayData.merges >= dayData.dailyTarget;
                        
                        if (dayData.achievedTarget !== expectedAchievement) {
                            console.info(`DataManager: Repairing achievement flag for ${dateStr}: ${dayData.achievedTarget} -> ${expectedAchievement}`);
                            dayData.achievedTarget = expectedAchievement;
                            repairsMade = true;
                            repairedEntries.push({ dateStr, field: 'achievedTarget', oldValue: dayData.achievedTarget, newValue: expectedAchievement });
                        }
                    }
                    
                    // Ensure date field consistency
                    if (dayData.date && dayData.date !== dateStr) {
                        console.info(`DataManager: Repairing date field for ${dateStr}: ${dayData.date} -> ${dateStr}`);
                        dayData.date = dateStr;
                        repairsMade = true;
                        repairedEntries.push({ dateStr, field: 'date', oldValue: dayData.date, newValue: dateStr });
                    }
                    
                    // Validate and fix numeric fields
                    if (typeof dayData.merges === 'number' && (dayData.merges < 0 || !Number.isFinite(dayData.merges))) {
                        console.warn(`DataManager: Fixing invalid merge count for ${dateStr}: ${dayData.merges} -> 0`);
                        dayData.merges = 0;
                        repairsMade = true;
                        repairedEntries.push({ dateStr, field: 'merges', oldValue: dayData.merges, newValue: 0 });
                    }
                    
                    if (typeof dayData.dailyTarget === 'number' && (dayData.dailyTarget <= 0 || !Number.isFinite(dayData.dailyTarget))) {
                        const defaultTarget = Math.ceil((dayData.goalTarget || this.state.targetGoal) / 7);
                        console.warn(`DataManager: Fixing invalid daily target for ${dateStr}: ${dayData.dailyTarget} -> ${defaultTarget}`);
                        dayData.dailyTarget = defaultTarget;
                        repairsMade = true;
                        repairedEntries.push({ dateStr, field: 'dailyTarget', oldValue: dayData.dailyTarget, newValue: defaultTarget });
                    }
                    
                } catch (error) {
                    console.error(`DataManager: Error repairing data for ${dateStr}:`, error);
                    failedRepairs.push({ dateStr, reason: 'repair_error', error: error.message });
                }
            }
        }
        
        // Report repair results
        if (repairsMade) {
            console.info('DataManager: Data consistency repairs completed, saving...', {
                repairedEntries: repairedEntries.length,
                failedRepairs: failedRepairs.length
            });
            
            if (repairedEntries.length > 0) {
                console.log('DataManager: Successfully repaired:', repairedEntries);
            }
            
            if (failedRepairs.length > 0) {
                console.warn('DataManager: Failed repairs:', failedRepairs);
            }
            
            await this.saveCurrentProgress();
        }
        
        // Return enhanced validation results
        return {
            ...validation,
            repairResults: {
                repairsMade,
                repairedEntries,
                failedRepairs
            }
        };
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
        
        // Check for immediate achievement detection
        const dailyTarget = Math.ceil(this.state.targetGoal / 7);
        const achievedTarget = currentDayResult.todaysMerges >= dailyTarget;
        const existingEntry = this.state.dailyHistory[currentDayResult.weekId][currentDayResult.today];
        
        // Track if this is a new achievement (just reached target)
        let justAchieved = false;
        if (typeof existingEntry === 'object' && existingEntry.achievedTarget !== undefined) {
            justAchieved = !existingEntry.achievedTarget && achievedTarget;
        } else {
            justAchieved = achievedTarget; // First time tracking this day
        }
        
        // Only update if the merge count has actually changed from what's stored
        const existingTotal = typeof existingEntry === 'object' ? existingEntry.mergeTotal : existingEntry;
        if (existingTotal === undefined || this.state.currentMerges !== existingTotal) {
            // Store cumulative total instead of daily increment
            this.state.dailyHistory[currentDayResult.weekId][currentDayResult.today] = this.state.currentMerges;
            
            // Update daily history only
            await this.saveCurrentProgress();
        }
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
            bestWeek: this.state.weeklyHistory.reduce((best, week) => 
                week.achievementRate > best.achievementRate ? week : best
            )
        };
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


    // Periodic data consistency monitoring
    startDataConsistencyMonitoring() {
        // Perform initial check
        this.checkDataConsistency();
        
        // Set up periodic checks
        setInterval(() => {
            this.checkDataConsistency();
        }, this.dataCheckInterval);
    }
    
    async checkDataConsistency() {
        const now = Date.now();
        
        // Skip if checked recently
        if (this.lastDataCheck && (now - this.lastDataCheck) < this.dataCheckInterval) {
            return;
        }
        
        this.lastDataCheck = now;
        
        try {
            console.log('DataManager: Performing periodic data consistency check...');
            const validation = this.validateDailyHistoryStructure();
            
            // Report any new issues
            if (validation.errors.length > 0) {
                console.warn('DataManager: Data consistency issues detected:', validation.errors);
            }
            
            // Perform light repairs if needed
            if (validation.warnings.length > 0 || validation.errors.length > 0) {
                console.info('DataManager: Running light data repair...');
                await this.validateAndRepairData();
            }
            
        } catch (error) {
            console.error('DataManager: Error during data consistency check:', error);
        }
    }
    
    // Migration utilities for data format updates
    async migrateDataFormat(fromVersion, toVersion) {
        console.log(`DataManager: Migrating data format from v${fromVersion} to v${toVersion}`);
        
        try {
            // Perform data format migration based on version
            switch (toVersion) {
                case '2.1':
                    // Add achievedAt timestamps to existing data
                    await this.migrateToVersion21();
                    break;
                default:
                    console.warn(`DataManager: Unknown migration version: ${toVersion}`);
            }
            
            // Save updated data
            await this.saveCurrentProgress();
            console.log(`DataManager: Data migration to v${toVersion} completed`);
            
        } catch (error) {
            console.error(`DataManager: Error migrating data to v${toVersion}:`, error);
            throw error;
        }
    }
    
    async migrateToVersion21() {
        // Add achievedAt timestamps for existing achieved targets
        for (const weekId in this.state.dailyHistory) {
            const weekData = this.state.dailyHistory[weekId];
            
            for (const dateStr in weekData) {
                const dayData = weekData[dateStr];
                
                if (dayData && typeof dayData === 'object' && dayData.achievedTarget && !dayData.achievedAt) {
                    // Use lastUpdated timestamp if available, otherwise current time
                    dayData.achievedAt = dayData.lastUpdated || Date.now();
                    console.log(`DataManager: Added achievedAt timestamp for ${dateStr}`);
                }
            }
        }
    }

    // Debug method
    debugState() {
    }
}

// Export for use in other modules
window.DataManager = DataManager;