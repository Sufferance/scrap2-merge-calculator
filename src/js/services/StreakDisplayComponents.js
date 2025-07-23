// Streak Display Components - Handles UI components for streak tracking
class StreakDisplayComponents {
    constructor() {
        this.currentStreakBadge = null;
        this.streakMetricsCard = null;
        this.achievementIndicators = [];
        this.loadingStates = new Map(); // Track loading states for different components
        this.debounceTimeouts = new Map(); // Debounce streak calculations
    }

    createCurrentStreakBadge(parentElement, streakCount = 0) {
        // Create the main badge container
        const badge = document.createElement('div');
        badge.id = 'current-streak-badge';
        badge.className = 'streak-badge';
        
        // Add the streak icon (fire emoji for active streaks, dimmed for zero)
        const streakIcon = document.createElement('div');
        streakIcon.className = 'streak-icon';
        streakIcon.textContent = streakCount > 0 ? '🔥' : '⭕';
        
        // Add the streak count number
        const streakCountElement = document.createElement('div');
        streakCountElement.className = 'streak-count';
        streakCountElement.textContent = streakCount;
        
        // Add the streak label
        const streakLabel = document.createElement('div');
        streakLabel.className = 'streak-label';
        streakLabel.textContent = streakCount === 1 ? 'Day Streak' : 'Day Streak';
        
        // Assemble the badge
        badge.appendChild(streakIcon);
        badge.appendChild(streakCountElement);
        badge.appendChild(streakLabel);
        
        // Add CSS classes for visual state
        if (streakCount === 0) {
            badge.classList.add('streak-inactive');
        } else if (streakCount >= 7) {
            badge.classList.add('streak-milestone');
        }
        
        // Add to parent element if provided
        if (parentElement) {
            parentElement.appendChild(badge);
        }
        
        this.currentStreakBadge = badge;
        return badge;
    }

    createStreakMetricsCard(parentElement, streakData) {
        // Create the main card container
        const card = document.createElement('div');
        card.id = 'streak-metrics-card';
        card.className = 'metrics-card streak-metrics';
        
        // Add the card title
        const title = document.createElement('h3');
        title.textContent = 'Streak Analytics';
        card.appendChild(title);
        
        // Create the stats container
        const statsContainer = document.createElement('div');
        statsContainer.className = 'streak-stats';
        
        // Create individual stat items
        const stats = [
            { label: 'Current Streak', value: `${streakData.currentStreak} days`, key: 'current' },
            { label: 'Longest Streak', value: `${streakData.longestStreak} days`, key: 'longest' },
            { label: 'Total Achieved', value: `${streakData.totalDaysAchieved} days`, key: 'total' }
        ];
        
        stats.forEach(stat => {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            
            const statLabel = document.createElement('span');
            statLabel.className = 'stat-label';
            statLabel.textContent = stat.label;
            
            const statValue = document.createElement('span');
            statValue.className = 'stat-value';
            statValue.setAttribute('data-stat', stat.key);
            statValue.textContent = stat.value;
            
            statItem.appendChild(statLabel);
            statItem.appendChild(statValue);
            statsContainer.appendChild(statItem);
        });
        
        card.appendChild(statsContainer);
        
        // Add celebration message for milestones
        if (streakData.currentStreak >= 7) {
            const celebration = document.createElement('div');
            celebration.className = 'streak-celebration';
            celebration.innerHTML = this.getMilestoneMessage(streakData.currentStreak);
            card.appendChild(celebration);
        }
        
        // Add to parent element if provided
        if (parentElement) {
            parentElement.appendChild(card);
        }
        
        this.streakMetricsCard = card;
        return card;
    }

