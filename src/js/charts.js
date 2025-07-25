// Chart.js Integration for Progress Visualizations
class ProgressCharts {
    constructor(scrapCalculator) {
        this.app = scrapCalculator;
        this.charts = {};
        this.updateTimeout = null;
        this.initializeCharts();
    }

    initializeCharts() {
        // Initialize charts after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createCharts();
            });
        } else {
            this.createCharts();
        }
    }

    createCharts() {
        this.createDailyProgressChart();
        this.createWeeklyTrendChart();
        this.createAchievementChart();
        this.createComparisonChart();
    }

    createWeeklyTrendChart() {
        const canvas = document.getElementById('weekly-trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const combinedData = this.app.services ? this.app.services.data.getCombinedWeeklyData() : [];
        
        if (!combinedData || combinedData.length === 0) {
            this.showNoDataMessage(canvas, 'No weekly data available yet');
            return;
        }

        const labels = combinedData.map(week => {
            const date = new Date(week.weekStart);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return week.isCurrentWeek ? `${label} (Current)` : label;
        });

        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Weekly Merges',
                    data: combinedData.map(week => week.finalMerges),
                    borderColor: combinedData.map(week => 
                        week.isCurrentWeek ? 'rgb(255, 165, 0)' : 'rgb(75, 192, 192)'
                    ),
                    backgroundColor: combinedData.map(week => 
                        week.isCurrentWeek ? 'rgba(255, 165, 0, 0.2)' : 'rgba(75, 192, 192, 0.2)'
                    ),
                    pointBackgroundColor: combinedData.map(week => 
                        week.isCurrentWeek ? 'rgb(255, 165, 0)' : 'rgb(75, 192, 192)'
                    ),
                    pointBorderColor: combinedData.map(week => 
                        week.isCurrentWeek ? 'rgb(255, 140, 0)' : 'rgb(53, 162, 235)'
                    ),
                    tension: 0.1
                },
                {
                    label: 'Target Goal',
                    data: combinedData.map(week => week.targetGoal),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderDash: [5, 5],
                    tension: 0.1
                }
            ]
        };

        this.charts.weeklyTrend = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Merges'
                        }
                    },
                    x: {
                        title: {
                            display: true,  
                            text: 'Week Starting'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Progress Trend'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                const weekData = combinedData[index];
                                const tooltipData = this.app.services.data.getWeeklyTooltipData(weekData.weekId, weekData);
                                return `${tooltipData.weekType}: ${tooltipData.dateRange}`;
                            },
                            label: (context) => {
                                const index = context.dataIndex;
                                const weekData = combinedData[index];
                                const tooltipData = this.app.services.data.getWeeklyTooltipData(weekData.weekId, weekData);
                                
                                if (context.datasetIndex === 0) {
                                    return `Merges: ${tooltipData.merges} (${tooltipData.status})`;
                                } else {
                                    return `Target: ${tooltipData.target}`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    createDailyProgressChart() {
        const canvas = document.getElementById('daily-progress-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Get current week daily progress
        const dailyProgress = this.app.services ? this.app.services.data.getDailyProgress() : (this.app.calculateDailyProgress ? this.app.calculateDailyProgress() : []);
        
        if (!dailyProgress || dailyProgress.length === 0) {
            this.showNoDataMessage(canvas, 'No daily data available yet');
            return;
        }

        const labels = dailyProgress.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });

        // Calculate achievement indicators for each day
        const targetGoal = this.app.services ? this.app.services.data.state.targetGoal : 50000;
        const achievementData = dailyProgress.map(day => {
            const dailyTarget = Math.ceil(targetGoal / 7);
            return day.merges >= dailyTarget ? day.merges : null;
        });

        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Daily Merges',
                    data: dailyProgress.map(day => day.merges),
                    backgroundColor: dailyProgress.map(day => {
                        const dailyTarget = Math.ceil(targetGoal / 7);
                        const achieved = day.merges >= dailyTarget;
                        return achieved ? 'rgba(102, 187, 106, 0.8)' : 'rgba(54, 162, 235, 0.8)';
                    }),
                    borderColor: dailyProgress.map(day => {
                        const dailyTarget = Math.ceil(targetGoal / 7);
                        const achieved = day.merges >= dailyTarget;
                        return achieved ? 'rgb(102, 187, 106)' : 'rgb(54, 162, 235)';
                    }),
                    borderWidth: 1
                },
                {
                    label: 'Daily Target',
                    data: dailyProgress.map(() => Math.ceil(targetGoal / 7)),
                    type: 'line',
                    backgroundColor: 'rgba(255, 167, 38, 0.1)',
                    borderColor: 'rgb(255, 167, 38)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false
                }
            ]
        };

        this.charts.dailyProgress = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                },
                layout: {
                    padding: 0
                },
                animation: {
                    duration: 0
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Merges'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Day'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Progress (Current Week)'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            afterBody: function(tooltipItems) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                const dayData = dailyProgress[dataIndex];
                                const dailyTarget = Math.ceil(targetGoal / 7);
                                const achieved = dayData.merges >= dailyTarget;
                                
                                return [
                                    `Daily Target: ${dailyTarget.toLocaleString()}`,
                                    `Status: ${achieved ? '✅ Target Achieved' : '⭕ Below Target'}`
                                ];
                            },
                            labelColor: function(context) {
                                const dataIndex = context.dataIndex;
                                const dayData = dailyProgress[dataIndex];
                                const dailyTarget = Math.ceil(targetGoal / 7);
                                const achieved = dayData.merges >= dailyTarget;
                                
                                return {
                                    backgroundColor: achieved ? 'rgb(102, 187, 106)' : 'rgb(54, 162, 235)',
                                    borderColor: achieved ? 'rgb(102, 187, 106)' : 'rgb(54, 162, 235)'
                                };
                            }
                        }
                    }
                }
            }
        });
    }

    createAchievementChart() {
        const canvas = document.getElementById('achievement-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const history = this.app.services ? this.app.services.data.getWeeklyHistory() : (this.app.weeklyHistory || []);
        
        if (!history || history.length === 0) {
            this.showNoDataMessage(canvas, 'No achievement data available yet');
            return;
        }

        const completedWeeks = history.filter(week => week.completed).length;
        const incompleteWeeks = history.length - completedWeeks;

        const data = {
            labels: ['Completed', 'Incomplete'],
            datasets: [{
                data: [completedWeeks, incompleteWeeks],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(255, 99, 132, 0.8)'
                ],
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 99, 132)'
                ],
                borderWidth: 1
            }]
        };

        this.charts.achievement = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Goal Achievement Rate'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    showNoDataMessage(canvas, message) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, width / 2, height / 2);
    }

    updateCharts() {
        // Throttle chart updates to prevent excessive redraws
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            // Update charts efficiently without destroying them
            this.updateDailyProgressChart();
            this.updateWeeklyTrendChart();
            this.updateAchievementChart();
            this.updateComparisonChart();
        }, 100);
    }

    updateDailyProgressChart() {
        if (!this.charts.dailyProgress) {
            this.createDailyProgressChart();
            return;
        }

        const dailyProgress = this.app.services ? this.app.services.data.getDailyProgress() : (this.app.calculateDailyProgress ? this.app.calculateDailyProgress() : []);
        
        if (!dailyProgress || dailyProgress.length === 0) {
            this.charts.dailyProgress.destroy();
            this.charts.dailyProgress = null;
            return;
        }

        const labels = dailyProgress.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });

        // Update achievement indicators
        const targetGoal = this.app.services ? this.app.services.data.state.targetGoal : 50000;
        
        this.charts.dailyProgress.data.labels = labels;
        this.charts.dailyProgress.data.datasets[0].data = dailyProgress.map(day => day.merges);
        this.charts.dailyProgress.data.datasets[0].backgroundColor = dailyProgress.map(day => {
            const dailyTarget = Math.ceil(targetGoal / 7);
            const achieved = day.merges >= dailyTarget;
            return achieved ? 'rgba(102, 187, 106, 0.8)' : 'rgba(54, 162, 235, 0.8)';
        });
        this.charts.dailyProgress.data.datasets[0].borderColor = dailyProgress.map(day => {
            const dailyTarget = Math.ceil(targetGoal / 7);
            const achieved = day.merges >= dailyTarget;
            return achieved ? 'rgb(102, 187, 106)' : 'rgb(54, 162, 235)';
        });
        
        // Update daily target line
        if (this.charts.dailyProgress.data.datasets[1]) {
            this.charts.dailyProgress.data.datasets[1].data = dailyProgress.map(() => Math.ceil(targetGoal / 7));
        }
        
        this.charts.dailyProgress.update('none');
    }

    updateWeeklyTrendChart() {
        if (!this.charts.weeklyTrend) {
            this.createWeeklyTrendChart();
            return;
        }

        const combinedData = this.app.services ? this.app.services.data.getCombinedWeeklyData() : [];
        
        if (!combinedData || combinedData.length === 0) {
            this.charts.weeklyTrend.destroy();
            this.charts.weeklyTrend = null;
            return;
        }

        const labels = combinedData.map(week => {
            const date = new Date(week.weekStart);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return week.isCurrentWeek ? `${label} (Current)` : label;
        });

        this.charts.weeklyTrend.data.labels = labels;
        this.charts.weeklyTrend.data.datasets[0].data = combinedData.map(week => week.finalMerges);
        this.charts.weeklyTrend.data.datasets[0].borderColor = combinedData.map(week => 
            week.isCurrentWeek ? 'rgb(255, 165, 0)' : 'rgb(75, 192, 192)'
        );
        this.charts.weeklyTrend.data.datasets[0].backgroundColor = combinedData.map(week => 
            week.isCurrentWeek ? 'rgba(255, 165, 0, 0.2)' : 'rgba(75, 192, 192, 0.2)'
        );
        this.charts.weeklyTrend.data.datasets[0].pointBackgroundColor = combinedData.map(week => 
            week.isCurrentWeek ? 'rgb(255, 165, 0)' : 'rgb(75, 192, 192)'
        );
        this.charts.weeklyTrend.data.datasets[0].pointBorderColor = combinedData.map(week => 
            week.isCurrentWeek ? 'rgb(255, 140, 0)' : 'rgb(53, 162, 235)'
        );
        this.charts.weeklyTrend.data.datasets[1].data = combinedData.map(week => week.targetGoal);
        this.charts.weeklyTrend.update('none');
    }

    updateAchievementChart() {
        if (!this.charts.achievement) {
            this.createAchievementChart();
            return;
        }

        const history = this.app.services ? this.app.services.data.getWeeklyHistory() : (this.app.weeklyHistory || []);
        
        if (!history || history.length === 0) {
            this.charts.achievement.destroy();
            this.charts.achievement = null;
            return;
        }

        const completedWeeks = history.filter(week => week.completed).length;
        const incompleteWeeks = history.length - completedWeeks;

        this.charts.achievement.data.datasets[0].data = [completedWeeks, incompleteWeeks];
        this.charts.achievement.update('none');
    }

    updateComparisonChart() {
        if (!this.charts.comparison) {
            this.createComparisonChart();
            return;
        }

        const combinedData = this.app.services ? this.app.services.data.getCombinedWeeklyData() : [];
        
        if (!combinedData || combinedData.length === 0) {
            this.charts.comparison.destroy();
            this.charts.comparison = null;
            return;
        }

        const weeks = 4;
        const recentWeeks = combinedData
            .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))
            .slice(0, weeks);

        const labels = recentWeeks.reverse().map(week => {
            const date = new Date(week.weekStart);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return week.isCurrentWeek ? `${label} (Current)` : label;
        });

        this.charts.comparison.data.labels = labels;
        this.charts.comparison.data.datasets[0].data = recentWeeks.map(week => week.achievementRate);
        this.charts.comparison.data.datasets[0].backgroundColor = recentWeeks.map(week => {
            if (week.isCurrentWeek) {
                return week.completed ? 'rgba(255, 165, 0, 0.8)' : 'rgba(255, 140, 0, 0.8)';
            }
            return week.completed ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)';
        });
        this.charts.comparison.data.datasets[0].borderColor = recentWeeks.map(week => {
            if (week.isCurrentWeek) {
                return week.completed ? 'rgb(255, 165, 0)' : 'rgb(255, 140, 0)';
            }
            return week.completed ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)';
        });
        this.charts.comparison.update('none');
    }

    createComparisonChart(weeks = 4) {
        const canvas = document.getElementById('comparison-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const combinedData = this.app.services ? this.app.services.data.getCombinedWeeklyData() : [];
        
        if (!combinedData || combinedData.length === 0) {
            this.showNoDataMessage(canvas, 'No comparison data available yet');
            return;
        }

        const recentWeeks = combinedData
            .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))
            .slice(0, weeks);

        const labels = recentWeeks.reverse().map(week => {
            const date = new Date(week.weekStart);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return week.isCurrentWeek ? `${label} (Current)` : label;
        });

        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Achievement Rate (%)',
                    data: recentWeeks.map(week => week.achievementRate),
                    backgroundColor: recentWeeks.map(week => {
                        if (week.isCurrentWeek) {
                            return week.completed ? 'rgba(255, 165, 0, 0.8)' : 'rgba(255, 140, 0, 0.8)';
                        }
                        return week.completed ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)';
                    }),
                    borderColor: recentWeeks.map(week => {
                        if (week.isCurrentWeek) {
                            return week.completed ? 'rgb(255, 165, 0)' : 'rgb(255, 140, 0)';
                        }
                        return week.completed ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)';
                    }),
                    borderWidth: 1
                }
            ]
        };

        this.charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Achievement Rate (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Week Starting'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Recent ${weeks} Weeks Performance` 
                    },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                const weekData = recentWeeks[index];
                                const tooltipData = this.app.services.data.getWeeklyTooltipData(weekData.weekId, weekData);
                                return `${tooltipData.weekType}: ${tooltipData.dateRange}`;
                            },
                            label: (context) => {
                                const index = context.dataIndex;
                                const weekData = recentWeeks[index];
                                const tooltipData = this.app.services.data.getWeeklyTooltipData(weekData.weekId, weekData);
                                return `Achievement: ${tooltipData.merges} / ${tooltipData.target} (${tooltipData.percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    exportChartAsImage(chartId) {
        const chart = this.charts[chartId];
        if (!chart) return;

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.href = url;
        link.download = `scrap-calculator-${chartId}.png`;
        link.click();
    }
}

// Initialize charts when the app is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to be initialized
    setTimeout(() => {
        if (window.scrapCalculator) {
            window.progressCharts = new ProgressCharts(window.scrapCalculator);
        }
    }, 100);
});