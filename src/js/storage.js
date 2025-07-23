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
                console.log('Database opened successfully');
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
        if (oldVersion < 3) {
            this.createStreakObjectStore();
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

    createStreakObjectStore() {
        // Streak summary store (added in version 3)
        if (!this.db.objectStoreNames.contains('streakSummary')) {
            const streakStore = this.db.createObjectStore('streakSummary', { keyPath: 'id' });
            console.log('Created streakSummary object store');
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
            if (this.db.objectStoreNames.contains('streakSummary')) {
                storeNames.push('streakSummary');
            }
            const transaction = this.db.transaction(storeNames, 'readwrite');
            
            const currentProgressStore = transaction.objectStore('currentProgress');
            const settingsStore = transaction.objectStore('settings');
            const historyStore = transaction.objectStore('weeklyHistory');
            
            const clearPromises = [
                currentProgressStore.clear(),
                settingsStore.clear(),
                historyStore.clear()
            ];
            
            if (this.db.objectStoreNames.contains('streakSummary')) {
                const streakStore = transaction.objectStore('streakSummary');
                clearPromises.push(streakStore.clear());
            }
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async exportData() {
        if (!this.isInitialized) await this.initialize();

        const currentProgress = await this.loadCurrentProgress();
        const weeklyHistory = await this.loadWeeklyHistory();
        let streakSummary = null;
        
        if (this.db.objectStoreNames.contains('streakSummary')) {
            streakSummary = await this.loadStreakSummary();
        }
        
        return {
            currentProgress,
            weeklyHistory,
            streakSummary,
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
        
        if (data.streakSummary && this.db.objectStoreNames.contains('streakSummary')) {
            await this.saveStreakSummary(data.streakSummary);
        }
    }

    async saveStreakSummary(streakData) {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['streakSummary'], 'readwrite');
            const store = transaction.objectStore('streakSummary');
            
            const data = {
                id: 'current',
                ...streakData,
                lastUpdated: new Date().toISOString()
            };

            const request = store.put(data);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadStreakSummary() {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['streakSummary'], 'readonly');
            const store = transaction.objectStore('streakSummary');
            const request = store.get('current');
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Export for use in main app
window.StorageManager = new StorageManager();