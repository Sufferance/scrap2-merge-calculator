// Analytics Service - handles all analytics calculations and predictions
class AnalyticsService {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    getAdvancedAnalytics() {
        const stats = this.dataManager.getWeeklyStats();
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
        const weeklyHistory = this.dataManager.getWeeklyHistory();
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
        const weeklyHistory = this.dataManager.getWeeklyHistory();
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
        const weeklyHistory = this.dataManager.getWeeklyHistory();
        if (weeklyHistory.length < 2) return null;

        const recentWeeks = weeklyHistory.slice(-4); // Last 4 weeks
        const trend = this.calculateTrend(recentWeeks);
        
        const currentMerges = this.dataManager.getCurrentMerges();
        const weekStartDate = this.dataManager.getWeekStartDate();
        const weekEndDate = this.dataManager.getWeekEndDate();
        
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
        const targetGoal = this.dataManager.getTargetGoal();
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
        const weekEndDate = this.dataManager.getWeekEndDate();
        const timeRemaining = weekEndDate - now;
        const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
        const mergesRemaining = Math.max(0, this.dataManager.getTargetGoal() - this.dataManager.getCurrentMerges());
        
        return Math.ceil(mergesRemaining / Math.max(1, daysRemaining));
    }

    estimateCompletionDate() {
        const currentMerges = this.dataManager.getCurrentMerges();
        const targetGoal = this.dataManager.getTargetGoal();
        const mergeRatePer10Min = this.dataManager.getMergeRatePer10Min();
        
        if (currentMerges >= targetGoal) return new Date();
        
        const mergesRemaining = targetGoal - currentMerges;
        const currentRate = mergeRatePer10Min * 6; // per hour
        const hoursNeeded = mergesRemaining / currentRate;
        
        return new Date(Date.now() + hoursNeeded * 60 * 60 * 1000);
    }

    generateRecommendations() {
        const recommendations = [];
        const stats = this.dataManager.getWeeklyStats();
        
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
        const currentMerges = this.dataManager.getCurrentMerges();
        const targetGoal = this.dataManager.getTargetGoal();
        const weekStartDate = this.dataManager.getWeekStartDate();
        const weekEndDate = this.dataManager.getWeekEndDate();
        
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


        return recommendations;
    }

    generateInsights() {
        const insights = [];
        const stats = this.dataManager.getWeeklyStats();
        
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
        const weekStartDate = this.dataManager.getWeekStartDate();
        const weekEndDate = this.dataManager.getWeekEndDate();
        const currentMerges = this.dataManager.getCurrentMerges();
        const targetGoal = this.dataManager.getTargetGoal();
        
        const weekProgress = (now - weekStartDate) / (weekEndDate - weekStartDate);
        const goalProgress = currentMerges / targetGoal;
        
        if (goalProgress > weekProgress * 1.2) {
            insights.push('You\'re ahead of schedule this week! Great pace.');
        } else if (goalProgress < weekProgress * 0.8) {
            insights.push('You\'re behind schedule. Consider increasing your daily play time.');
        }

        return insights;
    }
}

// Export for use in other modules
window.AnalyticsService = AnalyticsService;