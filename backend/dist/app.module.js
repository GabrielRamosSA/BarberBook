"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const user_module_1 = require("./user/user.module");
const barbearia_module_1 = require("./barbearia/barbearia.module");
const barbeiro_module_1 = require("./barbeiro/barbeiro.module");
const servico_module_1 = require("./servico/servico.module");
const horario_module_1 = require("./horario/horario.module");
const agendamento_module_1 = require("./agendamento/agendamento.module");
const pagamento_module_1 = require("./pagamento/pagamento.module");
const suporte_module_1 = require("./suporte/suporte.module");
const admin_dev_module_1 = require("./admin-dev/admin-dev.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            barbearia_module_1.BarbeariaModule,
            barbeiro_module_1.BarbeiroModule,
            servico_module_1.ServicoModule,
            horario_module_1.HorarioModule,
            agendamento_module_1.AgendamentoModule,
            pagamento_module_1.PagamentoModule,
            suporte_module_1.SuporteModule,
            admin_dev_module_1.AdminDevModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map