import React, { useState } from 'react';
import useSimulatorState from './hooks/useSimulatorState';
import useAlerts from './hooks/useAlerts';
import useChat from './hooks/useChat';
import * as api from './services/api';

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
  const {
    messages,
    chatInput,
    sendingChat,
    setChatInput,
    setMessages,
    handleSendMessage
  } = useChat(isServerOffline, accessibilityMode, stadiumState);

  // Local briefing state
  const [shiftBriefing, setShiftBriefing] = useState('');
  const [loadingShift, setLoadingShift] = useState(false);
  const [sustainabilityReport, setSustainabilityReport] = useState('');
  const [loadingSustainability, setLoadingSustainability] = useState(false);

  const generateShiftBriefing = async () => {
    setLoadingShift(true);
    if (isServerOffline) {
      setTimeout(() => {
        setShiftBriefing(
          '• Operational briefing for shift handover:\n- Gate B turnstiles experienced a critical crowd density peak of 96%. Crowds have been successfully routed to Gates A/C/D.\n- Medical response treated an escalator incident near Gate C; escalators are back in operation.\n- Train transit congestion remains high; rideshare queues remain active at Zone 4.'
        );
        setLoadingShift(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchShiftBriefing();
      setShiftBriefing(data.briefing);
    } catch {
      setShiftBriefing('Error generating shift briefing.');
    } finally {
      setLoadingShift(false);
    }
  };

  const generateSustainabilityBriefing = async () => {
    setLoadingSustainability(true);
    if (isServerOffline) {
      setTimeout(() => {
        setSustainabilityReport(
          'The sustainability report indicates a solid 82.4% waste recycling diversion rate. Solar contribution added 8,400 kWh of clean power to the stadium grid. General grade: A-. One water anomaly: high usage reported at Concourse East restrooms, resolved by fixtures inspections.'
        );
        setLoadingSustainability(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchSustainabilityBriefing();
      setSustainabilityReport(data.report);
    } catch {
      setSustainabilityReport('Error generating sustainability summary.');
    } finally {
      setLoadingSustainability(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
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
