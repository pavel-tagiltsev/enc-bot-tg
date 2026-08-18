import { Group } from './Group.js';

export interface IGroupRepository {
  findByIds(ids: number[]): Promise<Group[]>;
}
