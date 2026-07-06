import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, ShieldAlert, BarChart3, Compass, Bus, AlertTriangle, 
  HelpCircle, Languages, Accessibility, Volume2, Send, RefreshCw, 
  Flame, Thermometer, UserCheck, Zap, Activity, Info
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [activeTab, setActiveTab] = useState('fan'); // fan, staff, organizer
  const [language, setLanguage] = useState('English');
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [stadiumState, setStadiumState] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  
  // Fan Chat State
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Welcome to MetLife Stadium for the FIFA World Cup 2026! How can I assist you today? (I support multilingual queries and accessible routing!)' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  // Staff State
  const [explainingAlertId, setExplainingAlertId] = useState(null);
  const [alertExplanation, setAlertExplanation] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // Organizer State
  const [shiftBriefing, setShiftBriefing] = useState('');
  const [loadingShift, setLoadingShift] = useState(false);
  const [sustainabilityReport, setSustainabilityReport] = useState('');
  const [loadingSustainability, setLoadingSustainability] = useState(false);

  // Poll stadium status and alerts every 4 seconds
  useEffect(() => {
    fetchStatus();
    fetchAlerts();

    const interval = setInterval(() => {
      fetchStatus();
      fetchAlerts();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll chat to bottom on new messages
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      if (res.ok) {
        const data = await res.json();
        setStadiumState(data);
      }
    } catch (err) {
      console.error('Error fetching stadium status:', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  // Chat Submission
  const handleSendMessage = async (textToSend = chatInput) => {
    const text = textToSend.trim();
    if (!text) return;

    // Add user message locally
    const updatedMessages = [...messages, { role: 'user', text }];
    setMessages(updatedMessages);
    setChatInput('');
    setSendingChat(true);

    // Format history for API (Gemini expects list of dicts with role and text)
    // Map 'model' to 'model' and 'user' to 'user'
    const history = updatedMessages.slice(0, -1).map(msg => ({
      role: msg.role,
      text: msg.text
    }));

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history,
          accessibility_mode: accessibilityMode
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'model', text: data.response, tools: data.tools_called }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an issue. Please try again.' }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'model', text: 'Network error. Make sure backend is running.' }]);
    } finally {
      setSendingChat(false);
    }
  };

  // Trigger Spikes
  const triggerSpike = async (type) => {
    try {
      await fetch(`${API_BASE}/trigger-spike`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spike_type: type })
      });
      fetchStatus();
      fetchAlerts();
    } catch (err) {
      console.error('Spike trigger error:', err);
    }
  };

  // Explain Alert with GenAI
  const explainAlert = async (alert) => {
    setExplainingAlertId(alert.incident_id);
    setLoadingExplanation(true);
    setAlertExplanation('');
    try {
      const res = await fetch(`${API_BASE}/explain-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert, language })
      });
      if (res.ok) {
        const data = await res.json();
        setAlertExplanation(data.explanation);
      } else {
        setAlertExplanation('Failed to generate explanation. Please try again.');
      }
    } catch (err) {
      setAlertExplanation('Error communicating with backend.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  // Generate shift briefing
  const generateShiftBriefing = async () => {
    setLoadingShift(true);
    try {
      const res = await fetch(`${API_BASE}/briefing/shift`);
      if (res.ok) {
        const data = await res.json();
        setShiftBriefing(data.briefing);
      }
    } catch (err) {
      setShiftBriefing('Error generating shift briefing.');
    } finally {
      setLoadingShift(false);
    }
  };

  // Generate sustainability briefing
  const generateSustainabilityBriefing = async () => {
    setLoadingSustainability(true);
    try {
      const res = await fetch(`${API_BASE}/briefing/sustainability`);
      if (res.ok) {
        const data = await res.json();
        setSustainabilityReport(data.report);
      }
    } catch (err) {
      setSustainabilityReport('Error generating sustainability summary.');
    } finally {
      setLoadingSustainability(false);
    }
  };

  // Predefined prompts for fan companion
  const suggestionPills = [
    { label: 'Accessible route to Section 102', value: 'How do I get to Section 102 from Gate A? I need elevator/step-free access.' },
    { label: 'Is Gate B turnstile busy?', value: 'What is the current crowd density at Gate B?' },
    { label: 'Next train back to Manhattan', value: 'What is the wait time and status for the Train right now?' },
    { label: '¿Cómo llegar a la salida? (ES)', value: '¿Cómo llegar a la salida principal desde el Seating Bowl en un camino sin escaleras?' }
  ];

  // Helper for rendering charts
  const getChartData = () => {
    if (!stadiumState) return [];
    return Object.entries(stadiumState.crowd_density).map(([name, density]) => ({
      name,
      density
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white flex items-center justify-center font-bold text-lg">
            SP
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              StadiumPulse AI
              <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
                FIFA 2026 Layer
              </span>
            </h1>
            <p className="text-xs text-slate-400">MetLife Stadium Operations & Assistant Hub</p>
          </div>
        </div>

        {/* Global Stats Tag */}
        <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${alerts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-xs font-semibold text-slate-300">
              {alerts.length > 0 ? `${alerts.length} Active Incidents` : 'Stadium Status Normal'}
            </span>
          </div>
          {stadiumState && (
            <div className="text-xs text-slate-400 border-l border-slate-800 pl-3 flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-indigo-400" />
              <span>{stadiumState.weather.temp}°C {stadiumState.weather.condition}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl">
          <button 
            onClick={() => setActiveTab('fan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'fan' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            Fan Companion
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'staff' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Staff Copilot Alert
            {alerts.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {alerts.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('organizer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'organizer' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Organizer Panel
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">

        {/* TAB 1: FAN COMPANION EXPERIENCE */}
        {activeTab === 'fan' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[500px]">
            {/* Left sidebar FAQ & settings */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Accessibility Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Accessibility className="w-4 h-4 text-indigo-400" />
                  Accessibility Settings
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enable accessibility mode to automatically route around stairwells and receive step-free navigation.
                </p>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">Step-free Ramps / Elevators Only</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={accessibilityMode} 
                      onChange={() => setAccessibilityMode(!accessibilityMode)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Language Selection Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Languages className="w-4 h-4 text-indigo-400" />
                  Select Chat Language
                </h3>
                <p className="text-xs text-slate-400">
                  The orchestrator detects language natively. Setting this enforces translation overlays.
                </p>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition duration-150 cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español (Spanish)</option>
                  <option value="Portuguese">Português (Portuguese)</option>
                  <option value="Arabic">العربية (Arabic)</option>
                  <option value="Hindi">हिन्दी (Hindi)</option>
                  <option value="French">Français (French)</option>
                  <option value="Japanese">日本語 (Japanese)</option>
                </select>
              </div>

              {/* Demo Incidents Quick Peek */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">MetLife Live Congestion</h3>
                {stadiumState ? (
                  <div className="flex flex-col gap-2">
                    {Object.entries(stadiumState.transit_status).map(([mode, info]) => (
                      <div key={mode} className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5 text-indigo-400" /> {mode}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            info.congestion === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            info.congestion === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                          }`}>
                            {info.congestion}
                          </span>
                          <span className="text-slate-400 font-medium">{info.wait_time_mins}m wait</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Connecting to simulator state...</p>
                )}
              </div>
            </div>

            {/* Chat Box Panel */}
            <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 overflow-hidden h-[600px] shadow-xl">
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">StadiumPulse Fan Companion</h3>
                    <p className="text-xs text-slate-400">Ask wayfinding, transit schedules, and general stadium FAQs</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMessages([{ role: 'model', text: 'Chat history cleared. How can I help you today?' }])}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
                  title="Clear history"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md' 
                        : 'bg-slate-900/90 text-slate-100 border border-slate-800/80 rounded-bl-none shadow-md'
                    }`}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                      
                      {/* Show Tools used if relevant */}
                      {msg.tools && msg.tools.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap gap-2">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                            <Activity className="w-3 h-3 text-indigo-400" /> Orchestrator executed:
                          </span>
                          {msg.tools.map((tool, idx) => (
                            <span key={idx} className="bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[10px] px-2 py-0.5 rounded font-mono">
                              {tool.name}({Object.keys(tool.args).join(', ')})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sendingChat && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900/90 text-slate-300 border border-slate-800 rounded-2xl rounded-bl-none p-4 text-sm flex items-center gap-2 shadow-md">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce"></span>
                        <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce delay-100"></span>
                        <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce delay-200"></span>
                      </div>
                      <span>Orchestrator thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Suggestions Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {suggestionPills.map((pill, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setChatInput(pill.value);
                      handleSendMessage(pill.value);
                    }}
                    className="bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 text-[11px] px-3 py-1.5 rounded-full transition font-medium"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask StadiumPulse AI..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-600 transition"
                  disabled={sendingChat}
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={sendingChat}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3.5 rounded-xl transition flex items-center justify-center shadow-lg shadow-indigo-500/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}


        {/* TAB 2: STAFF & VOLUNTEER COPILOT EXPERIENCE */}
        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
            {/* Left Control Panel: Incident Spikes */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col gap-5 shadow-lg">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    Incident Control Panel
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Hackathon Trigger Panel: Simulate live sensor spikes and emergencies to test real-time AI alert evaluation.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => triggerSpike('crowd')}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition text-left cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold block">1. Simulate Crowd Density Spike</span>
                      <span className="text-[10px] text-amber-400/80">Spike Gate B capacity to 96% + bottlenecks</span>
                    </div>
                    <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                  </button>

                  <button 
                    onClick={() => triggerSpike('medical')}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition text-left cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold block">2. Simulate Medical Incident</span>
                      <span className="text-[10px] text-red-400/80">Report collapsed fan at Gate C upper escalators</span>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </button>

                  <button 
                    onClick={() => triggerSpike('transit')}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition text-left cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold block">3. Simulate Transit Delay</span>
                      <span className="text-[10px] text-indigo-400/80">Suspend rail service + Transit Hub gridlock</span>
                    </div>
                    <Bus className="w-5 h-5 text-indigo-400" />
                  </button>

                  <div className="border-t border-slate-800 my-1"></div>

                  <button 
                    onClick={() => triggerSpike('clear')}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold text-center transition shadow-lg shadow-emerald-600/10 cursor-pointer"
                  >
                    Reset Simulator (All Normal)
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel: Alerts Feed & GenAI Explainer */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 flex-1 shadow-lg">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    Live Staff Alerts (LLM-Evaluated)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    AI analyzes raw turnstile counts and sensor alerts to generate response plans with confidence scores.
                  </p>
                </div>

                {alerts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl min-h-[300px]">
                    <UserCheck className="w-12 h-12 text-slate-600 mb-3" />
                    <h4 className="text-sm font-semibold text-slate-300">All Operations Stable</h4>
                    <p className="text-xs text-slate-500 max-w-[280px] mt-1">
                      No active incidents. Use the control panel on the left to trigger emergency alerts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {alerts.map((alert, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-md">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                alert.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' :
                                alert.severity === 'High' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {alert.severity} Severity
                              </span>
                              <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded">
                                Area: {alert.crowd_density} Density
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1.5">{alert.title}</h4>
                          </div>
                          
                          {/* Confidence Score Ring */}
                          <div className="flex flex-col items-center bg-indigo-950/60 border border-indigo-900 rounded-xl px-3 py-1.5 text-center">
                            <span className="text-xs font-bold text-indigo-400">{alert.confidence_score}%</span>
                            <span className="text-[9px] text-indigo-300/80 font-medium">Confidence</span>
                          </div>
                        </div>

                        {/* Suggested Actions */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-400 block mb-1">Recommended Response Plan:</span>
                          <ul className="space-y-1.5">
                            {alert.recommended_actions.map((act, i) => (
                              <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="border-t border-slate-900 pt-3 flex justify-between items-center gap-4">
                          <p className="text-[10px] text-slate-500 italic max-w-[70%]">
                            <strong>Reasoning:</strong> {alert.rationale}
                          </p>
                          <button 
                            onClick={() => explainAlert(alert)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                          >
                            Explain Alert
                          </button>
                        </div>

                        {/* Explain Modal Drawer inside alert card */}
                        {explainingAlertId === alert.incident_id && (
                          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-3 flex flex-col gap-2 relative">
                            <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                              GenAI Jargon-Free Guide (New Volunteer Mode)
                            </h5>
                            
                            {loadingExplanation ? (
                              <p className="text-xs text-slate-400 animate-pulse">Drafting plain-text guidance in {language}...</p>
                            ) : (
                              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{alertExplanation}</p>
                            )}
                            
                            <button 
                              onClick={() => setExplainingAlertId(null)}
                              className="absolute top-3 right-3 text-[10px] text-slate-500 hover:text-slate-300"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* TAB 3: ORGANIZER COMMAND CENTER */}
        {activeTab === 'organizer' && (
          <div className="flex flex-col gap-6">
            {/* Visual Charts & Status grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Density Bar Chart */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4 lg:col-span-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Zone Densities Live Matrix
                  </h3>
                  <p className="text-xs text-slate-400">Current crowd sensor index per sector</p>
                </div>
                <div className="h-[220px] w-full">
                  {stadiumState ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
                          labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}
                          itemStyle={{ color: '#c084fc', fontSize: 12 }}
                        />
                        <Bar dataKey="density" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-slate-500">Awaiting data...</p>
                  )}
                </div>
              </div>

              {/* Operations Metrics Panel */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between gap-4">
                <h3 className="text-sm font-bold text-white">Sustainability & Resource Efficiency</h3>
                
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Waste Diverted (Recycling)</span>
                    <span className="text-sm font-bold text-emerald-400">82.4%</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Solar energy used today</span>
                    <span className="text-sm font-bold text-indigo-400">8,400 kWh</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Rainwater harvest total</span>
                    <span className="text-sm font-bold text-indigo-400">14,200 gal</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Operations Score</span>
                    <span className="text-sm font-bold text-indigo-400">Grade A-</span>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-500 italic">
                  Metrics updated live from turnstile counters and MetLife IoT sensors.
                </p>
              </div>
            </div>

            {/* GenAI Report Drafts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Shift Change Briefing */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      Operations Shift Briefing
                    </h3>
                    <p className="text-xs text-slate-400">GenAI summarizes recent incident logs and operations updates</p>
                  </div>
                  <button 
                    onClick={generateShiftBriefing}
                    disabled={loadingShift}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    {loadingShift ? 'Compiling...' : 'Generate Shift Briefing'}
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1 min-h-[150px]">
                  {shiftBriefing ? (
                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {shiftBriefing}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs py-10">
                      Click the button above to auto-generate shift briefing.
                    </div>
                  )}
                </div>
              </div>

              {/* End of Day Sustainability Report */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Sustainability Narrative Summary
                    </h3>
                    <p className="text-xs text-slate-400">Drafts post-match reporting comments from waste and power meters</p>
                  </div>
                  <button 
                    onClick={generateSustainabilityBriefing}
                    disabled={loadingSustainability}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    {loadingSustainability ? 'Drafting...' : 'Generate Narrative'}
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1 min-h-[150px]">
                  {sustainabilityReport ? (
                    <div className="text-xs text-slate-300 leading-relaxed">
                      {sustainabilityReport}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs py-10">
                      Click the button above to draft the narrative post-match report.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 p-4 text-center text-[10px] text-slate-600">
        StadiumPulse AI Engine • Powered by Gemini 2.5 Flash • FIFA World Cup 2026 Hackathon Hub
      </footer>
    </div>
  );
}

export default App;
