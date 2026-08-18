export type LessonStatus = 'completed' | 'scheduled';

export class Lesson {
  constructor(
    public readonly id: number,
    public readonly date: Date,
    public readonly beginTime: string,
    public readonly groupId: number,
    public readonly records: { visit?: boolean; studentId?: number }[],
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

  public isPastScheduled(currentDate: Date): boolean {
    const lessonDateTime = new Date(this.date);
    const [hours, minutes] = this.beginTime.split(':').map(Number);
    lessonDateTime.setHours(hours, minutes, 0, 0);

    return this.status === 'scheduled' && lessonDateTime < currentDate;
  }
}
