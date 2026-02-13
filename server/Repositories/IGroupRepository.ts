import { Group } from '../Domain/Group.js';

export interface IGroupRepository {
  findByIds(ids: number[]): Promise<Group[]>;
  save(group: Group): Promise<void>;
}
