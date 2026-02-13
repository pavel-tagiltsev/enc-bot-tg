import { User } from '../Domain/User.js';

export interface IUserRepository {
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
}
