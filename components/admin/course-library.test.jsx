import { findCourseByRef } from './course-library';

const courses = [
  { id: 7, public_id: '3f1c2b9e-0d4a-4c51-9a77-2a5c1e0b8f10', name: 'Seven' },
  { id: 12, public_id: 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d', name: 'Twelve' },
];

describe('findCourseByRef (the ?edit= link)', () => {
  it('matches the public id the course page links with', () => {
    expect(findCourseByRef(courses, 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d')?.name).toBe('Twelve');
  });

  it('still matches an integer id', () => {
    expect(findCourseByRef(courses, '7')?.name).toBe('Seven');
  });

  it('matches nothing for an unknown, empty or missing value', () => {
    expect(findCourseByRef(courses, 'not-a-course')).toBeNull();
    expect(findCourseByRef(courses, '')).toBeNull();
    expect(findCourseByRef(courses, null)).toBeNull();
    expect(findCourseByRef(undefined, '7')).toBeNull();
  });
});
