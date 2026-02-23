import type { ITableRepository } from "../../ports/repositories/ITableRepository.js";

export class GetTableByDirection {
  constructor(private repo: ITableRepository) {}
  execute(directionId: string) {
    return this.repo.findByDirectionId(directionId);
  }
}
