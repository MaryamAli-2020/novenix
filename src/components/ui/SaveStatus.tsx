import React from 'react';
import { Check, X, Loader2, Wifi, WifiOff } from 'lucide-react';

interface SaveStatusProps {
    status: 'idle' | 'saving' | 'success' | 'error' | 'offline';
    className?: string;
}

const SaveStatus: React.FC<SaveStatusProps> = ({ status, className = '' }) => {
    const getStatusDisplay = () => {
        switch (status) {
            case 'saving':
                return (
                    <div className="flex items-center text-blue-500" title="Saving...">
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        <span className="text-sm">Saving...</span>
                    </div>
                );
            case 'success':
                return (
                    <div className="flex items-center text-green-500" title="Saved">
                        <Check className="w-4 h-4 mr-1" />
                        <span className="text-sm">Saved</span>
                    </div>
                );
            case 'error':
                return (
                    <div className="flex items-center text-red-500" title="Save failed">
                        <X className="w-4 h-4 mr-1" />
                        <span className="text-sm">Save failed</span>
                    </div>
                );
            case 'offline':
                return (
                    <div className="flex items-center text-yellow-500" title="Offline - Changes will be saved when connection is restored">
                        <WifiOff className="w-4 h-4 mr-1" />
                        <span className="text-sm">Offline</span>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="flex items-center text-gray-400" title="Connected">
                        <Wifi className="w-4 h-4 mr-1" />
                        <span className="text-sm">Connected</span>
                    </div>
                );
        }
    };

    return (
        <div className={`fixed bottom-4 right-4 p-2 rounded-lg bg-white shadow-lg ${className}`}>
            {getStatusDisplay()}
        </div>
    );
};

export default SaveStatus; 