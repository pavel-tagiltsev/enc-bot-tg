import { Student } from '../Domain/Student.js';
import { IStudentRepository } from './IStudentRepository.js';

export class StudentRepository implements IStudentRepository {
  async findById(id: number): Promise<Student | null> {
    console.warn('StudentRepository.findById not implemented.');
    return null;
  }

  async findAll(): Promise<Student[]> {
    console.warn('StudentRepository.findAll not implemented.');
    return [];
  }

  async save(student: Student): Promise<void> {
    console.warn('StudentRepository.save not implemented.');
    // Do nothing for now
  }
}