    addAchievementIndicators(chartData, streakData) {
        const indicators = [];
        
        // Process each data point to determine achievement status
        chartData.forEach((dataPoint, index) => {
            const dailyTarget = Math.ceil(dataPoint.goalTarget / 7);
            const achieved = dataPoint.merges >= dailyTarget;
            
            if (achieved) {
                const indicator = {
                    index: index,
                    date: dataPoint.date,
                    achieved: true,
                    cssClass: 'achievement-indicator achieved',
                    icon: '✓',
                    tooltip: `${dataPoint.date}: ${dataPoint.merges} merges (Target: ${dailyTarget})`
                };
                indicators.push(indicator);
            } else if (dataPoint.merges > 0) {
                // Show partial progress indicators for days with some progress
                const indicator = {
                    index: index,
                    date: dataPoint.date,
                    achieved: false,
                    cssClass: 'achievement-indicator partial',
                    icon: '○',
                    tooltip: `${dataPoint.date}: ${dataPoint.merges} merges (Target: ${dailyTarget})`
                };
                indicators.push(indicator);
            }
        });
        
        this.achievementIndicators = indicators;
        return indicators;
    }

    updateStreakBadge(streakCount) {
        if (!this.currentStreakBadge) return;
        
        const countElement = this.currentStreakBadge.querySelector('.streak-count');
        const iconElement = this.currentStreakBadge.querySelector('.streak-icon');
        
        if (countElement) {
            countElement.textContent = streakCount;
        }
        
        if (iconElement) {
            iconElement.textContent = streakCount > 0 ? '🔥' : '⭕';
        }
        
        // Update visual state classes
        this.currentStreakBadge.classList.remove('streak-inactive', 'streak-milestone');
        
        if (streakCount === 0) {
            this.currentStreakBadge.classList.add('streak-inactive');
        } else if (streakCount >= 7) {
            this.currentStreakBadge.classList.add('streak-milestone');
        }
    }

    updateStreakMetrics(streakData) {
        if (!this.streakMetricsCard) return;
        
        // Update individual stat values
        const currentStat = this.streakMetricsCard.querySelector('[data-stat="current"]');
        const longestStat = this.streakMetricsCard.querySelector('[data-stat="longest"]');
        const totalStat = this.streakMetricsCard.querySelector('[data-stat="total"]');
        
        if (currentStat) currentStat.textContent = `${streakData.currentStreak} days`;
        if (longestStat) longestStat.textContent = `${streakData.longestStreak} days`;
        if (totalStat) totalStat.textContent = `${streakData.totalDaysAchieved} days`;
        
        // Update or add celebration message
        const existingCelebration = this.streakMetricsCard.querySelector('.streak-celebration');
        if (existingCelebration) {
            existingCelebration.remove();
        }
        
        if (streakData.currentStreak >= 7) {
            const celebration = document.createElement('div');
            celebration.className = 'streak-celebration';
            celebration.innerHTML = this.getMilestoneMessage(streakData.currentStreak);
            this.streakMetricsCard.appendChild(celebration);
        }
    }

    getMilestoneMessage(streakCount) {
        if (streakCount >= 30) {
            return '🏆 <strong>Amazing!</strong> 30+ day streak!';
        } else if (streakCount >= 14) {
            return '🌟 <strong>Excellent!</strong> 2+ week streak!';
        } else if (streakCount >= 7) {
            return '✨ <strong>Great job!</strong> 1+ week streak!';
        }
        return '';
    }

    renderAchievementIndicatorsOnChart(chartInstance, indicators) {
        // This method would integrate with Chart.js to add visual indicators
        // Implementation would depend on the specific chart configuration
        if (!chartInstance || !indicators) return;
        
        // Store indicators for chart rendering
        chartInstance.achievementIndicators = indicators;
        
        // Trigger chart update if it has the update method
        if (typeof chartInstance.update === 'function') {
            chartInstance.update();
        }
    }

