// Sync Code System for Cross-Device Synchronization
class SyncManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.syncServerURL = 'https://api.scraps-calculator.com/sync'; // Mock URL
        this.syncCodes = new Map(); // Mock server storage
        this.expirationTime = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    }

    // Generate a 6-character alphanumeric sync code
    generateSyncCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        return code;
    }

    // Encrypt data before uploading (simplified encryption)
    encryptData(data) {
        // In a real app, use proper encryption like AES
        // This is a simple base64 encoding for demonstration
        const jsonString = JSON.stringify(data);
        return btoa(jsonString);
    }

    // Decrypt data after downloading
    decryptData(encryptedData) {
        try {
            const jsonString = atob(encryptedData);
            return JSON.parse(jsonString);
        } catch (error) {
            throw new Error('Invalid encrypted data');
        }
    }

    // Upload data and generate sync code
    async uploadData() {
        try {
            // Export all data from storage
            const data = await this.storage.exportData();
            
            // Add sync metadata
            const syncData = {
                ...data,
                syncVersion: 1,
                deviceId: this.getDeviceId(),
                uploadedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.expirationTime).toISOString()
            };

            // Encrypt the data
            const encryptedData = this.encryptData(syncData);
            
            // Generate unique sync code
            let syncCode;
            do {
                syncCode = this.generateSyncCode();
            } while (this.syncCodes.has(syncCode));

            // Mock server upload (in real app, use fetch to actual server)
            await this.mockServerUpload(syncCode, encryptedData);
            
            // Store sync code locally for reference
            await this.storage.saveSetting('lastSyncCode', syncCode);
            await this.storage.saveSetting('lastSyncTime', new Date().toISOString());
            
            return {
                syncCode: syncCode,
                expiresAt: syncData.expiresAt,
                success: true
            };
        } catch (error) {
            console.error('Upload failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Download data using sync code
    async downloadData(syncCode) {
        try {
            if (!syncCode || syncCode.length !== 6) {
                throw new Error('Invalid sync code format');
            }

            // Mock server download
            const encryptedData = await this.mockServerDownload(syncCode);
            
            if (!encryptedData) {
                throw new Error('Sync code not found or expired');
            }

            // Decrypt the data
            const syncData = this.decryptData(encryptedData);
            
            // Check if data is expired
            if (new Date(syncData.expiresAt) < new Date()) {
                throw new Error('Sync data has expired');
            }

            // Import data to local storage
            await this.storage.importData(syncData);
            
            // Update sync tracking
            await this.storage.saveSetting('lastSyncCode', syncCode);
            await this.storage.saveSetting('lastSyncTime', new Date().toISOString());
            
            return {
                success: true,
                data: syncData,
                deviceId: syncData.deviceId,
                uploadedAt: syncData.uploadedAt
            };
        } catch (error) {
            console.error('Download failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mock server upload (replace with real server call in production)
    async mockServerUpload(syncCode, encryptedData) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Store in mock server
        this.syncCodes.set(syncCode, {
            data: encryptedData,
            uploadedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.expirationTime).toISOString()
        });
        
        return true;
    }

    // Mock server download (replace with real server call in production)
    async mockServerDownload(syncCode) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const syncEntry = this.syncCodes.get(syncCode);
        
        if (!syncEntry) {
            return null;
        }
        
        // Check if expired
        if (new Date(syncEntry.expiresAt) < new Date()) {
            this.syncCodes.delete(syncCode);
            return null;
        }
        
        return syncEntry.data;
    }

    // Get or create device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('scrapCalc_deviceId');
        
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('scrapCalc_deviceId', deviceId);
        }
        
        return deviceId;
    }

    // Get sync status
    async getSyncStatus() {
        try {
            const lastSyncCode = await this.storage.loadSetting('lastSyncCode');
            const lastSyncTime = await this.storage.loadSetting('lastSyncTime');
            
            return {
                hasSync: !!lastSyncCode,
                lastSyncCode: lastSyncCode,
                lastSyncTime: lastSyncTime ? new Date(lastSyncTime) : null,
                deviceId: this.getDeviceId()
            };
        } catch (error) {
            console.error('Error getting sync status:', error);
            return {
                hasSync: false,
                lastSyncCode: null,
                lastSyncTime: null,
                deviceId: this.getDeviceId()
            };
        }
    }

    // Clear sync data
    async clearSyncData() {
        try {
            await this.storage.saveSetting('lastSyncCode', null);
            await this.storage.saveSetting('lastSyncTime', null);
            return true;
        } catch (error) {
            console.error('Error clearing sync data:', error);
            return false;
        }
    }

    // Validate sync code format
    validateSyncCode(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }
        
        if (code.length !== 6) {
            return false;
        }
        
        // Check if all characters are alphanumeric
        return /^[A-Z0-9]+$/.test(code);
    }

    // Auto-sync functionality (for future enhancement)
    async scheduleAutoSync() {
        const syncStatus = await this.getSyncStatus();
        
        if (!syncStatus.hasSync) {
            return;
        }
        
        // Auto-sync every 5 minutes if there's a sync code
        setInterval(async () => {
            try {
                const result = await this.uploadData();
                if (result.success) {
                    console.log('Auto-sync completed successfully');
                }
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
}

// Initialize sync manager
document.addEventListener('DOMContentLoaded', () => {
    // Wait for storage to be ready
    setTimeout(() => {
        if (window.StorageManager) {
            window.syncManager = new SyncManager(window.StorageManager);
        }
    }, 100);
});