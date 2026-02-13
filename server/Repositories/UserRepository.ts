import { User } from '../Domain/User.js';
import { IUserRepository } from './IUserRepository.js';

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    console.warn('UserRepository.findById not implemented.');
    return null;
  }

  async findAll(): Promise<User[]> {
    console.warn('UserRepository.findAll not implemented.');
    return [];
  }

  async save(user: User): Promise<void> {
    console.warn('UserRepository.save not implemented.');
    // Do nothing for now
  }
}
