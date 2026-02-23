export interface IOrderCodeGenerator {
  next(): Promise<string>;
}
