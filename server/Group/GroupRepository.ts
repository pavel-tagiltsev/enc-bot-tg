import { Group } from './Group.js';
import { IGroupRepository } from './IGroupRepository.js';
import { IMoyKlassAPI } from '../types/IMoyKlassAPI.js';

export class GroupRepository implements IGroupRepository {
  constructor(private readonly moyKlassAPI: IMoyKlassAPI) {}

  async findByIds(ids: number[]): Promise<Group[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.moyKlassAPI.getClasses({ classId: ids });
  }

  async save(group: Group): Promise<void> {
    console.warn('GroupRepository.save not implemented.');
    // Do nothing for now
  }
}
