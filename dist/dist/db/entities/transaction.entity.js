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
const phase_entity_1 = __importDefault(require("./phase.entity"));
const seller_entity_1 = __importDefault(require("./seller.entity"));
let Transaction = class Transaction extends typeorm_1.BaseEntity {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Transaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => phase_entity_1.default, (phase) => phase.bargains, {
        createForeignKeyConstraints: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", phase_entity_1.default)
], Transaction.prototype, "phase", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => buyer_entity_1.default, (buyer) => buyer.transactions, {
        createForeignKeyConstraints: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", buyer_entity_1.default)
], Transaction.prototype, "buyer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => seller_entity_1.default, (seller) => seller.transactions, {
        createForeignKeyConstraints: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", seller_entity_1.default)
], Transaction.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Transaction.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Transaction.prototype, "timeCreated", void 0);
Transaction = __decorate([
    (0, typeorm_1.Entity)("transaction")
], Transaction);
exports.default = Transaction;
