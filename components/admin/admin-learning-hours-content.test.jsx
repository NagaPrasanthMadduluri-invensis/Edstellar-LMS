import { learningHoursCsv, learningHoursFilename } from './admin-learning-hours-content';

const row = (over = {}) => ({
  id: 1, name: 'Ada Lovelace', job_role: 'Analyst', dept: 'Finance', location: 'Pune',
  thisMonth: 0.5, lastMonth: 0, goal: 8, progressPct: 6, allTime: 0.5, status: 'Behind', ...over,
});

describe('learningHoursCsv', () => {
  it('writes a header and one line per row, in the order given', () => {
    const csv = learningHoursCsv([row(), row({ id: 2, name: 'Grace Hopper', dept: 'Ops', thisMonth: 3 })]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Learner,Job role,Department,Location,This month (h),Last month (h),Goal (h),Progress (%),All time (h),Status');
    expect(lines[1]).toBe('Ada Lovelace,Analyst,Finance,Pune,0.5,0,8,6,0.5,Behind');
    expect(lines[2]).toBe('Grace Hopper,Analyst,Ops,Pune,3,0,8,6,0.5,Behind');
    expect(lines).toHaveLength(4); // trailing CRLF
    expect(lines[3]).toBe('');
  });

  it('writes only the header when there are no rows', () => {
    expect(learningHoursCsv([]).split('\r\n')).toHaveLength(2);
  });

  it('quotes commas, quotes and line breaks, and leaves missing values empty', () => {
    const csv = learningHoursCsv([row({ name: 'Smith, "Jo"', job_role: null, location: undefined, dept: 'A\nB' })]);
    expect(csv.split('\r\n')[1]).toBe('"Smith, ""Jo""",,"A\nB",,0.5,0,8,6,0.5,Behind');
  });

  it('neutralises text that a spreadsheet would run as a formula', () => {
    const csv = learningHoursCsv([row({ name: '=HYPERLINK("x")', dept: '+1', job_role: '@cmd', location: '-2' })]);
    expect(csv.split('\r\n')[1]).toBe(`"'=HYPERLINK(""x"")",'@cmd,'+1,'-2,0.5,0,8,6,0.5,Behind`);
  });
});

describe('learningHoursFilename', () => {
  it('is a dated .csv name', () => {
    expect(learningHoursFilename(new Date(2026, 0, 5))).toBe('learning-hours-2026-01-05.csv');
  });
});
