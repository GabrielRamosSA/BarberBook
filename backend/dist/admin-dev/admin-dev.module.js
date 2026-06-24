"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDevModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const admin_dev_controller_1 = require("./admin-dev.controller");
const admin_dev_service_1 = require("./admin-dev.service");
const admin_dev_guard_1 = require("./admin-dev.guard");
let AdminDevModule = class AdminDevModule {
};
exports.AdminDevModule = AdminDevModule;
exports.AdminDevModule = AdminDevModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('DEV_ADMIN_JWT_SECRET') || 'dev-admin-secret-change-me',
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [admin_dev_controller_1.AdminDevController],
        providers: [admin_dev_service_1.AdminDevService, admin_dev_guard_1.AdminDevGuard],
    })
], AdminDevModule);
//# sourceMappingURL=admin-dev.module.js.map