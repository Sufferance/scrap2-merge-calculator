// Scrap Calculator - Main Application Entry Point
// Clean, modular architecture with separated concerns

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the main application controller
    window.scrapCalculator = new AppController();
    
    // Log successful initialization
    console.log('Scrap Calculator initialized with new architecture');
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

