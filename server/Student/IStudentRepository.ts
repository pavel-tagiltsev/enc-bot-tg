import { Student } from './Student.js';

export interface IStudentRepository {
  findByIds(ids: number[]): Promise<Student[]>;
  save(student: Student): Promise<void>;
}
