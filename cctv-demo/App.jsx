import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import CctvDashboard from './modules/cctv/CctvDashboard.jsx';
import VcDashboard from './modules/vc/VcDashboard.jsx';
import AlertsDrawer from './modules/cctv/AlertsDrawer.jsx';

export default function App() {
    const [activeTab, setActiveTab] = useState('cctv');
    const [projects, setProjects] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [isAlertsOpen, setIsAlertsOpen] = useState(false);

    const fetchGlobalData = async () => {
        try {
            const [projRes, inspRes, alertRes] = await Promise.all([
                fetch('http://localhost:5000/api/projects'),
                fetch('http://localhost:5000/api/inspections'),
                fetch('http://localhost:5000/api/alerts'),
            ]);

            const projData = await projRes.json();
            const inspData = await inspRes.json();
            const alertData = await alertRes.json();

            if (projData.success) setProjects(projData.data);
            if (inspData.success) setInspections(inspData.data);
            if (alertData.success) setAlerts(alertData.data);
        } catch (err) {
            console.error('Failed to fetch initial application state:', err);
        }
    };

    useEffect(() => {
        fetchGlobalData();
        const interval = setInterval(fetchGlobalData, 10000);
        return () => clearInterval(interval);
    }, []);

    const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                unreadAlertsCount={unreadAlertsCount}
                onOpenAlerts={() => setIsAlertsOpen(true)}
            />

            <main style={{ flex: 1 }}>
                {activeTab === 'cctv' ? (
                    <CctvDashboard
                        projects={projects}
                        onOpenAlerts={() => setIsAlertsOpen(true)}
                    />
                ) : (
                    <VcDashboard
                        inspections={inspections}
                        projects={projects}
                    />
                )}
            </main>

            {/* Alerts Drawer */}
            {isAlertsOpen && (
                <AlertsDrawer
                    alerts={alerts}
                    onClose={() => setIsAlertsOpen(false)}
                    onRefreshAlerts={fetchGlobalData}
                />
            )}
        </div>
    );
}
