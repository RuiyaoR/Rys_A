declare module "mailparser" {
  export interface ParsedMail {
    text?: string;
    html?: string;
    subject?: string;
    from?: { text?: string };
    to?: { text?: string };
    date?: Date;
  }
  export function simpleParser(
    input: Buffer | NodeJS.ReadableStream
  ): Promise<ParsedMail>;
}
