import type { Request, Response } from "express";
import type { CreateCatalogItemDto } from "../../../application/dtos/create-catalog-item.dto";
import type { CreateCatalogItemUseCase } from "../../../application/use-cases/create-catalog-item.use-case";
import type { ListCatalogItemsUseCase } from "../../../application/use-cases/list-catalog-items.use-case";
import type { GetCatalogItemUseCase } from "../../../application/use-cases/get-catalog-item.use-case";
import { asyncHandler } from "@pgic/shared";

export class CatalogItemController {
  constructor(
    private readonly createCatalogItem: CreateCatalogItemUseCase,
    private readonly listCatalogItems: ListCatalogItemsUseCase,
    private readonly getCatalogItem: GetCatalogItemUseCase
  ) {}

  create = asyncHandler(async (req: Request<object, object, CreateCatalogItemDto>, res: Response) => {
    const item = await this.createCatalogItem.execute(req.body);
    res.status(201).json(item);
  });

  list = asyncHandler(async (_req: Request, res: Response) => {
    const items = await this.listCatalogItems.execute();
    res.json(items);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const item = await this.getCatalogItem.execute(id);
    res.json(item);
  });
}
