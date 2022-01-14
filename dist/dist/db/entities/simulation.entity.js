"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const buyer_entity_1 = __importDefault(require("./buyer.entity"));
const seller_entity_1 = __importDefault(require("./seller.entity"));
const session_entity_1 = __importDefault(require("./session.entity"));
let Simulation = class Simulation extends typeorm_1.BaseEntity {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Simulation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
    }),
    __metadata("design:type", String)
], Simulation.prototype, "simulationType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
    }),
    __metadata("design:type", String)
], Simulation.prototype, "goodsType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
    }),
    __metadata("design:type", String)
], Simulation.prototype, "inflationType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Simulation.prototype, "avgTrxOccurrence", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Simulation.prototype, "avgTrxPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "float",
    }),
    __metadata("design:type", Number)
], Simulation.prototype, "timer", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Simulation.prototype, "timeCreated", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Simulation.prototype, "timeStart", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Simulation.prototype, "timeFinish", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => session_entity_1.default, (session) => session.simulation),
    __metadata("design:type", Array)
], Simulation.prototype, "sessions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => buyer_entity_1.default, (buyer) => buyer.simulation),
    __metadata("design:type", Array)
], Simulation.prototype, "buyers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => seller_entity_1.default, (seller) => seller.simulation),
    __metadata("design:type", Array)
], Simulation.prototype, "sellers", void 0);
Simulation = __decorate([
    (0, typeorm_1.Entity)("simulation")
], Simulation);
exports.default = Simulation;
