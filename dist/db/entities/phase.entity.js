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
const session_entity_1 = __importDefault(require("./session.entity"));
const transaction_entity_1 = __importDefault(require("./transaction.entity"));
let Phase = class Phase extends typeorm_1.BaseEntity {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Phase.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => session_entity_1.default, (session) => session.phases, {
        createForeignKeyConstraints: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", session_entity_1.default)
], Phase.prototype, "session", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => bargain_entity_1.default, (bargain) => bargain.phase),
    __metadata("design:type", Array)
], Phase.prototype, "bargains", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => transaction_entity_1.default, (transaction) => transaction.phase),
    __metadata("design:type", Array)
], Phase.prototype, "transactions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Phase.prototype, "avgTrxOccurrence", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Phase.prototype, "avgTrxPrice", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Phase.prototype, "timeCreated", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Phase.prototype, "timeStart", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Phase.prototype, "timeFinish", void 0);
Phase = __decorate([
    (0, typeorm_1.Entity)("phase")
], Phase);
exports.default = Phase;
