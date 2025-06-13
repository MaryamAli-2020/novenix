import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import SaveStatus from './ui/SaveStatus';
import { useStory } from '../context/StoryContext';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { state } = useStory();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsSidebarOpen(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
            <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className="flex min-h-[calc(100vh-3.5rem)]">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <main className="flex-1 p-6 lg:pl-[17rem]">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
            <SaveStatus status={state.saveStatus} />
        </div>
    );
};

export default Layout; 