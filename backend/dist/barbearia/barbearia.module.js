"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarbeariaModule = void 0;
const common_1 = require("@nestjs/common");
const barbearia_controller_1 = require("./barbearia.controller");
const barbearia_service_1 = require("./barbearia.service");
let BarbeariaModule = class BarbeariaModule {
};
exports.BarbeariaModule = BarbeariaModule;
exports.BarbeariaModule = BarbeariaModule = __decorate([
    (0, common_1.Module)({
        controllers: [barbearia_controller_1.BarbeariaController],
        providers: [barbearia_service_1.BarbeariaService],
        exports: [barbearia_service_1.BarbeariaService],
    })
], BarbeariaModule);
//# sourceMappingURL=barbearia.module.js.map