    showMilestoneNotification(streakCount) {
        // Create a temporary notification for streak milestones
        if (streakCount >= 7 && streakCount % 7 === 0) {
            const notification = document.createElement('div');
            notification.className = 'streak-notification milestone-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon">🎉</div>
                    <div class="notification-text">
                        <strong>Streak Milestone!</strong><br>
                        ${streakCount} consecutive days!
                    </div>
                </div>
            `;
            
            // Add to page temporarily
            document.body.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 5000);
            
            // Add click to dismiss
            notification.addEventListener('click', () => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            });
        }
    }

    // Loading state management methods
    showLoadingState(componentId, message = 'Calculating streaks...') {
        this.loadingStates.set(componentId, true);
        
        if (componentId === 'streak-badge' && this.currentStreakBadge) {
            this.setStreakBadgeLoading(message);
        } else if (componentId === 'streak-metrics' && this.streakMetricsCard) {
            this.setStreakMetricsLoading(message);
        }
    }

    hideLoadingState(componentId) {
        this.loadingStates.set(componentId, false);
        
        if (componentId === 'streak-badge' && this.currentStreakBadge) {
            this.clearStreakBadgeLoading();
        } else if (componentId === 'streak-metrics' && this.streakMetricsCard) {
            this.clearStreakMetricsLoading();
        }
    }

    setStreakBadgeLoading(message) {
        const iconElement = this.currentStreakBadge.querySelector('.streak-icon');
        const countElement = this.currentStreakBadge.querySelector('.streak-count');
        const labelElement = this.currentStreakBadge.querySelector('.streak-label');
        
        if (iconElement) {
            iconElement.textContent = '⏳';
            iconElement.classList.add('loading-spinner');
        }
        
        if (countElement) {
            countElement.textContent = '...';
            countElement.classList.add('loading-text');
        }
        
        if (labelElement) {
            labelElement.textContent = 'Calculating';
            labelElement.classList.add('loading-text');
        }
        
        this.currentStreakBadge.classList.add('streak-loading');
    }

    clearStreakBadgeLoading() {
        const iconElement = this.currentStreakBadge.querySelector('.streak-icon');
        const countElement = this.currentStreakBadge.querySelector('.streak-count');
        const labelElement = this.currentStreakBadge.querySelector('.streak-label');
        
        if (iconElement) {
            iconElement.classList.remove('loading-spinner');
        }
        
        if (countElement) {
            countElement.classList.remove('loading-text');
        }
        
        if (labelElement) {
            labelElement.classList.remove('loading-text');
            labelElement.textContent = 'Day Streak';
        }
        
        this.currentStreakBadge.classList.remove('streak-loading');
    }

    setStreakMetricsLoading(message) {
        // Add loading overlay to metrics card
        let loadingOverlay = this.streakMetricsCard.querySelector('.streak-loading-overlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'streak-loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner">⏳</div>
                    <div class="loading-message">${message}</div>
                </div>
            `;
            this.streakMetricsCard.appendChild(loadingOverlay);
        }
        
        loadingOverlay.style.display = 'flex';
        this.streakMetricsCard.classList.add('streak-loading');
    }

    clearStreakMetricsLoading() {
        const loadingOverlay = this.streakMetricsCard.querySelector('.streak-loading-overlay');
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        this.streakMetricsCard.classList.remove('streak-loading');
    }

    // Debounced streak calculation to prevent excessive updates
    debouncedStreakCalculation(calculationFn, delay = 300) {
        return (...args) => {
            const componentId = args[0] || 'default';
            
            // Clear existing timeout
            if (this.debounceTimeouts.has(componentId)) {
                clearTimeout(this.debounceTimeouts.get(componentId));
            }
            
            // Show loading state immediately
            this.showLoadingState(componentId);
            
            // Set new timeout
            const timeoutId = setTimeout(() => {
                try {
                    const result = calculationFn.apply(this, args);
                    this.hideLoadingState(componentId);
                    this.debounceTimeouts.delete(componentId);
                    return result;
                } catch (error) {
                    this.hideLoadingState(componentId);
                    this.showStreakError(componentId, 'Calculation failed');
                    this.debounceTimeouts.delete(componentId);
                    throw error;
                }
            }, delay);
            
            this.debounceTimeouts.set(componentId, timeoutId);
        };
    }

    showStreakError(componentId, errorMessage) {
        if (componentId === 'streak-badge' && this.currentStreakBadge) {
            const iconElement = this.currentStreakBadge.querySelector('.streak-icon');
            const countElement = this.currentStreakBadge.querySelector('.streak-count');
            const labelElement = this.currentStreakBadge.querySelector('.streak-label');
            
            if (iconElement) iconElement.textContent = '⚠️';
            if (countElement) countElement.textContent = '!';
            if (labelElement) labelElement.textContent = 'Error';
            
            this.currentStreakBadge.classList.add('streak-error');
            
            // Auto-clear error after 3 seconds
            setTimeout(() => {
                this.currentStreakBadge.classList.remove('streak-error');
            }, 3000);
        }
    }

