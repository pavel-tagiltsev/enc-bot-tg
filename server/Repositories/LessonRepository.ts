import { Lesson } from '../Domain/Lesson.js';
import { ILessonRepository } from './ILessonRepository.js';

export class LessonRepository implements ILessonRepository {
  async findById(id: number): Promise<Lesson | null> {
    console.warn('LessonRepository.findById not implemented.');
    return null;
  }

  async findAll(): Promise<Lesson[]> {
    console.warn('LessonRepository.findAll not implemented.');
    return [];
  }

  async save(lesson: Lesson): Promise<void> {
    console.warn('LessonRepository.save not implemented.');
    // Do nothing for now
  }
}
