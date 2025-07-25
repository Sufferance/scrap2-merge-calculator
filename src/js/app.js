// Scrap Calculator - Main Application Entry Point
// Clean, modular architecture with separated concerns

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the main application controller
    window.scrapCalculator = new AppController();
    
});

// Service Worker registration (basic PWA setup)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
            })
            .catch(registrationError => {
            });
    });
}

// Export methods for backward compatibility and external access
window.ScrapCalculatorAPI = {
    async clearData() {
        return await window.scrapCalculator.clearData();
    },
    
    async exportData() {
        return await window.scrapCalculator.exportData();
    },
    
    getServices() {
        return window.scrapCalculator.getServices();
    },
    
    debugState() {
        window.scrapCalculator.debugState();
    }
};

