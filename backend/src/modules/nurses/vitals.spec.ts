import { alertLevel, checkVitals } from './vitals';

describe('home-visit vital sign rules', () => {
  it('normal vitals raise nothing', () => {
    expect(checkVitals({ bpSystolic: 124, bpDiastolic: 80, pulse: 78, temperatureC: 36.9, spo2: 98, bloodSugar: 110, respiratoryRate: 16 })).toEqual([]);
    expect(alertLevel([])).toBeNull();
  });
  it.each([
    [{ bpSystolic: 190, bpDiastolic: 110 }, 'emergency'],
    [{ bpSystolic: 150, bpDiastolic: 122 }, 'emergency'],
    [{ bpSystolic: 85, bpDiastolic: 55 }, 'emergency'],
    [{ bpSystolic: 165, bpDiastolic: 95 }, 'soon'],
    [{ spo2: 89 }, 'emergency'],
    [{ spo2: 93 }, 'soon'],
    [{ pulse: 140 }, 'emergency'],
    [{ pulse: 36 }, 'emergency'],
    [{ pulse: 115 }, 'soon'],
    [{ temperatureC: 40.2 }, 'emergency'],
    [{ temperatureC: 34.5 }, 'emergency'],
    [{ temperatureC: 38.8 }, 'soon'],
    [{ bloodSugar: 48 }, 'emergency'],
    [{ bloodSugar: 65 }, 'soon'],
    [{ bloodSugar: 420 }, 'emergency'],
    [{ bloodSugar: 280 }, 'soon'],
    [{ respiratoryRate: 32 }, 'emergency'],
  ])('%j → %s', (v, level) => {
    expect(alertLevel(checkVitals(v))).toBe(level);
  });
  it('emergency wins when several readings are off', () => {
    expect(alertLevel(checkVitals({ pulse: 115, spo2: 90 }))).toBe('emergency');
  });
});
