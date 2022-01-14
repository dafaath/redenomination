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
const bargain_entity_1 = __importDefault(require("./bargain.entity"));
const simulation_entity_1 = __importDefault(require("./simulation.entity"));
const transaction_entity_1 = __importDefault(require("./transaction.entity"));
let Seller = class Seller extends typeorm_1.BaseEntity {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Seller.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => bargain_entity_1.default, (bargain) => bargain.seller),
    __metadata("design:type", Array)
], Seller.prototype, "bargains", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => simulation_entity_1.default, (simulation) => simulation.sellers, {
        createForeignKeyConstraints: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", simulation_entity_1.default)
], Seller.prototype, "simulation", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => transaction_entity_1.default, (transaction) => transaction.seller),
    __metadata("design:type", Array)
], Seller.prototype, "transactions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
    }),
    __metadata("design:type", String)
], Seller.prototype, "loginToken", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Seller.prototype, "unitCost", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Seller.prototype, "pricePreRedenom", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Seller.prototype, "priceRedenom", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Seller.prototype, "pricePostRedenom", void 0);
Seller = __decorate([
    (0, typeorm_1.Entity)("seller")
], Seller);
exports.default = Seller;
