import { signInDestination } from './sign-in-destination';

describe('signInDestination (Gate order)', () => {
  it('sends a person who owes two-step setup there first, even before the notice', () => {
    expect(signInDestination({ role: 'admin', mfaSetupRequired: true, consentRequired: true })).toBe('/mfa-setup');
    expect(signInDestination({ role: 'admin', mfaSetupRequired: true })).toBe('/mfa-setup');
  });

  it('sends an unconsented person with no setup owed to the notice', () => {
    expect(signInDestination({ role: 'learner', consentRequired: true })).toBe('/consent');
    expect(signInDestination({ role: 'admin', mfaSetupRequired: false, consentRequired: true })).toBe('/consent');
  });

  it('sends everyone else to their portal home', () => {
    expect(signInDestination({ role: 'admin' })).toBe('/admin/dashboard');
    expect(signInDestination({ role: 'trainer' })).toBe('/trainer/sessions');
    expect(signInDestination({ role: 'learner' })).toBe('/dashboard');
  });
});
