// Main application controller - orchestrates all services
class AppController {
    constructor() {
        this.services = {
            calculation: new CalculationService(),
            display: new DisplayManager(),
            data: new DataManager(window.StorageManager)
        };
        
        this.countdownTimer = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize data manager
            await this.services.data.initialize();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start countdown timer
            this.startCountdownTimer();
            
            // Initial UI update
            this.updateUI();
            
            // Load and display data
            await this.loadAndDisplayData();
            
            this.isInitialized = true;
            console.log('ScrapCalculator initialized successfully');
        } catch (error) {
            console.error('Error initializing ScrapCalculator:', error);
        }
    }

    setupEventListeners() {
        // Input field listeners
        this.services.display.elements.currentMerges?.addEventListener('input', (e) => {
            this.handleMergeInput(e);
        });

        this.services.display.elements.mergeRate?.addEventListener('input', (e) => {
            this.handleRateInput(e);
        });

        this.services.display.elements.targetGoal?.addEventListener('input', (e) => {
            this.handleTargetInput(e);
        });


        // Touch gestures for mobile
        this.setupTouchGestures();
        
        // Collapsible config panel
        this.setupCollapsibleConfig();
        
        // Collapsible sync panel
        this.setupCollapsibleSync();
        
        // Sync functionality
        this.setupSyncListeners();
    }

    handleMergeInput(e) {
        const newValue = parseInt(e.target.value) || 0;
        const increment = this.services.data.setCurrentMerges(newValue);
        
        // Show increment if there was one
        if (increment > 0) {
            this.showMergeIncrement(increment);
        }
        
        this.updateCalculationsAndSave();
    }

    handleRateInput(e) {
        const newValue = parseFloat(e.target.value) || 0;
        this.services.data.setMergeRatePer10Min(newValue);
        this.updateCalculationsAndSave();
    }

    handleTargetInput(e) {
        const newValue = parseInt(e.target.value) || 50000;
        this.services.data.setTargetGoal(newValue);
        this.updateCalculationsAndSave();
    }

    showMergeIncrement(increment) {
        const incrementDisplay = document.getElementById('merge-increment-display');
        if (!incrementDisplay) return;
        
        incrementDisplay.textContent = `+${increment.toLocaleString()} merges`;
        incrementDisplay.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            incrementDisplay.classList.remove('show');
        }, 3000);
    }


    setupTouchGestures() {
        const mergeInput = this.services.display.elements.currentMerges;
        if (!mergeInput) return;

        let startY = 0;
        let isScrolling = false;

        mergeInput.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isScrolling = false;
        });

        mergeInput.addEventListener('touchmove', (e) => {
            if (!isScrolling) {
                const deltaY = e.touches[0].clientY - startY;
                if (Math.abs(deltaY) > 10) {
                    isScrolling = true;
                    if (deltaY > 0) {
                        this.services.data.addMerges(100);
                    } else {
                        this.services.data.addMerges(-100);
                    }
                    
                    // Update input display
                    mergeInput.value = this.services.data.getCurrentMerges();
                    this.services.display.addPulseEffect(mergeInput);
                    
                    this.updateCalculationsAndSave();
                }
            }
        });
    }

    setupCollapsibleConfig() {
        const configToggle = this.services.display.elements.configToggle;
        const configContent = this.services.display.elements.configContent;
        
        if (!configToggle || !configContent) return;

        const toggleArrow = configToggle.querySelector('.toggle-arrow');
        
        // Load saved state (default to expanded)
        const isCollapsed = localStorage.getItem('configCollapsed') === 'true';
        
        if (isCollapsed) {
            configContent.classList.add('collapsed');
            toggleArrow?.classList.add('rotated');
        }
        
        configToggle.addEventListener('click', () => {
            const isCurrentlyCollapsed = configContent.classList.contains('collapsed');
            
            if (isCurrentlyCollapsed) {
                configContent.classList.remove('collapsed');
                toggleArrow?.classList.remove('rotated');
                localStorage.setItem('configCollapsed', 'false');
            } else {
                configContent.classList.add('collapsed');
                toggleArrow?.classList.add('rotated');
                localStorage.setItem('configCollapsed', 'true');
            }
        });
    }

    setupCollapsibleSync() {
        const syncToggle = this.services.display.elements.syncToggle;
        const syncContent = this.services.display.elements.syncContent;
        
        if (!syncToggle || !syncContent) return;

        const toggleArrow = syncToggle.querySelector('.toggle-arrow');
        
        // Load saved state (default to expanded)
        const isCollapsed = localStorage.getItem('syncCollapsed') === 'true';
        
        if (isCollapsed) {
            syncContent.classList.add('collapsed');
            toggleArrow?.classList.add('rotated');
        }
        
        syncToggle.addEventListener('click', () => {
            const isCurrentlyCollapsed = syncContent.classList.contains('collapsed');
            
            if (isCurrentlyCollapsed) {
                syncContent.classList.remove('collapsed');
                toggleArrow?.classList.remove('rotated');
                localStorage.setItem('syncCollapsed', 'false');
            } else {
                syncContent.classList.add('collapsed');
                toggleArrow?.classList.add('rotated');
                localStorage.setItem('syncCollapsed', 'true');
            }
        });
    }

    setupSyncListeners() {
        // Upload data button
        this.services.display.elements.uploadBtn?.addEventListener('click', async () => {
            await this.handleSyncUpload();
        });

        // Download data button
        this.services.display.elements.downloadBtn?.addEventListener('click', async () => {
            await this.handleSyncDownload();
        });

        // Clear sync data button
        this.services.display.elements.clearSyncBtn?.addEventListener('click', async () => {
            await this.handleClearSync();
        });

        // Auto-uppercase sync code input
        this.services.display.elements.syncCodeInput?.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Update sync status on load
        this.updateSyncStatus();
    }

    async handleSyncUpload() {
        const uploadBtn = this.services.display.elements.uploadBtn;
        
        this.services.display.setSyncButtonState('upload', true, 'Uploading...');
        
        try {
            if (!window.syncManager) {
                throw new Error('Sync manager not available');
            }
            
            const result = await window.syncManager.uploadData();
            this.services.display.updateSyncDisplay(result, 'upload');
            
            if (result.success) {
                this.updateSyncStatus();
            }
        } catch (error) {
            this.services.display.updateSyncDisplay({
                success: false,
                error: error.message
            }, 'upload');
        } finally {
            this.services.display.setSyncButtonState('upload', false, 'Generate Sync Code');
        }
    }

    async handleSyncDownload() {
        const syncCodeInput = this.services.display.elements.syncCodeInput;
        const syncCode = syncCodeInput?.value.trim().toUpperCase();
        
        if (!syncCode) {
            this.services.display.updateSyncDisplay({
                success: false,
                error: 'Please enter a sync code'
            }, 'download');
            return;
        }
        
        if (!window.syncManager?.validateSyncCode(syncCode)) {
            this.services.display.updateSyncDisplay({
                success: false,
                error: 'Invalid sync code format'
            }, 'download');
            return;
        }
        
        this.services.display.setSyncButtonState('download', true, 'Downloading...');
        
        try {
            const result = await window.syncManager.downloadData(syncCode);
            this.services.display.updateSyncDisplay(result, 'download');
            
            if (result.success) {
                // Reload data and update UI
                await this.services.data.loadAllData();
                this.updateUI();
                this.updateSyncStatus();
                
                // Clear input
                this.services.display.clearSyncCodeInput();
            }
        } catch (error) {
            this.services.display.updateSyncDisplay({
                success: false,
                error: error.message
            }, 'download');
        } finally {
            this.services.display.setSyncButtonState('download', false, 'Download Data');
        }
    }

    async handleClearSync() {
        if (!confirm('Are you sure you want to clear sync data? This will remove the connection to your sync code.')) {
            return;
        }
        
        try {
            if (window.syncManager) {
                await window.syncManager.clearSyncData();
                this.updateSyncStatus();
                this.services.display.clearSyncResults();
            }
        } catch (error) {
            console.error('Error clearing sync data:', error);
        }
    }

    async updateSyncStatus() {
        try {
            if (!window.syncManager) return;
            
            const status = await window.syncManager.getSyncStatus();
            this.services.display.updateSyncStatus(status);
        } catch (error) {
            console.error('Error updating sync status:', error);
        }
    }

    startCountdownTimer() {
        // Clear existing timer
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        
        // Update immediately
        this.updateCountdown();
        
        // Set up recurring timer
        this.countdownTimer = setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }

    updateCountdown() {
        const weekEndDate = this.services.data.getWeekEndDate();
        if (!weekEndDate) return;

        const weekActive = this.services.display.updateCountdown(weekEndDate);
        
        if (!weekActive) {
            // Week has ended, handle transition
            this.handleWeekTransition();
        }
    }

    async handleWeekTransition() {
        try {
            await this.services.data.handleWeekTransition();
            this.updateUI();
            this.updateCharts();
        } catch (error) {
            console.error('Error handling week transition:', error);
        }
    }

    updateCalculationsAndSave() {
        this.updateCalculations();
        this.saveData();
        this.updateCharts();
    }

    updateCalculations() {
        const currentMerges = this.services.data.getCurrentMerges();
        const targetGoal = this.services.data.getTargetGoal();
        const mergeRatePer10Min = this.services.data.getMergeRatePer10Min();
        const weekStartDate = this.services.data.getWeekStartDate();
        const weekEndDate = this.services.data.getWeekEndDate();

        // Calculate merge requirements
        const mergeRequirements = this.services.calculation.calculateMergeRequirements(
            currentMerges,
            targetGoal,
            mergeRatePer10Min,
            weekStartDate,
            weekEndDate
        );

        // Calculate pace tracking
        const paceTracking = this.services.calculation.calculatePaceTracking(
            currentMerges,
            mergeRequirements.mergesNeeded,
            weekStartDate,
            mergeRequirements.hoursRemaining
        );

        // Calculate status
        const statusInfo = this.services.calculation.calculateEnhancedStatus(
            currentMerges,
            targetGoal,
            paceTracking.currentPace,
            paceTracking.requiredPace,
            mergeRequirements.hoursRemaining
        );

        // Update progress bar
        this.services.display.updateProgressBar(currentMerges, targetGoal);

        // Update results display
        this.services.display.updateResultsDisplay({
            mergesNeeded: mergeRequirements.mergesNeeded,
            hoursRequired: mergeRequirements.hoursRequired,
            averageHoursPerDay: mergeRequirements.averageHoursPerDay,
            currentPace: paceTracking.currentPace,
            requiredPace: paceTracking.requiredPace,
            statusInfo: statusInfo
        });

        // Update predictive finish time
        const predictiveResult = this.services.calculation.calculatePredictiveFinishTime(
            mergeRequirements.mergesNeeded,
            paceTracking.currentPace,
            weekEndDate
        );
        this.services.display.updatePredictiveFinishTime(predictiveResult);
    }

    async saveData() {
        try {
            await this.services.data.saveCurrentProgress();
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    async loadAndDisplayData() {
        try {
            // Update input values
            this.services.display.updateInputValues(
                this.services.data.getCurrentMerges(),
                this.services.data.getMergeRatePer10Min(),
                this.services.data.getTargetGoal()
            );

            // Update calculations
            this.updateCalculations();

            // Update history display
            this.services.display.updateHistoryDisplay(this.services.data.getWeeklyHistory());

            // Update analytics display
            this.displayAnalytics();

            // Update charts
            this.updateCharts();
        } catch (error) {
            console.error('Error loading and displaying data:', error);
        }
    }

    updateUI() {
        // Update week display
        this.services.display.updateWeekDisplay(
            this.services.data.getWeekStartDate(),
            this.services.data.getWeekEndDate()
        );

        // Update countdown
        this.updateCountdown();

        // Update calculations
        this.updateCalculations();

        // Update input values
        this.services.display.updateInputValues(
            this.services.data.getCurrentMerges(),
            this.services.data.getMergeRatePer10Min(),
            this.services.data.getTargetGoal()
        );
    }

    displayAnalytics() {
        const analytics = this.getAdvancedAnalytics();
        this.services.display.updateAnalyticsDisplay(analytics);
    }

    getAdvancedAnalytics() {
        const stats = this.services.data.getWeeklyStats();
        if (!stats) return null;

        const analytics = {
            ...stats,
            efficiency: this.calculateEfficiency(),
            predictions: this.generatePredictions(),
            recommendations: this.generateRecommendations(),
            insights: this.generateInsights()
        };

        return analytics;
    }

    calculateEfficiency() {
        const weeklyHistory = this.services.data.getWeeklyHistory();
        if (weeklyHistory.length === 0) return null;

        const totalMerges = weeklyHistory.reduce((sum, week) => sum + week.finalMerges, 0);
        const totalTargets = weeklyHistory.reduce((sum, week) => sum + week.targetGoal, 0);
        const averageRate = weeklyHistory.reduce((sum, week) => sum + week.mergeRatePer10Min, 0) / weeklyHistory.length;

        return {
            overallEfficiency: (totalMerges / totalTargets) * 100,
            averageRate: averageRate,
            bestRate: Math.max(...weeklyHistory.map(w => w.mergeRatePer10Min)),
            worstRate: Math.min(...weeklyHistory.map(w => w.mergeRatePer10Min)),
            rateConsistency: this.calculateRateConsistency()
        };
    }

    calculateRateConsistency() {
        const weeklyHistory = this.services.data.getWeeklyHistory();
        if (weeklyHistory.length < 2) return 100;

        const rates = weeklyHistory.map(w => w.mergeRatePer10Min);
        const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
        const stdDev = Math.sqrt(variance);
        
        // Convert to consistency percentage (lower std dev = higher consistency)
        const consistency = Math.max(0, 100 - (stdDev / mean) * 100);
        return consistency;
    }

    generatePredictions() {
        const weeklyHistory = this.services.data.getWeeklyHistory();
        if (weeklyHistory.length < 2) return null;

        const recentWeeks = weeklyHistory.slice(-4); // Last 4 weeks
        const trend = this.calculateTrend(recentWeeks);
        
        const currentMerges = this.services.data.getCurrentMerges();
        const targetGoal = this.services.data.getTargetGoal();
        const weekStartDate = this.services.data.getWeekStartDate();
        const weekEndDate = this.services.data.getWeekEndDate();
        
        const currentWeekProgress = currentMerges / targetGoal;
        const timeProgress = (new Date() - weekStartDate) / (weekEndDate - weekStartDate);
        
        const projectedFinalMerges = currentMerges + (currentMerges / timeProgress) * (1 - timeProgress);
        const completionProbability = this.calculateCompletionProbability(projectedFinalMerges);

        return {
            projectedFinalMerges: Math.round(projectedFinalMerges),
            completionProbability: completionProbability,
            trend: trend,
            recommendedDailyTarget: this.calculateRecommendedDailyTarget(),
            estimatedCompletionDate: this.estimateCompletionDate()
        };
    }

    calculateTrend(weeks) {
        if (weeks.length < 2) return 'stable';
        
        const improvements = weeks.slice(1).map((week, index) => 
            week.achievementRate - weeks[index].achievementRate
        );
        
        const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
        
        if (avgImprovement > 5) return 'improving';
        if (avgImprovement < -5) return 'declining';
        return 'stable';
    }

    calculateCompletionProbability(projectedMerges) {
        const targetGoal = this.services.data.getTargetGoal();
        const ratio = projectedMerges / targetGoal;
        if (ratio >= 1.1) return 95;
        if (ratio >= 1.05) return 85;
        if (ratio >= 1.0) return 75;
        if (ratio >= 0.95) return 60;
        if (ratio >= 0.9) return 45;
        if (ratio >= 0.8) return 30;
        return 15;
    }

    calculateRecommendedDailyTarget() {
        const now = new Date();
        const weekEndDate = this.services.data.getWeekEndDate();
        const timeRemaining = weekEndDate - now;
        const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
        const mergesRemaining = Math.max(0, this.services.data.getTargetGoal() - this.services.data.getCurrentMerges());
        
        return Math.ceil(mergesRemaining / Math.max(1, daysRemaining));
    }

    estimateCompletionDate() {
        const currentMerges = this.services.data.getCurrentMerges();
        const targetGoal = this.services.data.getTargetGoal();
        const mergeRatePer10Min = this.services.data.getMergeRatePer10Min();
        
        if (currentMerges >= targetGoal) return new Date();
        
        const mergesRemaining = targetGoal - currentMerges;
        const currentRate = mergeRatePer10Min * 6; // per hour
        const hoursNeeded = mergesRemaining / currentRate;
        
        return new Date(Date.now() + hoursNeeded * 60 * 60 * 1000);
    }

    generateRecommendations() {
        const recommendations = [];
        const stats = this.services.data.getWeeklyStats();
        
        if (!stats) return recommendations;

        // Consistency recommendations
        if (stats.completionRate < 50) {
            recommendations.push({
                type: 'goal_adjustment',
                priority: 'high',
                message: 'Consider lowering your weekly goal to improve consistency',
                action: 'Reduce target by 20%'
            });
        }

        // Rate recommendations
        const currentMerges = this.services.data.getCurrentMerges();
        const targetGoal = this.services.data.getTargetGoal();
        const weekStartDate = this.services.data.getWeekStartDate();
        const weekEndDate = this.services.data.getWeekEndDate();
        
        const currentPace = currentMerges / ((new Date() - weekStartDate) / (1000 * 60 * 60));
        const requiredPace = (targetGoal - currentMerges) / ((weekEndDate - new Date()) / (1000 * 60 * 60));
        
        if (currentPace < requiredPace * 0.8) {
            recommendations.push({
                type: 'increase_effort',
                priority: 'high',
                message: 'You need to increase your merge rate to reach this week\'s goal',
                action: 'Play 2+ hours today'
            });
        }

        // Streak recommendations
        if (stats.streak > 0) {
            recommendations.push({
                type: 'maintain_streak',
                priority: 'medium',
                message: `Great job! You're on a ${stats.streak}-week streak`,
                action: 'Keep the momentum going'
            });
        }

        return recommendations;
    }

    generateInsights() {
        const insights = [];
        const stats = this.services.data.getWeeklyStats();
        
        if (!stats) return insights;

        // Performance insights
        if (stats.averageAchievementRate > 100) {
            insights.push('You consistently exceed your goals! Consider setting higher targets.');
        }

        if (stats.completionRate > 80) {
            insights.push('You have excellent consistency in reaching your goals.');
        }

        // Timing insights
        const now = new Date();
        const weekStartDate = this.services.data.getWeekStartDate();
        const weekEndDate = this.services.data.getWeekEndDate();
        const currentMerges = this.services.data.getCurrentMerges();
        const targetGoal = this.services.data.getTargetGoal();
        
        const weekProgress = (now - weekStartDate) / (weekEndDate - weekStartDate);
        const goalProgress = currentMerges / targetGoal;
        
        if (goalProgress > weekProgress * 1.2) {
            insights.push('You\'re ahead of schedule this week! Great pace.');
        } else if (goalProgress < weekProgress * 0.8) {
            insights.push('You\'re behind schedule. Consider increasing your daily play time.');
        }

        return insights;
    }

    updateCharts() {
        // Update charts if available
        setTimeout(() => {
            if (window.progressCharts) {
                window.progressCharts.updateCharts();
            }
        }, 100);
    }

    // Public methods for external access
    async clearData() {
        await this.services.data.clearAllData();
        this.updateUI();
        this.updateCharts();
    }

    async exportData() {
        return await this.services.data.exportData();
    }

    // Debug methods
    debugState() {
        console.log('AppController Services:', this.services);
        this.services.data.debugState();
    }

    getServices() {
        return this.services;
    }
}

// Export for use in other modules
window.AppController = AppController;