import { User } from '../Domain/User.js';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
}