    // Enhanced update methods with loading states
    updateStreakBadgeWithLoading(streakCount, showLoading = false) {
        if (showLoading) {
            this.showLoadingState('streak-badge');
            
            // Simulate brief calculation delay for visual feedback
            setTimeout(() => {
                this.updateStreakBadge(streakCount);
                this.hideLoadingState('streak-badge');
            }, 100);
        } else {
            this.updateStreakBadge(streakCount);
        }
    }

    updateStreakMetricsWithLoading(streakData, showLoading = false) {
        if (showLoading) {
            this.showLoadingState('streak-metrics', 'Updating streak analytics...');
            
            // Simulate brief calculation delay for visual feedback
            setTimeout(() => {
                this.updateStreakMetrics(streakData);
                this.hideLoadingState('streak-metrics');
            }, 150);
        } else {
            this.updateStreakMetrics(streakData);
        }
    }

    // Progress indicator for large dataset processing
    showProgressIndicator(containerId, progress = 0, total = 100) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let progressBar = container.querySelector('.streak-progress-bar');
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'streak-progress-bar';
            progressBar.innerHTML = `
                <div class="progress-bar-track">
                    <div class="progress-bar-fill"></div>
                </div>
                <div class="progress-bar-text">Processing streaks...</div>
            `;
            container.appendChild(progressBar);
        }
        
        const fillElement = progressBar.querySelector('.progress-bar-fill');
        const textElement = progressBar.querySelector('.progress-bar-text');
        const percentage = Math.round((progress / total) * 100);
        
        if (fillElement) {
            fillElement.style.width = `${percentage}%`;
        }
        
        if (textElement) {
            textElement.textContent = `Processing streaks... ${percentage}%`;
        }
        
        progressBar.style.display = 'block';
    }

    hideProgressIndicator(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const progressBar = container.querySelector('.streak-progress-bar');
        if (progressBar) {
            progressBar.style.display = 'none';
        }
    }

    // Async streak calculation with progress updates
    async calculateStreaksWithProgress(calculator, dailyData, progressCallback) {
        const batchSize = 50; // Process in batches for large datasets
        const batches = [];
        
        // Split data into batches
        for (let i = 0; i < dailyData.length; i += batchSize) {
            batches.push(dailyData.slice(i, i + batchSize));
        }
        
        if (batches.length === 1) {
            // Small dataset - calculate directly
            if (progressCallback) progressCallback(0, 1);
            const result = calculator.calculateStreaks(dailyData);
            if (progressCallback) progressCallback(1, 1);
            return result;
        }
        
        // Large dataset - process in batches with progress updates
        let processedBatches = 0;
        const results = [];
        
        for (const batch of batches) {
            // Small delay to allow UI updates
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const batchResult = calculator.calculateStreaks(batch);
            results.push(batchResult);
            
            processedBatches++;
            if (progressCallback) {
                progressCallback(processedBatches, batches.length);
            }
        }
        
        // Combine batch results (simplified - would need more complex merging logic)
        return calculator.calculateStreaks(dailyData);
    }

    // Initialize streak display in the main interface
    initializeInMainInterface() {
        // Find the appropriate location in the header for the streak badge
        const headerSection = document.querySelector('.week-display');
        if (headerSection) {
            this.createCurrentStreakBadge(headerSection, 0);
        }
        
        // Find the analytics section for the metrics card
        const analyticsSection = document.querySelector('#advanced-analytics');
        if (analyticsSection) {
            const defaultStreakData = {
                currentStreak: 0,
                longestStreak: 0,
                totalDaysAchieved: 0
            };
            this.createStreakMetricsCard(analyticsSection, defaultStreakData);
        }
    }
}

// Export for use in main app
window.StreakDisplayComponents = StreakDisplayComponents;