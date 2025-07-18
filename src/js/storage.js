// IndexedDB Storage Manager for Scrap Calculator
class StorageManager {
    constructor() {
        this.dbName = 'ScrapCalculatorDB';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createObjectStores();
            };
        });
    }

    createObjectStores() {
        // Current progress store
        if (!this.db.objectStoreNames.contains('currentProgress')) {
            const currentProgressStore = this.db.createObjectStore('currentProgress', { keyPath: 'id' });
            currentProgressStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Settings store
        if (!this.db.objectStoreNames.contains('settings')) {
            const settingsStore = this.db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Weekly history store (for future Phase 2)
        if (!this.db.objectStoreNames.contains('weeklyHistory')) {
            const historyStore = this.db.createObjectStore('weeklyHistory', { keyPath: 'weekId' });
            historyStore.createIndex('weekStart', 'weekStart', { unique: false });
            historyStore.createIndex('completed', 'completed', { unique: false });
        }
    }

    async saveCurrentProgress(progressData) {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['currentProgress'], 'readwrite');
            const store = transaction.objectStore('currentProgress');
            
            const data = {
                id: 'current',
                currentMerges: progressData.currentMerges,
                mergeRatePer10Min: progressData.mergeRatePer10Min,
                targetGoal: progressData.targetGoal,
                weekStartDate: progressData.weekStartDate,
                weekEndDate: progressData.weekEndDate,
                dailyHistory: progressData.dailyHistory,
                lastUpdated: new Date().toISOString()
            };

            const request = store.put(data);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadCurrentProgress() {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['currentProgress'], 'readonly');
            const store = transaction.objectStore('currentProgress');
            const request = store.get('current');
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveSetting(key, value) {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            
            const request = store.put({ key, value, lastUpdated: new Date().toISOString() });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadSetting(key) {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }

    async saveWeeklyHistory(weekData) {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['weeklyHistory'], 'readwrite');
            const store = transaction.objectStore('weeklyHistory');
            
            const request = store.put(weekData);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadWeeklyHistory() {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['weeklyHistory'], 'readonly');
            const store = transaction.objectStore('weeklyHistory');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllData() {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['currentProgress', 'settings', 'weeklyHistory'], 'readwrite');
            
            const currentProgressStore = transaction.objectStore('currentProgress');
            const settingsStore = transaction.objectStore('settings');
            const historyStore = transaction.objectStore('weeklyHistory');
            
            const clearPromises = [
                currentProgressStore.clear(),
                settingsStore.clear(),
                historyStore.clear()
            ];
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async exportData() {
        if (!this.isInitialized) await this.initialize();

        const currentProgress = await this.loadCurrentProgress();
        const weeklyHistory = await this.loadWeeklyHistory();
        
        return {
            currentProgress,
            weeklyHistory,
            exportedAt: new Date().toISOString(),
            version: 1
        };
    }

    async importData(data) {
        if (!this.isInitialized) await this.initialize();

        if (data.currentProgress) {
            await this.saveCurrentProgress(data.currentProgress);
        }

        if (data.weeklyHistory && Array.isArray(data.weeklyHistory)) {
            for (const weekData of data.weeklyHistory) {
                await this.saveWeeklyHistory(weekData);
            }
        }
    }
}

// Fallback to localStorage if IndexedDB is not available
class FallbackStorage {
    constructor() {
        this.prefix = 'scrapCalc_';
    }

    async initialize() {
        return Promise.resolve();
    }

    async saveCurrentProgress(progressData) {
        const data = {
            id: 'current',
            currentMerges: progressData.currentMerges,
            mergeRatePer10Min: progressData.mergeRatePer10Min,
            targetGoal: progressData.targetGoal,
            weekStartDate: progressData.weekStartDate,
            weekEndDate: progressData.weekEndDate,
            dailyHistory: progressData.dailyHistory,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem(this.prefix + 'currentProgress', JSON.stringify(data));
        return Promise.resolve();
    }

    async loadCurrentProgress() {
        const data = localStorage.getItem(this.prefix + 'currentProgress');
        return Promise.resolve(data ? JSON.parse(data) : null);
    }

    async saveSetting(key, value) {
        localStorage.setItem(this.prefix + 'setting_' + key, JSON.stringify(value));
        return Promise.resolve();
    }

    async loadSetting(key) {
        const data = localStorage.getItem(this.prefix + 'setting_' + key);
        return Promise.resolve(data ? JSON.parse(data) : null);
    }

    async saveWeeklyHistory(weekData) {
        const existing = JSON.parse(localStorage.getItem(this.prefix + 'weeklyHistory') || '[]');
        const index = existing.findIndex(w => w.weekId === weekData.weekId);
        
        if (index >= 0) {
            existing[index] = weekData;
        } else {
            existing.push(weekData);
        }
        
        localStorage.setItem(this.prefix + 'weeklyHistory', JSON.stringify(existing));
        return Promise.resolve();
    }

    async loadWeeklyHistory() {
        const data = localStorage.getItem(this.prefix + 'weeklyHistory');
        return Promise.resolve(data ? JSON.parse(data) : []);
    }

    async clearAllData() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
        keys.forEach(key => localStorage.removeItem(key));
        return Promise.resolve();
    }

    async exportData() {
        const currentProgress = await this.loadCurrentProgress();
        const weeklyHistory = await this.loadWeeklyHistory();
        
        return {
            currentProgress,
            weeklyHistory,
            exportedAt: new Date().toISOString(),
            version: 1
        };
    }

    async importData(data) {
        if (data.currentProgress) {
            await this.saveCurrentProgress(data.currentProgress);
        }

        if (data.weeklyHistory && Array.isArray(data.weeklyHistory)) {
            for (const weekData of data.weeklyHistory) {
                await this.saveWeeklyHistory(weekData);
            }
        }
    }
}

// Factory function to create appropriate storage manager
function createStorageManager() {
    if ('indexedDB' in window) {
        return new StorageManager();
    } else {
        console.warn('IndexedDB not available, falling back to localStorage');
        return new FallbackStorage();
    }
}

// Export for use in main app
window.StorageManager = createStorageManager();