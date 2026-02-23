import type { ITableRepository } from "../../ports/repositories/ITableRepository.js";

export class GetTables {
  constructor(private repo: ITableRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
