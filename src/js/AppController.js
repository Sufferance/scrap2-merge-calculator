// Main application controller - orchestrates all services
class AppController {
    constructor() {
        this.services = {
            calculation: new CalculationService(),
            display: new DisplayManager(),
            data: new DataManager(window.StorageManager),
            analytics: null
        };
        
        this.countdownTimer = null;
        this.isInitialized = false;
        // Race condition prevention
        this.updateInProgress = false;
        this.pendingUpdates = new Set();
        
        // Enhanced UI state management
        this.uiUpdateQueue = [];
        this.processingUIQueue = false;
        this.loadingStates = new Map();
        this.errorStates = new Map();
        
        // Debounce timers
        this.inputDebounceTimers = new Map();
        
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
            
            this.isInitialized = true;
            console.log('ScrapCalculator initialized successfully');
        } catch (error) {
            console.error('Error initializing ScrapCalculator:', error);
        }
    }

    setupEventListeners() {
        // Input field listeners
        const currentMergesElement = this.services.display.elements.currentMerges;
        
        if (currentMergesElement) {
            currentMergesElement.addEventListener('input', (e) => {
                this.handleMergeInput(e);
            });
        }

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
        const inputId = 'merge';
        
        // Clear existing debounce timer
        if (this.inputDebounceTimers.has(inputId)) {
            clearTimeout(this.inputDebounceTimers.get(inputId));
        }
        
        // Debounce rapid input changes
        this.inputDebounceTimers.set(inputId, setTimeout(async () => {
            await this.processInputChange(inputId, e, async () => {
                const newValue = parseInt(e.target.value) || 0;
                const increment = await this.services.data.setCurrentMerges(newValue);
                
                // Show increment if there was one
                if (increment > 0) {
                    this.showMergeIncrement(increment);
                }
                
                return { success: true, increment };
            });
        }, 150)); // 150ms debounce for better responsiveness
    }

    async handleRateInput(e) {
        const inputId = 'rate';
        
        // Clear existing debounce timer
        if (this.inputDebounceTimers.has(inputId)) {
            clearTimeout(this.inputDebounceTimers.get(inputId));
        }
        
        // Debounce rapid input changes
        this.inputDebounceTimers.set(inputId, setTimeout(async () => {
            await this.processInputChange(inputId, e, async () => {
                const newValue = parseFloat(e.target.value) || 0;
                this.services.data.setMergeRatePer10Min(newValue);
                return { success: true };
            });
        }, 300)); // Longer debounce for rate changes
    }

    async handleTargetInput(e) {
        const inputId = 'target';
        
        // Clear existing debounce timer
        if (this.inputDebounceTimers.has(inputId)) {
            clearTimeout(this.inputDebounceTimers.get(inputId));
        }
        
        // Debounce rapid input changes
        this.inputDebounceTimers.set(inputId, setTimeout(async () => {
            await this.processInputChange(inputId, e, async () => {
                const newValue = parseInt(e.target.value) || 50000;
                this.services.data.setTargetGoal(newValue);
                return { success: true };
            });
        }, 300)); // Longer debounce for target changes
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
            await this.updateCalculationsAndSave();
            
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
    
    // Enhanced input processing with loading states and error handling
    async processInputChange(inputId, event, processingFunction) {
        // Prevent concurrent processing of the same input
        if (this.updateInProgress) {
            this.pendingUpdates.add(inputId);
            return;
        }
        
        this.updateInProgress = true;
        this.setLoadingState(inputId, true);
        this.clearErrorState(inputId);
        
        try {
            // Execute the input-specific processing
            const result = await processingFunction();
            
            if (result && result.success) {
                // Update calculations and save
                await this.updateCalculationsAndSave();
                
                // Show success feedback if provided
                if (result.feedback) {
                    this.showInputFeedback(inputId, result.feedback, 'success');
                }
            }
            
            // Process any pending updates for this input
            if (this.pendingUpdates.has(inputId)) {
                this.pendingUpdates.delete(inputId);
                // Schedule re-processing with current value
                setTimeout(() => {
                    event.target.dispatchEvent(new Event('input'));
                }, 100);
            }
            
        } catch (error) {
            console.error(`Error processing ${inputId} input:`, error);
            this.setErrorState(inputId, error.message);
            this.showInputFeedback(inputId, 'Error updating value', 'error');
            
        } finally {
            this.setLoadingState(inputId, false);
            this.updateInProgress = false;
        }
    }
    
    // UI state management methods
    setLoadingState(componentId, isLoading) {
        this.loadingStates.set(componentId, isLoading);
        
        // Visual feedback for loading state
        const element = this.getInputElement(componentId);
        if (element) {
            if (isLoading) {
                element.classList.add('loading');
                element.disabled = true;
            } else {
                element.classList.remove('loading');
                element.disabled = false;
            }
        }
    }
    
    setErrorState(componentId, errorMessage) {
        this.errorStates.set(componentId, errorMessage);
        
        // Visual feedback for error state
        const element = this.getInputElement(componentId);
        if (element) {
            element.classList.add('error');
            setTimeout(() => {
                element.classList.remove('error');
            }, 3000);
        }
    }
    
    clearErrorState(componentId) {
        this.errorStates.delete(componentId);
        
        const element = this.getInputElement(componentId);
        if (element) {
            element.classList.remove('error');
        }
    }
    
    getInputElement(inputId) {
        switch (inputId) {
            case 'merge':
                return this.services.display.elements.currentMerges;
            case 'rate':
                return this.services.display.elements.mergeRate;
            case 'target':
                return this.services.display.elements.targetGoal;
            default:
                return null;
        }
    }
    
    showInputFeedback(inputId, message, type = 'info') {
        // Simple feedback system - can be enhanced with toast notifications
        console.log(`${type.toUpperCase()}: ${inputId} - ${message}`);
        
        // You could add visual feedback here, like a tooltip or toast
        // For now, we rely on CSS classes and console logging
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
                    
                    await this.updateCalculationsAndSave();
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

    async updateCalculationsAndSave() {
        // Add this operation to the UI update queue
        return new Promise((resolve, reject) => {
            this.uiUpdateQueue.push(async () => {
                try {
                    // Update calculations (synchronous)
                    this.updateCalculations();
                    
                    // Save data and wait for completion
                    await this.saveData();
                    
                    // Update displays
                    this.updateCharts();
                    
                    resolve();
                    
                } catch (error) {
                    console.error('Error in updateCalculationsAndSave:', error);
                    // Don't throw - ensure UI remains responsive
                    resolve(); // Resolve anyway to prevent blocking
                }
            });
            
            // Process the queue if not already processing
            this.processUIUpdateQueue();
        });
    }
    
    // Process UI updates sequentially to prevent race conditions
    async processUIUpdateQueue() {
        if (this.processingUIQueue) {
            return; // Already processing
        }
        
        this.processingUIQueue = true;
        
        try {
            while (this.uiUpdateQueue.length > 0) {
                const updateFunction = this.uiUpdateQueue.shift();
                try {
                    await updateFunction();
                } catch (error) {
                    console.error('Error processing UI update:', error);
                    // Continue processing other updates
                }
            }
        } finally {
            this.processingUIQueue = false;
        }
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
            throw error; // Re-throw to let caller handle
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

}

// Export for use in other modules
window.AppController = AppController;