// IndexedDB Storage Manager for Scrap Calculator
class StorageManager {
    constructor() {
        this.dbName = 'ScrapCalculatorDB';
        this.dbVersion = 3;
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
                resolve();
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.handleDatabaseUpgrade(event.oldVersion);
            };
        });
    }

    handleDatabaseUpgrade(oldVersion) {
        // Handle incremental database upgrades
        if (oldVersion < 1) {
            this.createInitialObjectStores();
        }
    }

    createInitialObjectStores() {
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
            const storeNames = ['currentProgress', 'settings', 'weeklyHistory'];
            const transaction = this.db.transaction(storeNames, 'readwrite');
            
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
            version: 3
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

// Export for use in main app
window.StorageManager = new StorageManager();