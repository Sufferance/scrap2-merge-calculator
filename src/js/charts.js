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
        this.createWeeklyTrendChart();
        this.createDailyProgressChart();
        this.createAchievementChart();
        this.createComparisonChart();
    }

    createWeeklyTrendChart() {
        const canvas = document.getElementById('weekly-trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const history = this.app.weeklyHistory;
        
        if (history.length === 0) {
            this.showNoDataMessage(canvas, 'No weekly data available yet');
            return;
        }

        const sortedHistory = history.sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
        const labels = sortedHistory.map(week => {
            const date = new Date(week.weekStart);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Weekly Merges',
                    data: sortedHistory.map(week => week.finalMerges),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                },
                {
                    label: 'Target Goal',
                    data: sortedHistory.map(week => week.targetGoal),
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
        const dailyProgress = this.app.calculateDailyProgress();
        
        if (dailyProgress.length === 0) {
            this.showNoDataMessage(canvas, 'No daily data available yet');
            return;
        }

        const labels = dailyProgress.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });

        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Daily Merges',
                    data: dailyProgress.map(day => day.merges),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1
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
                    }
                }
            }
        });
    }

    createAchievementChart() {
        const canvas = document.getElementById('achievement-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const history = this.app.weeklyHistory;
        
        if (history.length === 0) {
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

        const dailyProgress = this.app.calculateDailyProgress();
        
        if (dailyProgress.length === 0) {
            this.charts.dailyProgress.destroy();
            this.charts.dailyProgress = null;
            return;
        }

        const labels = dailyProgress.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });

        this.charts.dailyProgress.data.labels = labels;
        this.charts.dailyProgress.data.datasets[0].data = dailyProgress.map(day => day.merges);
        this.charts.dailyProgress.update('none');
    }

    updateWeeklyTrendChart() {
        if (!this.charts.weeklyTrend) {
            this.createWeeklyTrendChart();
            return;
        }

        const history = this.app.weeklyHistory;
        
        if (history.length === 0) {
            this.charts.weeklyTrend.destroy();
            this.charts.weeklyTrend = null;
            return;
        }

        const sortedHistory = history.sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
        const labels = sortedHistory.map(week => {
            const date = new Date(week.weekStart);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        this.charts.weeklyTrend.data.labels = labels;
        this.charts.weeklyTrend.data.datasets[0].data = sortedHistory.map(week => week.finalMerges);
        this.charts.weeklyTrend.data.datasets[1].data = sortedHistory.map(week => week.targetGoal);
        this.charts.weeklyTrend.update('none');
    }

    updateAchievementChart() {
        if (!this.charts.achievement) {
            this.createAchievementChart();
            return;
        }

        const history = this.app.weeklyHistory;
        
        if (history.length === 0) {
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

        const history = this.app.weeklyHistory;
        
        if (history.length === 0) {
            this.charts.comparison.destroy();
            this.charts.comparison = null;
            return;
        }

        const weeks = 4;
        const recentWeeks = history
            .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))
            .slice(0, weeks);

        const labels = recentWeeks.reverse().map(week => {
            const date = new Date(week.weekStart);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        this.charts.comparison.data.labels = labels;
        this.charts.comparison.data.datasets[0].data = recentWeeks.map(week => week.achievementRate);
        this.charts.comparison.data.datasets[0].backgroundColor = recentWeeks.map(week => 
            week.completed ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)'
        );
        this.charts.comparison.data.datasets[0].borderColor = recentWeeks.map(week => 
            week.completed ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)'
        );
        this.charts.comparison.update('none');
    }

    createComparisonChart(weeks = 4) {
        const canvas = document.getElementById('comparison-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const history = this.app.weeklyHistory;
        
        if (history.length === 0) {
            this.showNoDataMessage(canvas, 'No comparison data available yet');
            return;
        }

        const recentWeeks = history
            .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))
            .slice(0, weeks);

        const labels = recentWeeks.reverse().map(week => {
            const date = new Date(week.weekStart);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Achievement Rate (%)',
                    data: recentWeeks.map(week => week.achievementRate),
                    backgroundColor: recentWeeks.map(week => 
                        week.completed ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)'
                    ),
                    borderColor: recentWeeks.map(week => 
                        week.completed ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)'
                    ),
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