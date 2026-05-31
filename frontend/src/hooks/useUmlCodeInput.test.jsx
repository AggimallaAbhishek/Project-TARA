import { act, renderHook } from '@testing-library/react';
import useUmlCodeInput from './useUmlCodeInput';

describe('useUmlCodeInput', () => {
  it('loads file content and auto-detects mermaid format', async () => {
    const onValidationError = vi.fn();
    const onClearError = vi.fn();
    const { result } = renderHook(() => useUmlCodeInput({
      maxUploadBytes: 2 * 1024 * 1024,
      maxCodeLength: 250000,
      onValidationError,
      onClearError,
    }));

    const file = new File(['graph TD\nA --> B'], 'architecture.mmd', { type: 'text/plain' });
    const event = { target: { files: [file], value: 'has-value' } };

    await act(async () => {
      await result.current.handleUmlCodeFileChange(event);
    });

    expect(onClearError).toHaveBeenCalledTimes(1);
    expect(onValidationError).not.toHaveBeenCalled();
    expect(result.current.umlFormat).toBe('mermaid');
    expect(result.current.umlCode).toBe('graph TD\nA --> B');
    expect(result.current.umlFileName).toBe('architecture.mmd');
    expect(event.target.value).toBe('');
  });

  it('rejects oversized file uploads', async () => {
    const onValidationError = vi.fn();
    const { result } = renderHook(() => useUmlCodeInput({
      maxUploadBytes: 10,
      maxCodeLength: 250000,
      onValidationError,
      onClearError: vi.fn(),
    }));

    const file = new File(['this file is larger than 10 bytes'], 'large.puml', { type: 'text/plain' });

    await act(async () => {
      await result.current.handleUmlCodeFileChange({ target: { files: [file], value: 'x' } });
    });

    expect(onValidationError).toHaveBeenCalledWith('UML file is too large. Maximum size is 2 MB.');
    expect(result.current.umlFileName).toBe('');
    expect(result.current.umlCode).toBe('');
  });
});
