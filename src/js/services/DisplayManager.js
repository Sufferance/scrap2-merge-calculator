// Display manager - handles all DOM manipulation and UI updates
class DisplayManager {
    constructor() {
        this.elements = this.cacheElements();
        this.calculationService = new CalculationService();
    }

    cacheElements() {
        return {
            // Input elements
            currentMerges: document.getElementById('current-merges'),
            mergeRate: document.getElementById('merge-rate'),
            targetGoal: document.getElementById('target-goal'),
            
            // Display elements
            weekDateRange: document.getElementById('week-date-range'),
            countdownTimer: document.getElementById('countdown-timer'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            
            // Result elements
            mergesNeeded: document.getElementById('merges-needed'),
            hoursRequired: document.getElementById('hours-required'),
            hoursPerDay: document.getElementById('hours-per-day'),
            onTrackStatus: document.getElementById('on-track-status'),
            currentPace: document.getElementById('current-pace'),
            requiredPace: document.getElementById('required-pace'),
            predictedFinishTime: document.getElementById('predicted-finish-time'),
            
            // History and analytics
            weeklyHistory: document.getElementById('weekly-history'),
            advancedAnalytics: document.getElementById('advanced-analytics'),
            
            // Config elements
            configToggle: document.getElementById('config-toggle'),
            configContent: document.getElementById('config-content'),
            
            // Sync elements
            syncToggle: document.getElementById('sync-toggle'),
            syncContent: document.getElementById('sync-content'),
            exportBtn: document.getElementById('export-data-btn'),
            importBtn: document.getElementById('import-data-btn'),
            importFileInput: document.getElementById('import-file-input'),
            exportResult: document.getElementById('export-result'),
            importResult: document.getElementById('import-result'),
            
            // Container elements
            resultCards: document.querySelectorAll('.result-card')
        };
    }

    updateWeekDisplay(weekStartDate, weekEndDate) {
        const options = { month: 'short', day: 'numeric' };
        const startStr = weekStartDate.toLocaleDateString('en-US', options);
        const endStr = weekEndDate.toLocaleDateString('en-US', options);
        
        if (this.elements.weekDateRange) {
            this.elements.weekDateRange.textContent = `${startStr} - ${endStr}`;
        }
    }

    updateCountdown(weekEndDate) {
        const now = new Date();
        const timeDiff = weekEndDate - now;
        
        if (timeDiff <= 0) {
            if (this.elements.countdownTimer) {
                this.elements.countdownTimer.textContent = 'Week has ended';
            }
            return false; // Indicate week has ended
        }
        
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        if (this.elements.countdownTimer) {
            this.elements.countdownTimer.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s remaining`;
        }
        
        return true; // Week is still active
    }

    updateProgressBar(currentMerges, targetGoal) {
        const progressPercentage = this.calculationService.calculateProgressPercentage(currentMerges, targetGoal);
        
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progressPercentage}%`;
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${progressPercentage.toFixed(1)}%`;
        }
    }

    updateResultsDisplay(results) {
        const {
            mergesNeeded,
            hoursRequired,
            averageHoursPerDay,
            currentPace,
            requiredPace,
            statusInfo
        } = results;

        // Update result values
        if (this.elements.mergesNeeded) {
            this.elements.mergesNeeded.textContent = mergesNeeded.toLocaleString();
        }
        
        if (this.elements.hoursRequired) {
            this.elements.hoursRequired.textContent = this.calculationService.calculateTimeDisplay(hoursRequired);
        }
        
        if (this.elements.hoursPerDay) {
            this.elements.hoursPerDay.textContent = this.calculationService.calculateTimeDisplay(averageHoursPerDay);
        }

        // Update pace displays
        if (this.elements.currentPace) {
            this.elements.currentPace.textContent = `Current pace: ${Math.round(currentPace).toLocaleString()}/hr`;
        }
        
        if (this.elements.requiredPace) {
            if (mergesNeeded <= 0) {
                this.elements.requiredPace.textContent = 'Goal achieved!';
            } else {
                this.elements.requiredPace.textContent = `Required pace: ${Math.round(requiredPace).toLocaleString()}/hr`;
            }
        }

        // Update status
        this.updateStatusDisplay(statusInfo);
        this.updateCardColors(statusInfo);
    }

    updateStatusDisplay(statusInfo) {
        if (!this.elements.onTrackStatus) return;
        
        // Remove all status classes
        this.elements.onTrackStatus.classList.remove('on-track', 'close', 'behind', 'excellent', 'good', 'critical', 'completed');
        
        // Add new status class with animation
        this.elements.onTrackStatus.classList.add(statusInfo.className);
        this.elements.onTrackStatus.textContent = statusInfo.text;
        
        // Add subtle animation for status changes
        this.elements.onTrackStatus.style.transform = 'scale(1.05)';
        setTimeout(() => {
            this.elements.onTrackStatus.style.transform = 'scale(1)';
        }, 200);
    }

    updateCardColors(statusInfo) {
        this.elements.resultCards.forEach(card => {
            // Remove all status classes
            card.classList.remove('on-track', 'close', 'behind', 'excellent', 'good', 'critical', 'completed');
            
            // Add new status class
            card.classList.add(statusInfo.className);
        });
    }

    updatePredictiveFinishTime(predictiveResult) {
        let finishTimeElement = this.elements.predictedFinishTime;
        
        if (!finishTimeElement) {
            finishTimeElement = this.createPredictiveFinishTimeElement();
        }
        
        if (finishTimeElement) {
            finishTimeElement.textContent = predictiveResult.message;
            finishTimeElement.className = predictiveResult.className;
        }
    }

    createPredictiveFinishTimeElement() {
        // Find the pace displays section
        const paceSection = document.querySelector('.pace-displays') || 
                           (this.elements.currentPace ? this.elements.currentPace.parentElement : null);
        
        if (paceSection) {
            const finishTimeElement = document.createElement('div');
            finishTimeElement.id = 'predicted-finish-time';
            finishTimeElement.className = 'predicted-finish';
            finishTimeElement.textContent = 'Calculating...';
            
            paceSection.appendChild(finishTimeElement);
            
            // Cache the new element
            this.elements.predictedFinishTime = finishTimeElement;
            
            return finishTimeElement;
        }
        
        return null;
    }

    updateInputValues(currentMerges, mergeRatePer10Min, targetGoal) {
        if (this.elements.currentMerges) {
            this.elements.currentMerges.value = currentMerges;
        }
        
        if (this.elements.mergeRate) {
            this.elements.mergeRate.value = mergeRatePer10Min;
        }
        
        if (this.elements.targetGoal) {
            this.elements.targetGoal.value = targetGoal;
        }
    }

    addPulseEffect(element) {
        if (element) {
            element.classList.add('pulse');
            setTimeout(() => element.classList.remove('pulse'), 600);
        }
    }

    updateHistoryDisplay(weeklyHistory) {
        if (!this.elements.weeklyHistory) return;
        
        if (weeklyHistory.length === 0) {
            this.elements.weeklyHistory.innerHTML = '<p class="no-history">No weekly history yet. Complete your first week to see results here!</p>';
            return;
        }
        
        const sortedHistory = weeklyHistory.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
        
        this.elements.weeklyHistory.innerHTML = sortedHistory.map(week => {
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

    updateAnalyticsDisplay(analytics) {
        if (!this.elements.advancedAnalytics || !analytics) return;

        this.elements.advancedAnalytics.innerHTML = `
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

    updateSyncDisplay(result, type) {
        let resultElement;
        
        if (type === 'export') {
            resultElement = this.elements.exportResult;
        } else if (type === 'import') {
            resultElement = this.elements.importResult;
        }
        
        if (!resultElement) return;
        
        if (result.success) {
            resultElement.innerHTML = `
                <div class="sync-success">
                    <strong>Success!</strong> ${result.message || 'Operation completed successfully'}
                </div>
            `;
        } else {
            resultElement.innerHTML = `
                <div class="sync-error">
                    <strong>Error:</strong> ${result.error}
                </div>
            `;
        }
    }

    clearSyncResults() {
        if (this.elements.exportResult) {
            this.elements.exportResult.innerHTML = '';
        }
        if (this.elements.importResult) {
            this.elements.importResult.innerHTML = '';
        }
    }

    // Utility methods
    showElement(element) {
        if (element) {
            element.style.display = 'block';
        }
    }

    hideElement(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    toggleElement(element) {
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }
}

// Export for use in other modules
window.DisplayManager = DisplayManager;