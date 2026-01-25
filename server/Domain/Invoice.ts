export class Invoice {
  constructor(
    public readonly price: number,
    public readonly payed: number,
    public readonly payUntil: Date,
    public readonly userId: number
  ) {}

  public get isDebt(): boolean {
    return this.price !== this.payed;
  }

  public isOverdue(date: Date = new Date()): boolean {
    return this.payUntil < date;
  }

  public static calculateTotalDebt(invoices: Invoice[]): number {
    return invoices.reduce(
      (sum, invoice) => sum + (invoice.price - invoice.payed),
      0
    );
  }

  public static findEarliestPayUntil(invoices: Invoice[]): Date {
    const payUntilDates = invoices.map((invoice) => invoice.payUntil);
    return new Date(Math.min(...payUntilDates.map((date) => date.getTime())));
  }
}
