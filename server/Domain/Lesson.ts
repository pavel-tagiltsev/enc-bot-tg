export type LessonStatus = 'completed' | 'scheduled';

export class Lesson {
  constructor(
    public readonly id: number,
    public readonly date: Date,
    public readonly beginTime: string,
    public readonly classId: number,
    public readonly records: { visit?: boolean; userId?: number }[],
    public readonly teacherIds: number[],
    public readonly comment?: string,
    public readonly status?: LessonStatus
  ) {}

  public get isUnmarked(): boolean {
    const isCompleted = this.status === 'completed';
    const isNoVisits = this.records.every((record) => !record.visit);
    const isNoReasonComment = !this.comment || !this.comment.trim().startsWith('#');

    return isNoVisits && isNoReasonComment && isCompleted;
  }
}
