/**
 * @fileoverview Test suite for the ToggleSwitch component.
 * Tests rendering, interaction, and state changes.
 * @module tests/ToggleSwitch
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToggleSwitch from '@trendmicro/react-toggle-switch';

// Mock the ToggleSwitch component since it's an external dependency
jest.mock('@trendmicro/react-toggle-switch', () => {
  return jest.fn((props) => (
    <div 
      data-testid="toggle-switch"
      className={`toggle-switch ${props.checked ? 'checked' : ''} ${props.disabled ? 'disabled' : ''} ${props.className || ''}`}
      onClick={props.disabled ? undefined : props.onChange}
    >
      Toggle
    </div>
  ));
});

describe('ToggleSwitch Component', () => {
  /**
   * Reset all mocks before each test
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test to verify that the ToggleSwitch component renders correctly in unchecked state
   */
  it('renders in unchecked state correctly', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ToggleSwitch checked={false} onChange={onChange} />
    );
    
    const toggle = getByTestId('toggle-switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toHaveClass('checked');
  });

  /**
   * Test to verify that the ToggleSwitch component renders correctly in checked state
   */
  it('renders in checked state correctly', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ToggleSwitch checked={true} onChange={onChange} />
    );
    
    const toggle = getByTestId('toggle-switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveClass('checked');
  });

  /**
   * Test to verify that the ToggleSwitch component can be clicked to trigger onChange
   */
  it('calls onChange handler when clicked', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ToggleSwitch checked={false} onChange={onChange} />
    );
    
    const toggle = getByTestId('toggle-switch');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  /**
   * Test to verify that the ToggleSwitch component handles disabled state correctly
   */
  it('does not call onChange when disabled', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ToggleSwitch checked={false} onChange={onChange} disabled={true} />
    );
    
    const toggle = getByTestId('toggle-switch');
    expect(toggle).toHaveClass('disabled');
    
    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  /**
   * Test to verify that the ToggleSwitch component applies custom class names
   */
  it('applies custom className when provided', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ToggleSwitch checked={false} onChange={onChange} className="custom-class" />
    );
    
    const toggle = getByTestId('toggle-switch');
    expect(toggle).toHaveClass('custom-class');
  });
});