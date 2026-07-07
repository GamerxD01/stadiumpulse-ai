import React, { useState } from 'react';
import useSimulatorState from './hooks/useSimulatorState';
import useAlerts from './hooks/useAlerts';
import useChat from './hooks/useChat';
import useStaffBriefing from './hooks/useStaffBriefing';

import ErrorBanner from './components/shared/ErrorBanner';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import Footer from './components/layout/Footer';
import FanCompanionChat from './components/fan-companion/FanCompanionChat';
import StaffCopilotFeed from './components/staff-copilot/StaffCopilotFeed';
import OrganizerDashboard from './components/organizer-dashboard/OrganizerDashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState('fan');
  const [language, setLanguage] = useState('English');
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // Custom State/API Hooks
  const { stadiumState, isServerOffline, activeSpikeType, triggerSimulatorSpike } = useSimulatorState();
  const {
    alerts,
    explainingAlertId,
    alertExplanation,
    loadingExplanation,
    setExplainingAlertId,
    explainIncidentAlert
  } = useAlerts(isServerOffline, activeSpikeType);
  const { messages, chatInput, sendingChat, setChatInput, setMessages, handleSendMessage } = useChat(
    isServerOffline,
    accessibilityMode,
    stadiumState,
    language
  );
  const {
    shiftBriefing,
    loadingShift,
    sustainabilityReport,
    loadingSustainability,
    generateShiftBriefing,
    generateSustainabilityBriefing
  } = useStaffBriefing(isServerOffline, language);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {isServerOffline && <ErrorBanner />}

      <Header alerts={alerts} stadiumState={stadiumState}>
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} alertsCount={alerts.length} />
      </Header>

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6" tabIndex="-1">
        {activeTab === 'fan' && (
          <FanCompanionChat
            language={language}
            setLanguage={setLanguage}
            accessibilityMode={accessibilityMode}
            setAccessibilityMode={setAccessibilityMode}
            stadiumState={stadiumState}
            messages={messages}
            setMessages={setMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendingChat={sendingChat}
            handleSendMessage={handleSendMessage}
          />
        )}

        {activeTab === 'staff' && (
          <StaffCopilotFeed
            alerts={alerts}
            language={language}
            triggerSpike={triggerSimulatorSpike}
            onExplain={explainIncidentAlert}
            explainingAlertId={explainingAlertId}
            alertExplanation={alertExplanation}
            loadingExplanation={loadingExplanation}
            setExplainingAlertId={setExplainingAlertId}
          />
        )}

        {activeTab === 'organizer' && (
          <OrganizerDashboard
            stadiumState={stadiumState}
            shiftBriefing={shiftBriefing}
            loadingShift={loadingShift}
            onGenerateShiftBriefing={generateShiftBriefing}
            sustainabilityReport={sustainabilityReport}
            loadingSustainability={loadingSustainability}
            onGenerateSustainabilityBriefing={generateSustainabilityBriefing}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
