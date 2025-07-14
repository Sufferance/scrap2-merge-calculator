// Scrap Calculator Main Application,
class ScrapCalculator {
    constructor() {
        this.currentMerges = 0;
        this.mergeRatePer10Min = 0;
        this.targetGoal = 50000;
        this.weekStartDate = null;
        this.weekEndDate = null;
        this.storage = window.StorageManager;
        this.weeklyHistory = [];
        this.dailyHistory = {}; // Store actual daily progress
        
        this.initializeApp();
        this.setupEventListeners();
        this.updateCountdown();
        this.loadData();
    }

    initializeApp() {
        this.calculateWeekBounds();
        this.updateWeekDisplay();
        this.updateCountdown();
        
        // Start countdown timer
        setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }

    setupEventListeners() {
        // Input field listeners
        document.getElementById('current-merges').addEventListener('input', (e) => {
            const newValue = parseInt(e.target.value) || 0;
            const difference = newValue - this.currentMerges;
            this.currentMerges = newValue;
            
            // Update daily progress for any change (up or down)
            this.updateCurrentDayTotal();
            
            this.updateCalculations();
            this.saveData();
            
            // Update charts after data is saved
            if (window.progressCharts) {
                window.progressCharts.updateCharts();
            }
        });

        document.getElementById('merge-rate').addEventListener('input', (e) => {
            this.mergeRatePer10Min = parseFloat(e.target.value) || 0;
            this.updateCalculations();
            this.saveData();
        });

        document.getElementById('target-goal').addEventListener('input', (e) => {
            this.targetGoal = parseInt(e.target.value) || 50000;
            this.updateCalculations();
            this.saveData();
        });

        // Quick add buttons
        document.querySelectorAll('.quick-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseInt(e.target.dataset.amount);
                this.addMerges(amount);
            });
        });

        // Touch gestures for mobile
        this.setupTouchGestures();
        
        // Sync functionality
        this.setupSyncListeners();
    }

    setupTouchGestures() {
        const mergeInput = document.getElementById('current-merges');
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
                        this.addMerges(100);
                    } else {
                        this.addMerges(-100);
                    }
                }
            }
        });
    }

    addMerges(amount) {
        this.currentMerges = Math.max(0, this.currentMerges + amount);
        document.getElementById('current-merges').value = this.currentMerges;
        
        // Update daily progress total
        this.updateCurrentDayTotal();
        
        this.updateCalculations();
        this.saveData();
        
        // Update charts after data is saved
        if (window.progressCharts) {
            window.progressCharts.updateCharts();
        }
        
        // Add visual feedback
        const input = document.getElementById('current-merges');
        input.classList.add('pulse');
        setTimeout(() => input.classList.remove('pulse'), 600);
    }

    calculateWeekBounds() {
        const now = new Date();
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
        
        this.weekStartDate = lastSunday;
        this.weekEndDate = nextSunday;
    }

    updateWeekDisplay() {
        const weekRange = document.getElementById('week-date-range');
        const options = { month: 'short', day: 'numeric' };
        
        const startStr = this.weekStartDate.toLocaleDateString('en-US', options);
        const endStr = this.weekEndDate.toLocaleDateString('en-US', options);
        
        weekRange.textContent = `${startStr} - ${endStr}`;
    }

    updateCountdown() {
        const now = new Date();
        const timeDiff = this.weekEndDate - now;
        
        if (timeDiff <= 0) {
            // Week has ended, save current week to history and calculate new week
            this.saveCurrentWeekToHistory();
            this.calculateWeekBounds();
            this.updateWeekDisplay();
            return;
        }
        
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        const countdownElement = document.getElementById('countdown-timer');
        countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s remaining`;
    }

    updateCalculations() {
        // Core calculation formulas from CLAUDE.md
        const mergeRatePerHour = this.mergeRatePer10Min * 6;
        const mergesNeeded = Math.max(0, this.targetGoal - this.currentMerges);
        const hoursRequired = mergesNeeded / mergeRatePerHour;
        
        // Calculate time remaining
        const now = new Date();
        const timeRemaining = this.weekEndDate - now;
        const hoursRemaining = Math.max(0, timeRemaining / (1000 * 60 * 60));
        const daysRemaining = Math.max(0, timeRemaining / (1000 * 60 * 60 * 24));
        
        const averageHoursPerDay = hoursRequired / Math.max(1, daysRemaining);
        
        // Pace tracking
        const timeSinceWeekStart = now - this.weekStartDate;
        const hoursSinceWeekStart = Math.max(1, timeSinceWeekStart / (1000 * 60 * 60));
        
        const currentPace = this.currentMerges / hoursSinceWeekStart;
        const requiredPace = mergesNeeded / Math.max(1, hoursRemaining);
        const isOnTrack = currentPace >= requiredPace || mergesNeeded <= 0;
        
        // Update UI
        this.updateResultsDisplay({
            mergesNeeded,
            hoursRequired,
            averageHoursPerDay,
            isOnTrack,
            currentPace,
            requiredPace,
            hoursRemaining
        });
    }

    updateResultsDisplay(results) {
        const {
            mergesNeeded,
            hoursRequired,
            averageHoursPerDay,
            isOnTrack,
            currentPace,
            requiredPace,
            hoursRemaining
        } = results;

        // Update progress bar
        const progressPercentage = Math.min(100, (this.currentMerges / this.targetGoal) * 100);
        document.getElementById('progress-fill').style.width = `${progressPercentage}%`;
        document.getElementById('progress-text').textContent = `${progressPercentage.toFixed(1)}%`;

        // Update result cards
        document.getElementById('merges-needed').textContent = mergesNeeded.toLocaleString();
        
        // Format hours
        const hoursText = hoursRequired < 1 ? 
            `${(hoursRequired * 60).toFixed(0)}min` : 
            `${hoursRequired.toFixed(1)}h`;
        document.getElementById('hours-required').textContent = hoursText;
        
        const dailyHoursText = averageHoursPerDay < 1 ? 
            `${(averageHoursPerDay * 60).toFixed(0)}min` : 
            `${averageHoursPerDay.toFixed(1)}h`;
        document.getElementById('hours-per-day').textContent = dailyHoursText;

        // Update status
        const statusElement = document.getElementById('on-track-status');
        statusElement.classList.remove('on-track', 'close', 'behind');
        
        if (mergesNeeded <= 0) {
            statusElement.textContent = 'Goal Reached!';
            statusElement.classList.add('on-track');
        } else if (isOnTrack) {
            statusElement.textContent = 'On Track';
            statusElement.classList.add('on-track');
        } else if (currentPace >= requiredPace * 0.8) {
            statusElement.textContent = 'Close';
            statusElement.classList.add('close');
        } else {
            statusElement.textContent = 'Behind';
            statusElement.classList.add('behind');
        }

        // Update pace displays
        const currentPaceElement = document.getElementById('current-pace');
        const requiredPaceElement = document.getElementById('required-pace');
        
        currentPaceElement.textContent = `Current pace: ${Math.round(currentPace).toLocaleString()}/hr`;
        
        if (mergesNeeded <= 0) {
            requiredPaceElement.textContent = 'Goal achieved!';
        } else {
            requiredPaceElement.textContent = `Required pace: ${Math.round(requiredPace).toLocaleString()}/hr`;
        }

        // Update result card colors based on status
        this.updateCardColors(results);
    }

    updateCardColors(results) {
        const cards = document.querySelectorAll('.result-card');
        
        cards.forEach(card => {
            card.classList.remove('on-track', 'close', 'behind');
            
            if (results.mergesNeeded <= 0) {
                card.classList.add('on-track');
            } else if (results.isOnTrack) {
                card.classList.add('on-track');
            } else if (results.currentPace >= results.requiredPace * 0.8) {
                card.classList.add('close');
            } else {
                card.classList.add('behind');
            }
        });
    }

    async saveData() {
        const data = {
            currentMerges: this.currentMerges,
            mergeRatePer10Min: this.mergeRatePer10Min,
            targetGoal: this.targetGoal,
            weekStartDate: this.weekStartDate?.toISOString(),
            weekEndDate: this.weekEndDate?.toISOString(),
            dailyHistory: this.dailyHistory
        };
        
        try {
            await this.storage.saveCurrentProgress(data);
        } catch (error) {
            console.error('Error saving data:', error);
            // Fallback to localStorage
            localStorage.setItem('scrapCalculatorData', JSON.stringify(data));
        }
    }

    async loadData() {
        try {
            await this.storage.initialize();
            const savedData = await this.storage.loadCurrentProgress();
            const historyData = await this.storage.loadWeeklyHistory();
            
            if (savedData) {
                this.currentMerges = savedData.currentMerges || 0;
                this.mergeRatePer10Min = savedData.mergeRatePer10Min || 0;
                this.targetGoal = savedData.targetGoal || 50000;
                this.dailyHistory = savedData.dailyHistory || {};
                
                // Handle migration from old system - if we have current merges but no daily history
                this.migrateLegacyData();
                
                // Update UI with loaded data
                document.getElementById('current-merges').value = this.currentMerges;
                document.getElementById('merge-rate').value = this.mergeRatePer10Min;
                document.getElementById('target-goal').value = this.targetGoal;
                
                this.updateCalculations();
            }
            
            // Load weekly history
            this.weeklyHistory = historyData || [];
            this.updateHistoryDisplay();
            
            // Update analytics display
            this.displayAnalytics();
            
            // Update charts if available
            setTimeout(() => {
                if (window.progressCharts) {
                    window.progressCharts.updateCharts();
                }
            }, 500);
        } catch (error) {
            console.error('Error loading saved data:', error);
            // Fallback to localStorage
            const fallbackData = localStorage.getItem('scrapCalculatorData');
            if (fallbackData) {
                try {
                    const data = JSON.parse(fallbackData);
                    this.currentMerges = data.currentMerges || 0;
                    this.mergeRatePer10Min = data.mergeRatePer10Min || 0;
                    this.targetGoal = data.targetGoal || 50000;
                    this.dailyHistory = data.dailyHistory || {};
                    
                    // Handle migration from old system
                    this.migrateLegacyData();
                    
                    document.getElementById('current-merges').value = this.currentMerges;
                    document.getElementById('merge-rate').value = this.mergeRatePer10Min;
                    document.getElementById('target-goal').value = this.targetGoal;
                    
                    this.updateCalculations();
                } catch (parseError) {
                    console.error('Error parsing fallback data:', parseError);
                }
            }
        }
    }

    // Method to clear all data
    async clearData() {
        try {
            await this.storage.clearAllData();
        } catch (error) {
            console.error('Error clearing data:', error);
            localStorage.removeItem('scrapCalculatorData');
        }
        
        this.currentMerges = 0;
        this.mergeRatePer10Min = 0;
        this.targetGoal = 50000;
        this.dailyHistory = {};
        
        document.getElementById('current-merges').value = '';
        document.getElementById('merge-rate').value = '';
        document.getElementById('target-goal').value = this.targetGoal;
        
        this.updateCalculations();
    }

    // Method to export data
    async exportData() {
        try {
            const data = await this.storage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scrap-calculator-data.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            // Fallback export
            const data = {
                currentMerges: this.currentMerges,
                mergeRatePer10Min: this.mergeRatePer10Min,
                targetGoal: this.targetGoal,
                weekStartDate: this.weekStartDate?.toISOString(),
                weekEndDate: this.weekEndDate?.toISOString(),
                exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scrap-calculator-data.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    // Weekly history tracking methods
    async saveCurrentWeekToHistory() {
        const weekId = this.getWeekId(this.weekStartDate);
        const weekData = {
            weekId: weekId,
            weekStart: this.weekStartDate.toISOString(),
            weekEnd: this.weekEndDate.toISOString(),
            finalMerges: this.currentMerges,
            targetGoal: this.targetGoal,
            mergeRatePer10Min: this.mergeRatePer10Min,
            completed: this.currentMerges >= this.targetGoal,
            achievementRate: (this.currentMerges / this.targetGoal) * 100,
            dailyProgress: this.calculateDailyProgress(),
            completedAt: new Date().toISOString()
        };

        try {
            await this.storage.saveWeeklyHistory(weekData);
            this.weeklyHistory.push(weekData);
            this.updateHistoryDisplay();
            
            // Update charts if available
            if (window.progressCharts) {
                window.progressCharts.updateCharts();
            }
        } catch (error) {
            console.error('Error saving weekly history:', error);
        }
    }

    getWeekId(weekStart) {
        const year = weekStart.getFullYear();
        const month = weekStart.getMonth() + 1;
        const day = weekStart.getDate();
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    migrateLegacyData() {
        const weekId = this.getWeekId(this.weekStartDate);
        
        // If we have current merges but no daily history for this week, 
        // assign all current merges to today to prevent the chart from being empty
        if (this.currentMerges > 0 && (!this.dailyHistory[weekId] || Object.keys(this.dailyHistory[weekId]).length === 0)) {
            // Calculate the current day within the week based on 5pm boundaries
            const now = new Date();
            const timeSinceStart = now - this.weekStartDate;
            const daysSinceStart = Math.floor(timeSinceStart / (1000 * 60 * 60 * 24));
            
            const dayDate = new Date(this.weekStartDate);
            dayDate.setDate(this.weekStartDate.getDate() + daysSinceStart);
            const today = dayDate.toDateString();
            
            if (!this.dailyHistory[weekId]) {
                this.dailyHistory[weekId] = {};
            }
            this.dailyHistory[weekId][today] = this.currentMerges;
        }
    }

    trackDailyProgress(amount) {
        // Calculate which day of the week we're in (5pm-based)
        const now = new Date();
        const weekId = this.getWeekId(this.weekStartDate);
        
        // Calculate the current day within the week based on 5pm boundaries
        const timeSinceStart = now - this.weekStartDate;
        const daysSinceStart = Math.floor(timeSinceStart / (1000 * 60 * 60 * 24));
        
        // Get the date key for this day within the week
        const dayDate = new Date(this.weekStartDate);
        dayDate.setDate(this.weekStartDate.getDate() + daysSinceStart);
        const today = dayDate.toDateString();
        
        if (!this.dailyHistory[weekId]) {
            this.dailyHistory[weekId] = {};
        }
        
        if (!this.dailyHistory[weekId][today]) {
            this.dailyHistory[weekId][today] = 0;
        }
        
        this.dailyHistory[weekId][today] += amount;
    }

    updateCurrentDayTotal() {
        // Calculate the current day and set the total merges for today
        const now = new Date();
        const weekId = this.getWeekId(this.weekStartDate);
        
        // Calculate the current day within the week based on 5pm boundaries
        const timeSinceStart = now - this.weekStartDate;
        const daysSinceStart = Math.floor(timeSinceStart / (1000 * 60 * 60 * 24));
        
        // Get the date key for this day within the week
        const dayDate = new Date(this.weekStartDate);
        dayDate.setDate(this.weekStartDate.getDate() + daysSinceStart);
        const today = dayDate.toDateString();
        
        if (!this.dailyHistory[weekId]) {
            this.dailyHistory[weekId] = {};
        }
        
        // Calculate how many merges belong to previous days
        let previousDaysMerges = 0;
        for (let i = 0; i < daysSinceStart; i++) {
            const prevDate = new Date(this.weekStartDate);
            prevDate.setDate(this.weekStartDate.getDate() + i);
            const prevDateKey = prevDate.toDateString();
            previousDaysMerges += this.dailyHistory[weekId][prevDateKey] || 0;
        }
        
        // Set today's total to be the remainder
        this.dailyHistory[weekId][today] = Math.max(0, this.currentMerges - previousDaysMerges);
    }

    calculateDailyProgress() {
        const now = new Date();
        const timeSinceStart = now - this.weekStartDate;
        const daysSinceStart = Math.floor(timeSinceStart / (1000 * 60 * 60 * 24));
        const weekId = this.getWeekId(this.weekStartDate);
        
        // Initialize daily history for this week if it doesn't exist
        if (!this.dailyHistory[weekId]) {
            this.dailyHistory[weekId] = {};
        }
        
        const dailyProgress = [];
        for (let i = 0; i <= daysSinceStart; i++) {
            const dayDate = new Date(this.weekStartDate);
            dayDate.setDate(this.weekStartDate.getDate() + i);
            const dateKey = dayDate.toDateString();
            
            // Get actual daily progress from stored data
            const mergesForDay = this.dailyHistory[weekId][dateKey] || 0;
            
            dailyProgress.push({
                date: dayDate.toISOString(),
                merges: mergesForDay,
                dayOfWeek: dayDate.getDay(),
                dateKey: dateKey
            });
        }
        
        
        return dailyProgress;
    }

    updateHistoryDisplay() {
        const historyContainer = document.getElementById('weekly-history');
        if (!historyContainer) return;
        
        if (this.weeklyHistory.length === 0) {
            historyContainer.innerHTML = '<p class="no-history">No weekly history yet. Complete your first week to see results here!</p>';
            return;
        }
        
        const sortedHistory = this.weeklyHistory.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
        
        historyContainer.innerHTML = sortedHistory.map(week => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            
            return `
                <div class="history-item ${week.completed ? 'completed' : 'incomplete'}">
                    <div class="history-date">${dateRange}</div>
                    <div class="history-stats">
                        <span class="merges">${week.finalMerges.toLocaleString()} / ${week.targetGoal.toLocaleString()}</span>
                        <span class="rate">${week.achievementRate.toFixed(1)}%</span>
                    </div>
                    <div class="history-status ${week.completed ? 'completed' : 'incomplete'}">
                        ${week.completed ? '✓ Completed' : '✗ Incomplete'}
                    </div>
                </div>
            `;
        }).join('');
    }

    getWeeklyStats() {
        if (this.weeklyHistory.length === 0) return null;
        
        const completedWeeks = this.weeklyHistory.filter(week => week.completed);
        const averageCompletionRate = this.weeklyHistory.reduce((sum, week) => sum + week.achievementRate, 0) / this.weeklyHistory.length;
        
        return {
            totalWeeks: this.weeklyHistory.length,
            completedWeeks: completedWeeks.length,
            completionRate: (completedWeeks.length / this.weeklyHistory.length) * 100,
            averageAchievementRate: averageCompletionRate,
            streak: this.calculateStreak(),
            bestWeek: this.weeklyHistory.reduce((best, week) => 
                week.achievementRate > best.achievementRate ? week : best
            )
        };
    }

    calculateStreak() {
        const sortedWeeks = this.weeklyHistory.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
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

    // Advanced analytics features
    getAdvancedAnalytics() {
        const stats = this.getWeeklyStats();
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
        if (this.weeklyHistory.length === 0) return null;

        const totalMerges = this.weeklyHistory.reduce((sum, week) => sum + week.finalMerges, 0);
        const totalTargets = this.weeklyHistory.reduce((sum, week) => sum + week.targetGoal, 0);
        const averageRate = this.weeklyHistory.reduce((sum, week) => sum + week.mergeRatePer10Min, 0) / this.weeklyHistory.length;

        return {
            overallEfficiency: (totalMerges / totalTargets) * 100,
            averageRate: averageRate,
            bestRate: Math.max(...this.weeklyHistory.map(w => w.mergeRatePer10Min)),
            worstRate: Math.min(...this.weeklyHistory.map(w => w.mergeRatePer10Min)),
            rateConsistency: this.calculateRateConsistency()
        };
    }

    calculateRateConsistency() {
        if (this.weeklyHistory.length < 2) return 100;

        const rates = this.weeklyHistory.map(w => w.mergeRatePer10Min);
        const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
        const stdDev = Math.sqrt(variance);
        
        // Convert to consistency percentage (lower std dev = higher consistency)
        const consistency = Math.max(0, 100 - (stdDev / mean) * 100);
        return consistency;
    }

    generatePredictions() {
        if (this.weeklyHistory.length < 2) return null;

        const recentWeeks = this.weeklyHistory.slice(-4); // Last 4 weeks
        const trend = this.calculateTrend(recentWeeks);
        
        const currentWeekProgress = this.currentMerges / this.targetGoal;
        const timeProgress = (new Date() - this.weekStartDate) / (this.weekEndDate - this.weekStartDate);
        
        const projectedFinalMerges = this.currentMerges + (this.currentMerges / timeProgress) * (1 - timeProgress);
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
        const ratio = projectedMerges / this.targetGoal;
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
        const timeRemaining = this.weekEndDate - now;
        const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
        const mergesRemaining = Math.max(0, this.targetGoal - this.currentMerges);
        
        return Math.ceil(mergesRemaining / Math.max(1, daysRemaining));
    }

    estimateCompletionDate() {
        if (this.currentMerges >= this.targetGoal) return new Date();
        
        const mergesRemaining = this.targetGoal - this.currentMerges;
        const currentRate = this.mergeRatePer10Min * 6; // per hour
        const hoursNeeded = mergesRemaining / currentRate;
        
        return new Date(Date.now() + hoursNeeded * 60 * 60 * 1000);
    }

    generateRecommendations() {
        const recommendations = [];
        const stats = this.getWeeklyStats();
        
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
        const currentPace = this.currentMerges / ((new Date() - this.weekStartDate) / (1000 * 60 * 60));
        const requiredPace = (this.targetGoal - this.currentMerges) / ((this.weekEndDate - new Date()) / (1000 * 60 * 60));
        
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
        const stats = this.getWeeklyStats();
        
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
        const weekProgress = (now - this.weekStartDate) / (this.weekEndDate - this.weekStartDate);
        const goalProgress = this.currentMerges / this.targetGoal;
        
        if (goalProgress > weekProgress * 1.2) {
            insights.push('You\'re ahead of schedule this week! Great pace.');
        } else if (goalProgress < weekProgress * 0.8) {
            insights.push('You\'re behind schedule. Consider increasing your daily play time.');
        }

        // Best performance day
        const bestDay = this.findBestPerformanceDay();
        if (bestDay) {
            insights.push(`${bestDay} appears to be your most productive day of the week.`);
        }

        return insights;
    }

    findBestPerformanceDay() {
        const dayPerformance = [0, 0, 0, 0, 0, 0, 0]; // Sunday = 0, Monday = 1, etc.
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        
        this.weeklyHistory.forEach(week => {
            if (week.dailyProgress) {
                week.dailyProgress.forEach(day => {
                    const dayOfWeek = day.dayOfWeek;
                    dayPerformance[dayOfWeek] += day.merges;
                    dayCounts[dayOfWeek]++;
                });
            }
        });
        
        const averages = dayPerformance.map((total, index) => 
            dayCounts[index] > 0 ? total / dayCounts[index] : 0
        );
        
        const bestDayIndex = averages.indexOf(Math.max(...averages));
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        return dayNames[bestDayIndex];
    }

    displayAnalytics() {
        const analytics = this.getAdvancedAnalytics();
        const analyticsContainer = document.getElementById('advanced-analytics');
        
        if (!analyticsContainer || !analytics) return;

        analyticsContainer.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h4>Efficiency</h4>
                    <div class="stat-value">${analytics.efficiency.overallEfficiency.toFixed(1)}%</div>
                    <div class="stat-label">Overall Achievement</div>
                </div>
                
                <div class="analytics-card">
                    <h4>Consistency</h4>
                    <div class="stat-value">${analytics.efficiency.rateConsistency.toFixed(1)}%</div>
                    <div class="stat-label">Rate Consistency</div>
                </div>
                
                <div class="analytics-card">
                    <h4>Streak</h4>
                    <div class="stat-value">${analytics.streak}</div>
                    <div class="stat-label">Week${analytics.streak !== 1 ? 's' : ''}</div>
                </div>
                
                <div class="analytics-card">
                    <h4>Completion Rate</h4>
                    <div class="stat-value">${analytics.completionRate.toFixed(1)}%</div>
                    <div class="stat-label">Goals Reached</div>
                </div>
            </div>
            
            ${analytics.predictions ? `
                <div class="predictions-section">
                    <h4>This Week's Predictions</h4>
                    <div class="prediction-grid">
                        <div class="prediction-item">
                            <span class="prediction-label">Projected Final:</span>
                            <span class="prediction-value">${analytics.predictions.projectedFinalMerges.toLocaleString()}</span>
                        </div>
                        <div class="prediction-item">
                            <span class="prediction-label">Completion Probability:</span>
                            <span class="prediction-value">${analytics.predictions.completionProbability}%</span>
                        </div>
                        <div class="prediction-item">
                            <span class="prediction-label">Daily Target:</span>
                            <span class="prediction-value">${analytics.predictions.recommendedDailyTarget.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${analytics.recommendations.length > 0 ? `
                <div class="recommendations-section">
                    <h4>Recommendations</h4>
                    <div class="recommendations-list">
                        ${analytics.recommendations.map(rec => `
                            <div class="recommendation-item priority-${rec.priority}">
                                <div class="recommendation-message">${rec.message}</div>
                                <div class="recommendation-action">${rec.action}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${analytics.insights.length > 0 ? `
                <div class="insights-section">
                    <h4>Insights</h4>
                    <div class="insights-list">
                        ${analytics.insights.map(insight => `
                            <div class="insight-item">${insight}</div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    // Sync functionality
    setupSyncListeners() {
        // Upload data button
        document.getElementById('upload-data-btn').addEventListener('click', async () => {
            this.handleSyncUpload();
        });

        // Download data button
        document.getElementById('download-data-btn').addEventListener('click', async () => {
            this.handleSyncDownload();
        });

        // Clear sync data button
        document.getElementById('clear-sync-btn').addEventListener('click', async () => {
            this.handleClearSync();
        });

        // Auto-uppercase sync code input
        document.getElementById('sync-code-input').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Update sync status on load
        this.updateSyncStatus();
    }

    async handleSyncUpload() {
        const uploadBtn = document.getElementById('upload-data-btn');
        const resultDiv = document.getElementById('upload-result');
        
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        resultDiv.innerHTML = '';
        
        try {
            if (!window.syncManager) {
                throw new Error('Sync manager not available');
            }
            
            const result = await window.syncManager.uploadData();
            
            if (result.success) {
                resultDiv.innerHTML = `
                    <div class="sync-success">
                        <strong>Success!</strong> Your sync code is: <span class="sync-code">${result.syncCode}</span>
                        <br><small>Expires: ${new Date(result.expiresAt).toLocaleDateString()}</small>
                    </div>
                `;
                this.updateSyncStatus();
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="sync-error">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Generate Sync Code';
        }
    }

    async handleSyncDownload() {
        const downloadBtn = document.getElementById('download-data-btn');
        const resultDiv = document.getElementById('download-result');
        const syncCodeInput = document.getElementById('sync-code-input');
        
        const syncCode = syncCodeInput.value.trim().toUpperCase();
        
        if (!syncCode) {
            resultDiv.innerHTML = '<div class="sync-error">Please enter a sync code</div>';
            return;
        }
        
        if (!window.syncManager || !window.syncManager.validateSyncCode(syncCode)) {
            resultDiv.innerHTML = '<div class="sync-error">Invalid sync code format</div>';
            return;
        }
        
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Downloading...';
        resultDiv.innerHTML = '';
        
        try {
            const result = await window.syncManager.downloadData(syncCode);
            
            if (result.success) {
                resultDiv.innerHTML = `
                    <div class="sync-success">
                        <strong>Success!</strong> Data downloaded successfully
                        <br><small>From device: ${result.deviceId}</small>
                        <br><small>Uploaded: ${new Date(result.uploadedAt).toLocaleDateString()}</small>
                    </div>
                `;
                
                // Reload data and update UI
                await this.loadData();
                this.updateSyncStatus();
                
                // Clear input
                syncCodeInput.value = '';
            } else {
                throw new Error(result.error || 'Download failed');
            }
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="sync-error">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download Data';
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
                
                // Clear result messages
                document.getElementById('upload-result').innerHTML = '';
                document.getElementById('download-result').innerHTML = '';
            }
        } catch (error) {
            console.error('Error clearing sync data:', error);
        }
    }

    async updateSyncStatus() {
        const statusText = document.getElementById('sync-status-text');
        const clearBtn = document.getElementById('clear-sync-btn');
        
        if (!window.syncManager) {
            statusText.textContent = 'Sync manager not available';
            clearBtn.style.display = 'none';
            return;
        }
        
        try {
            const status = await window.syncManager.getSyncStatus();
            
            if (status.hasSync) {
                statusText.innerHTML = `
                    Last sync: ${status.lastSyncTime ? status.lastSyncTime.toLocaleDateString() : 'Unknown'}
                    <br>Code: ${status.lastSyncCode}
                    <br>Device: ${status.deviceId}
                `;
                clearBtn.style.display = 'inline-block';
            } else {
                statusText.textContent = 'No sync data available';
                clearBtn.style.display = 'none';
            }
        } catch (error) {
            statusText.textContent = 'Error loading sync status';
            clearBtn.style.display = 'none';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.scrapCalculator = new ScrapCalculator();
});

// Service Worker registration (basic PWA setup)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}