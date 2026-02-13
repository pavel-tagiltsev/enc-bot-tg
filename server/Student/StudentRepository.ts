import { Student } from './Student.js';
import { IStudentRepository } from './IStudentRepository.js';
import { IMoyKlassAPI } from '../types/IMoyKlassAPI.js';

export class StudentRepository implements IStudentRepository {
  constructor(private readonly moyKlassAPI: IMoyKlassAPI) {}

  async findByIds(ids: number[]): Promise<Student[]> {
    if (ids.length === 0) {
      return [];
    }
    return await this.moyKlassAPI.getUsers({ userIds: ids });
  }

  async save(student: Student): Promise<void> {
    console.warn('StudentRepository.save not implemented.');
    // Do nothing for now
  }
}
