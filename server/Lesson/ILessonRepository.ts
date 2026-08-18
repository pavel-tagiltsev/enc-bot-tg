import { Lesson } from './Lesson.js';

export interface ILessonRepository {
  findBetween(startDate: Date, endDate: Date): Promise<Lesson[]>;
}
