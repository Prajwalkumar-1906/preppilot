import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TextEditor } from '../components/interview/TextEditor';
import '@testing-library/jest-dom';

describe('Interview Components', () => {
  it('renders TextEditor with initial word counter and target suggestion', () => {
    const handleChange = vi.fn();
    render(
      <TextEditor
        value="Here is an initial sample answer for this technical interview question."
        onChange={handleChange}
        minWords={20}
        timeSuggestionSec={180}
      />
    );

    expect(screen.getByText('Written Response')).toBeInTheDocument();
    expect(screen.getByText(/11\s+words/i)).toBeInTheDocument();
    expect(screen.getByText(/Target: ~3 min/i)).toBeInTheDocument();
  });

  it('shows rubric guidance warning when words are below threshold', () => {
    const handleChange = vi.fn();
    render(
      <TextEditor
        value="Too short"
        onChange={handleChange}
        minWords={20}
      />
    );

    expect(screen.getByText(/Answers with at least 20 words typically receive more accurate/i)).toBeInTheDocument();
  });
});
