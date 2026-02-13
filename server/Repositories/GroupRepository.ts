import { Group } from '../Domain/Group.js';
import { IGroupRepository } from './IGroupRepository.js';

export class GroupRepository implements IGroupRepository {
  async findById(id: number): Promise<Group | null> {
    console.warn('GroupRepository.findById not implemented.');
    return null;
  }

  async findAll(): Promise<Group[]> {
    console.warn('GroupRepository.findAll not implemented.');
    return [];
  }

  async save(group: Group): Promise<void> {
    console.warn('GroupRepository.save not implemented.');
    // Do nothing for now
  }
}
