import React from 'react';
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock scrollIntoView since JSDOM does not implement it
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Mock Recharts since JSDOM doesn't support width/height calculations of SVG container elements
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }) => <div data-testid="mock-container">{children}</div>,
    BarChart: ({ children }) => <div data-testid="mock-barchart">{children}</div>,
    Bar: () => <div data-testid="mock-bar">Bar</div>,
    XAxis: () => <div data-testid="mock-xaxis">XAxis</div>,
    YAxis: () => <div data-testid="mock-yaxis">YAxis</div>,
    CartesianGrid: () => <div data-testid="mock-grid">Grid</div>,
    Tooltip: () => <div data-testid="mock-tooltip">Tooltip</div>
  };
});

describe('StadiumPulse AI Frontend Tests', () => {
  test('renders the application header and default Fan tab', () => {
    render(<App />);
    expect(screen.getByText('StadiumPulse AI')).toBeTruthy();
    expect(screen.getByText('StadiumPulse Fan Companion')).toBeTruthy();
  });

  test('sends a user message on submit and displays a loading state', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Ask StadiumPulse AI...');
    const sendBtn = screen.getByRole('button', { name: /Send Message/i });

    fireEvent.change(input, { target: { value: 'How is the line at Gate B?' } });
    fireEvent.click(sendBtn);

    // Verify it appends the user message
    expect(screen.getByText('How is the line at Gate B?')).toBeTruthy();
    
    // Check for thinking loader
    expect(screen.getByText(/thinking/i)).toBeTruthy();
  });

  test('clicking suggestion pills populates the chat history', async () => {
    render(<App />);
    const pill = screen.getByText('Is Gate B turnstile busy?');
    fireEvent.click(pill);

    // Verify suggestion text appeared in chat history list
    expect(screen.getByText('What is the current crowd density at Gate B?')).toBeTruthy();
  });

  test('toggles to Staff Alert feed tab correctly', () => {
    render(<App />);
    const staffBtn = screen.getByText(/Staff Copilot/i);
    fireEvent.click(staffBtn);

    // Verify alert feed header is present
    expect(screen.getByText(/Live Staff Alerts/i)).toBeTruthy();
  });

  test('app does not crash on empty state or tab switching', () => {
    render(<App />);
    const orgBtn = screen.getByText(/Organizer Panel/i);
    fireEvent.click(orgBtn);

    expect(screen.getByText(/Operations Shift Briefing/i)).toBeTruthy();
    expect(screen.getByText(/Sustainability Narrative/i)).toBeTruthy();
  });
});
