/**
 * @fileoverview useChat — React hook managing the Fan Companion Chat state.
 *
 * Maintains the conversation message list, chat input text, and in-flight
 * sending status. When the backend is offline, responds with pre-scripted
 * locale-aware fallback answers using live mock stadium state values.
 */

import { useState } from 'react';
import * as api from '../services/api';

/** Delay (ms) before resolving an offline fallback chat response. */
const OFFLINE_CHAT_DELAY_MS = 1000;

/** Initial greeting shown in the Fan Companion chat on first mount. */
const WELCOME_MESSAGE = {
  role: 'model',
  text: 'Welcome to MetLife Stadium for the FIFA World Cup 2026! How can I assist you today? (I support multilingual queries and accessible routing!)'
};

/** Default reply when no keyword match is found in offline mode. */
const DEFAULT_CHAT_REPLY =
  'I am processing your query. Could you please specify which section, gate, or transit option you are asking about?';

/**
 * React hook that manages Fan Companion Chat message history and send actions.
 *
 * @param {boolean} isServerOffline - Whether the FastAPI backend is currently unreachable.
 * @param {boolean} accessibilityMode - When true, forces step-free routing in all queries.
 * @param {Object|null} stadiumState - Live simulator state used to enrich offline replies.
 * @param {string} language - Currently selected UI language.
 * @returns {{ messages: Array<{role: string, text: string, tools?: Array}>, chatInput: string, sendingChat: boolean, setChatInput: Function, setMessages: Function, handleSendMessage: Function }}
 */
export default function useChat(isServerOffline, accessibilityMode, stadiumState, language) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  /**
   * Sends a fan message to the Gemini orchestrator or offline fallback handler.
   *
   * @param {string} [textToSend=chatInput] - Text to send; defaults to current chatInput value.
   * @returns {Promise<void>}
   */
  const handleSendMessage = async (textToSend = chatInput) => {
    const text = textToSend.trim();
    if (!text) return;

    const updatedMessages = [...messages, { role: 'user', text }];
    setMessages(updatedMessages);
    setChatInput('');
    setSendingChat(true);

    if (isServerOffline) {
      setTimeout(() => {
        const lower = text.toLowerCase();
        const isSpanish =
          language === 'Spanish' || lower.includes('cómo') || lower.includes('como') || lower.includes('llegar');
        let reply = isSpanish
          ? 'Estoy procesando su consulta. ¿Podría especificar de qué sección, puerta u opción de transporte está preguntando?'
          : DEFAULT_CHAT_REPLY;
        let tools = [];

        if (lower.includes('gate b') || lower.includes('crowded') || lower.includes('puerta b')) {
          const density = stadiumState ? stadiumState.crowd_density['Gate B'] : 38;
          reply = isSpanish
            ? `La densidad de multitud actual en la Puerta B es del ${density}%, lo cual es normal. ¡Dígame si necesita una ruta hacia entradas menos congestionadas!`
            : `The current crowd density at Gate B is ${density}%, which is currently normal. Let me know if you need routing to less congested entrances!`;
          tools = [{ name: 'get_crowd_density', args: { zone: 'Gate B' } }];
        } else if (
          lower.includes('shuttle') ||
          lower.includes('bus') ||
          lower.includes('autobús') ||
          lower.includes('autobus')
        ) {
          const waitTime = stadiumState ? stadiumState.transit_status['Shuttle Bus'].wait_time_mins : 5;
          const congestion = stadiumState ? stadiumState.transit_status['Shuttle Bus'].congestion : 'Low';
          const congestionEs = congestion === 'Low' ? 'Baja' : congestion === 'Medium' ? 'Media' : 'Alta';
          reply = isSpanish
            ? `El autobús de enlace actualmente tiene un tiempo de espera de aproximadamente ${waitTime} minutos con congestión ${congestionEs}.`
            : `The Shuttle Bus currently has a wait time of approximately ${waitTime} minutes with ${congestion} congestion.`;
          tools = [{ name: 'get_transit_status', args: { route_or_station: 'Shuttle Bus' } }];
        } else if (lower.includes('train') || lower.includes('tren')) {
          const waitTime = stadiumState ? stadiumState.transit_status['Train'].wait_time_mins : 10;
          const congestion = stadiumState ? stadiumState.transit_status['Train'].congestion : 'Medium';
          const congestionEs = congestion === 'Low' ? 'Baja' : congestion === 'Medium' ? 'Media' : 'Alta';
          reply = isSpanish
            ? `El servicio ferroviario actualmente tiene un tiempo de espera de aproximadamente ${waitTime} minutos con congestión ${congestionEs}.`
            : `The Rail Service currently has a wait time of approximately ${waitTime} minutes with ${congestion} congestion.`;
          tools = [{ name: 'get_transit_status', args: { route_or_station: 'Train' } }];
        } else if (
          lower.includes('route') ||
          lower.includes('get to') ||
          lower.includes('cómo llegar') ||
          lower.includes('como llegar') ||
          lower.includes('ruta')
        ) {
          const isAccessible =
            accessibilityMode ||
            lower.includes('wheelchair') ||
            lower.includes('elevador') ||
            lower.includes('step-free');
          if (isAccessible) {
            reply = isSpanish
              ? 'Ruta accesible sin escalones: Salga por la rampa izquierda, siga las señales azules ADA hacia el Elevador Noroeste y baje al Nivel 1. La salida es libre de barreras.'
              : 'Step-free route calculated: Exit towards the Northwest Elevator Bank, take Elevator 3 down to Concourse Level 1. The path is fully ramped and wheelchair accessible.';
            tools = [
              { name: 'get_route', args: { start: 'Seating Bowl', destination: 'Exit', accessibility_mode: true } }
            ];
          } else {
            reply = isSpanish
              ? 'Ruta rápida estándar: Suba la escalera mecánica central hasta el nivel 2 y gire a la derecha hacia la sección 102.'
              : 'Standard express route calculated: Walk up the central escalator to Level 2 Concourse and turn right towards section 102.';
            tools = [
              { name: 'get_route', args: { start: 'Gate A', destination: 'Section 102', accessibility_mode: false } }
            ];
          }
        }

        setMessages((prev) => [...prev, { role: 'model', text: reply, tools }]);
        setSendingChat(false);
      }, OFFLINE_CHAT_DELAY_MS);
      return;
    }

    const history = updatedMessages.slice(0, -1).map((msg) => ({
      role: msg.role,
      text: msg.text
    }));

    try {
      const data = await api.sendChatMessage(text, history, accessibilityMode, language);
      setMessages((prev) => [...prev, { role: 'model', text: data.response, tools: data.tools_called }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: 'Network error. Make sure backend is running.' }]);
    } finally {
      setSendingChat(false);
    }
  };

  return {
    messages,
    chatInput,
    sendingChat,
    setChatInput,
    setMessages,
    handleSendMessage
  };
}
