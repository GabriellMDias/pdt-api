import { PartialType } from "@nestjs/swagger";
import { CreateCostCenterTypeDto } from "./create-cost-center-type.dto";

export class UpdateCostCenterTypeDto extends PartialType(CreateCostCenterTypeDto) {}