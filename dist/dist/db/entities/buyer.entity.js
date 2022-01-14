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
let Buyer = class Buyer extends typeorm_1.BaseEntity {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Buyer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => bargain_entity_1.default, (bargain) => bargain.buyer),
    __metadata("design:type", Array)
], Buyer.prototype, "bargains", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => transaction_entity_1.default, (transaction) => transaction.buyer),
    __metadata("design:type", Array)
], Buyer.prototype, "transactions", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => simulation_entity_1.default, (simulation) => simulation.buyers, {
        createForeignKeyConstraints: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", simulation_entity_1.default)
], Buyer.prototype, "simulation", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
    }),
    __metadata("design:type", String)
], Buyer.prototype, "loginToken", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Buyer.prototype, "unitValue", void 0);
Buyer = __decorate([
    (0, typeorm_1.Entity)("buyer")
], Buyer);
exports.default = Buyer;
