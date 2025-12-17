import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AnalysisTypeQueryDto } from "./dto/analysis-type.query.dto";

@Injectable()
export class AnalysisService {
  constructor(private prisma: PrismaService) {}

  async findTypes(query: AnalysisTypeQueryDto) {
    const { groupName, active, code } = query;

    return this.prisma.analysisType.findMany({
      where: {
        ...(groupName && { groupName }),
        ...(active !== undefined && { active }),
        ...(code && { code })
      },
      include: {
        fields: {
          orderBy: { order: "asc" }
        }
      },
      orderBy: [
        { groupName: "asc" },
        { description: "asc" }
      ]
    });
  }
}
