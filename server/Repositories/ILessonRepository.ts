import { Lesson } from '../Domain/Lesson.js';

export interface ILessonRepository {
  findById(id: number): Promise<Lesson | null>;
  findAll(): Promise<Lesson[]>;
  save(lesson: Lesson): Promise<void>;
}
