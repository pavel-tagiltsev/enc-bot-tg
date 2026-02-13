import { Student } from '../Domain/Student.js';

export interface IStudentRepository {
  findById(id: number): Promise<Student | null>;
  findAll(): Promise<Student[]>;
  save(student: Student): Promise<void>;
}
