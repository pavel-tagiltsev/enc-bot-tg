import { User } from '../Domain/User.js';
import { IUserRepository } from './IUserRepository.js';
import { IMoyKlassAPI } from '../types/IMoyKlassAPI.js';

export class UserRepository implements IUserRepository {
  constructor(private readonly moyKlassAPI: IMoyKlassAPI) {}

  async findAll(): Promise<User[]> {
    return this.moyKlassAPI.getManagers();
  }

  async save(user: User): Promise<void> {
    console.warn('UserRepository.save not implemented.');
    // Do nothing for now
  }
}
