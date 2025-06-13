import React from 'react';

interface ErrorDisplayProps {
    message: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-red-500 text-xl">{message}</div>
        </div>
    );
};

export default ErrorDisplay; 