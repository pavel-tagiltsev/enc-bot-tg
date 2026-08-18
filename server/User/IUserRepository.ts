import { User } from './User.js';

export interface IUserRepository {
  findAll(): Promise<User[]>;
}
