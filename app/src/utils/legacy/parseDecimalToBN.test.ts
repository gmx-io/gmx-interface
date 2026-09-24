const mockGetGmw420Enabled = jest.fn(() => true);

jest.mock('@/config/featureFlagEnable', () => ({
  getGmw420Enabled: () => mockGetGmw420Enabled(),
}));

import { parseDecimalToBN } from './parseDecimalToBN';

describe('parseDecimalToBN', () => {
  beforeEach(() => {
    mockGetGmw420Enabled.mockReturnValue(true);
  });

  it('parses an amount when decimals is a number', () => {
    expect(parseDecimalToBN('909.734939258', 9).toString()).toBe(
      '909734939258'
    );
  });

  it('parses an amount when decimals comes from API data as a string', () => {
    expect(parseDecimalToBN('909.734939258', '9').toString()).toBe(
      '909734939258'
    );
  });

  it('rejects invalid decimals', () => {
    expect(() => parseDecimalToBN('1', 'invalid')).toThrow(
      'Decimals must be a non-negative safe integer'
    );
  });

  it('keeps the previous parsing behavior when GMW-420 is disabled', () => {
    mockGetGmw420Enabled.mockReturnValue(false);
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    expect(parseDecimalToBN('909.734939258', '9').toString()).not.toBe(
      '909734939258'
    );
    expect(consoleError).toHaveBeenCalledWith(
      'Decimals must be a non-negative safe integer'
    );

    consoleError.mockRestore();
  });
});
