import { Body, Controller, Get, Put, Query, UseGuards, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { TipMovEntity } from './entities/tip-mov.entity'
import { TopService } from "./top.service";
import { TipoRestricaoEntity } from "./entities/tipo-restricao.entity";
import { RestricaoTopEntity } from "./entities/restricao-top.entity";
import { TopEntity } from "./entities/top.entity";
import { RestricaoTopQueryDto } from "./dto/restricao-top.query.dto";
import { UpdateRestricaoTopDto } from "./dto/update-restricao-top.dto";
import { GetStoresQueryDto } from "./dto/get-stores.query.dto";
import { GetSuppliersQueryDto } from "./dto/get-suppliers.query.dto";
import { GetProductsQueryDto } from "./dto/get-products.query.dto";
import { GetUsersQueryDto } from "./dto/get-users.query.dto";
import { GetProductTypesQueryDto } from "./dto/get-product-types.query.dto";


@Controller('top')
@ApiTags('top')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiExtraModels(TipMovEntity, TipoRestricaoEntity, RestricaoTopEntity, TopEntity)
export class TopController {
    constructor(private readonly topService: TopService) {}

    @Get('tipmov')
    @Permissions('top-restrictions:consultar')
    @ApiOkResponse({ type: TipMovEntity, isArray: true})
    getTipMov() {
        return this.topService.getTipMov()
    }

    @Get('tipo-restricao')
    @Permissions('top-restrictions:consultar')
    @ApiOkResponse({ type: TipoRestricaoEntity, isArray: true})
    getTipoRestricao() {
        return this.topService.getTipoRestricao()
    }

    @Get('restricao-top')
    @Permissions('top-restrictions:consultar')
    @ApiOkResponse({ type: RestricaoTopEntity, isArray: true})
    @ApiQuery({ name: 'codtipoper', required: true, type: Number, example: '56' })
    @ApiQuery({ name: 'tipmov', required: true, type: Number, example: '1' })
    @ApiQuery({name: 'tiporestricao', required: true, type: Number, example: '6'})
    getRestricaoTop(@Query(new ValidationPipe({ transform: true })) dto: RestricaoTopQueryDto) {
        return this.topService.getRestricaoTop(dto)
    }

    @Get('list')
    @Permissions('top-restrictions:consultar')
    @ApiOkResponse({ type: TopEntity, isArray: true })
    getTops() {
        return this.topService.getTops()
    }

    @Get("stores")
    @Permissions("top-restrictions:consultar")
    @ApiQuery({ name: "q", required: false, type: String, example: "1 ou matriz" })
    @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
    @ApiOkResponse({
    schema: {
        example: {
        data: [{ id: 1, descricao: "Matriz" }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
    },
    })
    getStores(@Query(new ValidationPipe({ transform: true })) dto: GetStoresQueryDto) {
    return this.topService.getStores(dto);
    }

    @Get("suppliers")
    @Permissions("top-restrictions:consultar")
    @ApiQuery({ name: "q", required: false, type: String, example: "123 ou comercio" })
    @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
    @ApiOkResponse({
    schema: {
        example: {
        data: [{ id: 10, razaosocial: "Comércio XYZ LTDA" }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
    },
    })
    getSuppliers(
    @Query(new ValidationPipe({ transform: true }))
    dto: GetSuppliersQueryDto,
    ) {
    return this.topService.getSuppliers(dto);
    }

    @Get("products")
    @Permissions("top-restrictions:consultar")
    @ApiQuery({ name: "q", required: false, type: String, example: "arroz ou 100" })
    @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
    @ApiOkResponse({
    schema: {
        example: {
        data: [
            { id: 10, descricaocompleta: "Arroz Tipo 1 5kg" }
        ],
        meta: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
        }
        }
    }
    })
    getProducts(
    @Query(new ValidationPipe({ transform: true }))
    dto: GetProductsQueryDto,
    ) {
    return this.topService.getProducts(dto);
    }

    @Get("users")
    @Permissions("top-restrictions:consultar")
    @ApiQuery({ name: "q", required: false, type: String, example: "joao ou 15" })
    @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
    @ApiOkResponse({
    schema: {
        example: {
        data: [{ id: 5, nome: "João da Silva" }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
    },
    })
    getUsers(
    @Query(new ValidationPipe({ transform: true }))
    dto: GetUsersQueryDto,
    ) {
    return this.topService.getUsers(dto);
    }

    @Get("product-types")
    @Permissions("top-restrictions:consultar")
    @ApiQuery({ name: "q", required: false, type: String, example: "alimento ou 2" })
    @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
    @ApiOkResponse({
    schema: {
        example: {
        data: [{ id: 1, descricao: "Alimentos" }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
    },
    })
    getProductTypes(
    @Query(new ValidationPipe({ transform: true }))
    dto: GetProductTypesQueryDto,
    ) {
    return this.topService.getProductTypes(dto);
    }

    @Put('restricao-top')
    @Permissions('top-restrictions:editar')
    @ApiOkResponse({ type: RestricaoTopEntity})
    updateRestricaoTop(@Body() dto: UpdateRestricaoTopDto) {
        return this.topService.updateRestricaoTop(dto)
    }
}