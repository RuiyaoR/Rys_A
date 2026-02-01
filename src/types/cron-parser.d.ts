declare module "cron-parser" {
  export interface ParserOptions {
    currentDate?: Date | string | number;
  }
  export interface CronExpression {
    next(): CronExpression;
    toDate(): Date;
  }
  export function parseExpression(
    expression: string,
    options?: ParserOptions
  ): CronExpression;
}
