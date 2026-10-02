import { isPkPhone } from './pk-phone';

describe('Pakistani phone validation', () => {
  it.each(['03001234567', '0300-1234567', '+92 300 1234567', '+923001234567', '00923001234567', '021-34567890', '+92 42 12345678'])('accepts %s', (p) => {
    expect(isPkPhone(p)).toBe(true);
  });
  it.each(['oi43uuuuuuuu0u984u8j', '12345', '0300123', '030012345678901', '+1 202 555 0143', 'abc', '', '03001234567x'])('rejects %s', (p) => {
    expect(isPkPhone(p)).toBe(false);
  });
});
