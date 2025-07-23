// Main application controller - orchestrates all services
class AppController {
    constructor() {
        this.services = {
            calculation: new CalculationService(),
            display: new DisplayManager(),
            data: new DataManager(window.StorageManager),
            analytics: null,
            streakDisplay: new StreakDisplayComponents()
        };
        
        this.countdownTimer = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize data manager
            await this.services.data.initialize();
            
            // Initialize analytics service with data manager
            this.services.analytics = new AnalyticsService(this.services.data);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start countdown timer
            this.startCountdownTimer();
            
            // Initial UI update
            this.updateUI();
            
            // Load and display data
            await this.loadAndDisplayData();
            
            // Initialize streak displays
            await this.initializeStreakDisplays();
            
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

        // Reset state button
        document.getElementById('reset-state-btn')?.addEventListener('click', () => {
            this.handleResetState();
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

    async handleMergeInput(e) {
        const newValue = parseInt(e.target.value) || 0;
        const increment = await this.services.data.setCurrentMerges(newValue);
        
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

    async handleResetState() {
        const inputElement = this.services.display.elements.currentMerges;
        const inputValue = parseInt(inputElement?.value) || 0;
        
        if (inputValue === 0) {
            alert('Please enter a merge count in the input field first.');
            return;
        }
        
        const confirmMessage = `This will sync your stored merge count to match the input value of ${inputValue.toLocaleString()}. Are you sure?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            // Force set the merge count to match input value
            await this.services.data.forceSetCurrentMerges(inputValue);
            
            // Save the updated state
            await this.services.data.saveCurrentProgress();
            
            // Update the UI to reflect the changes
            this.updateCalculationsAndSave();
            
            alert('Merge count successfully synced!');
        } catch (error) {
            console.error('Error during reset:', error);
            alert('Error syncing merge count. Please try again.');
        }
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

        mergeInput.addEventListener('touchmove', async (e) => {
            if (!isScrolling) {
                const deltaY = e.touches[0].clientY - startY;
                if (Math.abs(deltaY) > 10) {
                    isScrolling = true;
                    if (deltaY > 0) {
                        await this.services.data.addMerges(100);
                    } else {
                        await this.services.data.addMerges(-100);
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
        // Export data button
        this.services.display.elements.exportBtn?.addEventListener('click', async () => {
            await this.handleExportData();
        });

        // Import data button
        this.services.display.elements.importBtn?.addEventListener('click', () => {
            this.services.display.elements.importFileInput?.click();
        });

        // File input change handler
        this.services.display.elements.importFileInput?.addEventListener('change', async (e) => {
            await this.handleImportData(e);
        });
    }

    async handleExportData() {
        const exportBtn = this.services.display.elements.exportBtn;
        const originalText = exportBtn?.textContent;
        
        try {
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.textContent = 'Exporting...';
            }
            
            const data = await this.services.data.exportData();
            
            // Create and download file
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[:]/g, '-');
            const filename = `scraps-calculator-backup-${timestamp}.json`;
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.services.display.updateSyncDisplay({
                success: true,
                message: `Data exported successfully as ${filename}`
            }, 'export');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.services.display.updateSyncDisplay({
                success: false,
                error: error.message
            }, 'export');
        } finally {
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.textContent = originalText;
            }
        }
    }

    async handleImportData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate data structure
            if (!data.version || !data.exportedAt) {
                throw new Error('Invalid backup file format');
            }
            
            // Confirm import
            const confirmMsg = `Import data from ${new Date(data.exportedAt).toLocaleString()}? This will replace your current data.`;
            if (!confirm(confirmMsg)) {
                return;
            }
            
            await this.services.data.importData(data);
            
            // Reload UI
            await this.services.data.loadAllData();
            this.updateUI();
            this.updateCharts();
            
            this.services.display.updateSyncDisplay({
                success: true,
                message: 'Data imported successfully'
            }, 'import');
            
            // Update file name display
            const fileNameSpan = document.getElementById('selected-file');
            if (fileNameSpan) {
                fileNameSpan.textContent = `✓ ${file.name}`;
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            this.services.display.updateSyncDisplay({
                success: false,
                error: error.message
            }, 'import');
        } finally {
            // Clear file input
            event.target.value = '';
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
        this.updateStreakDisplays();
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
        return this.services.analytics.getAdvancedAnalytics();
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

    // Streak Display Integration Methods
    async initializeStreakDisplays() {
        try {
            // Create streak badge in the main interface
            const headerSection = document.querySelector('.progress-display') || 
                                 document.querySelector('.header-section') ||
                                 document.querySelector('#current-progress');
            
            if (headerSection) {
                // Load current streak data
                const streakSummary = await this.services.data.getStreakSummary();
                const currentStreak = streakSummary ? streakSummary.currentStreak : 0;
                
                // Create the streak badge
                this.services.streakDisplay.createCurrentStreakBadge(headerSection, currentStreak);
            }

            // Create streak metrics card in analytics section
            const analyticsSection = document.querySelector('.analytics-section') || 
                                   document.querySelector('#analytics-section') ||
                                   document.querySelector('.metrics-container');
            
            if (analyticsSection) {
                const streakSummary = await this.services.data.getStreakSummary();
                const defaultStreakData = {
                    currentStreak: 0,
                    longestStreak: 0,
                    totalDaysAchieved: 0
                };
                
                const streakData = streakSummary || defaultStreakData;
                this.services.streakDisplay.createStreakMetricsCard(analyticsSection, streakData);
            }

            console.log('Streak displays initialized successfully');
        } catch (error) {
            console.error('Error initializing streak displays:', error);
        }
    }

    async updateStreakDisplays() {
        try {
            // Load latest streak data
            const streakSummary = await this.services.data.getStreakSummary();
            
            if (streakSummary) {
                // Update streak badge
                this.services.streakDisplay.updateStreakBadge(streakSummary.currentStreak);
                
                // Update streak metrics card
                this.services.streakDisplay.updateStreakMetrics(streakSummary);
                
                // Check for milestone celebrations
                this.checkStreakMilestones(streakSummary.currentStreak);
            }
        } catch (error) {
            console.error('Error updating streak displays:', error);
        }
    }

    checkStreakMilestones(currentStreak) {
        // Check for milestone achievements (7, 14, 30, etc.)
        const milestones = [7, 14, 30, 50, 100];
        
        if (milestones.includes(currentStreak)) {
            this.showMilestoneNotification(currentStreak);
        }
    }

    showMilestoneNotification(streakLength) {
        // Create a temporary notification for streak milestones
        const notification = document.createElement('div');
        notification.className = 'streak-milestone-notification';
        notification.innerHTML = `
            <div class="milestone-icon">🎉</div>
            <div class="milestone-text">
                <div class="milestone-title">${streakLength} Day Streak!</div>
                <div class="milestone-message">Amazing consistency! Keep it up!</div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 5000);
    }
}

// Export for use in other modules
window.AppController = AppController;