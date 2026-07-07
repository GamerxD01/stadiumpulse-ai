import React from 'react';
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import ChatMessage from '../components/fan-companion/ChatMessage';
import ErrorBanner from '../components/shared/ErrorBanner';
import ExplainAlertButton from '../components/staff-copilot/ExplainAlertButton';

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

  // -----------------------------------------------------------------------
  // New tests — closing Code Quality + Testing gaps
  // -----------------------------------------------------------------------

  test('accessibility mode toggle checkbox is present and toggleable', () => {
    render(<App />);
    // The accessibility toggle label text is visible in the fan tab sidebar
    const toggle = screen.getByLabelText(/Toggle step-free accessible routes only/i);
    expect(toggle).toBeTruthy();
    // It starts unchecked
    expect(toggle.checked).toBe(false);
    // Click to enable
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
    // Click to disable
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
  });

  test('pressing Enter key in chat input submits the message', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Ask StadiumPulse AI...');
    fireEvent.change(input, { target: { value: 'Where is the nearest exit?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Message should appear in the conversation
    expect(screen.getByText('Where is the nearest exit?')).toBeTruthy();
  });

  test('organizer panel contains generate briefing buttons', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Organizer Panel/i));

    // Both generate buttons should be present in the organizer dashboard
    const shiftBtn = screen.getByRole('button', { name: /Generate Shift Briefing/i });
    const sustainBtn = screen.getByRole('button', { name: /Generate Narrative/i });
    expect(shiftBtn).toBeTruthy();
    expect(sustainBtn).toBeTruthy();
  });

  test('navigation tabs have correct ARIA role attributes', () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    // There should be exactly 3 tabs
    expect(tabs.length).toBe(3);
    // The first tab (Fan Companion) should be selected by default
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    expect(tabs[2].getAttribute('aria-selected')).toBe('false');
  });

  test('ChatMessage renders tool call badges when tools are provided', () => {
    const msg = {
      role: 'model',
      text: 'Gate B density is 40%.',
      tools: [{ name: 'get_crowd_density', args: { zone: 'Gate B' } }]
    };
    render(<ChatMessage msg={msg} />);
    expect(screen.getByText('Gate B density is 40%.')).toBeTruthy();
    // The tool badge chip should display the function name with arg key
    expect(screen.getByText(/get_crowd_density/)).toBeTruthy();
  });

  test('ErrorBanner component renders offline warning message', () => {
    render(<ErrorBanner />);
    // ErrorBanner should render an accessible offline warning
    const banner = screen.getByRole('alert');
    expect(banner).toBeTruthy();
  });

  test('ExplainAlertButton renders trigger and toggles states correctly', () => {
    const mockExplain = vi.fn();
    const mockDismiss = vi.fn();
    const alertMock = { incident_id: 'inc_test_123', title: 'Test Alert Title' };

    const { rerender } = render(
      <ExplainAlertButton
        alert={alertMock}
        language="English"
        onExplain={mockExplain}
        isExplaining={false}
        explanation=""
        onDismiss={mockDismiss}
      />
    );

    // Verify trigger button renders
    const trigger = screen.getByRole('button', { name: /Get plain-language volunteer explanation/i });
    expect(trigger).toBeTruthy();

    // Click trigger and verify callback is called
    fireEvent.click(trigger);
    expect(mockExplain).toHaveBeenCalledWith(alertMock, 'English');

    // Rerender in explaining/loading state
    rerender(
      <ExplainAlertButton
        alert={alertMock}
        language="English"
        onExplain={mockExplain}
        isExplaining={true}
        explanation=""
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText(/Drafting plain-text guidance/i)).toBeTruthy();

    // Rerender with final explanation
    rerender(
      <ExplainAlertButton
        alert={alertMock}
        language="English"
        onExplain={mockExplain}
        isExplaining={false}
        explanation="This is the simplified explanation."
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText('This is the simplified explanation.')).toBeTruthy();

    // Test dismiss button
    const dismiss = screen.getByRole('button', { name: /Dismiss explanation panel/i });
    fireEvent.click(dismiss);
    expect(mockDismiss).toHaveBeenCalled();
  });
});
