import { Lesson } from '../Domain/Lesson.js';

export interface ILessonRepository {
  findBetween(startDate: Date, endDate: Date): Promise<Lesson[]>;
  save(lesson: Lesson): Promise<void>;
}
