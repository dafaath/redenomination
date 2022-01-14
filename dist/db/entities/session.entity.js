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
const phase_entity_1 = __importDefault(require("./phase.entity"));
const simulation_entity_1 = __importDefault(require("./simulation.entity"));
let Session = class Session extends typeorm_1.BaseEntity {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Session.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => simulation_entity_1.default, (simulation) => simulation.sessions, {
        createForeignKeyConstraints: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", simulation_entity_1.default)
], Session.prototype, "simulation", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => phase_entity_1.default, (phases) => phases.session),
    __metadata("design:type", Array)
], Session.prototype, "phases", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
    }),
    __metadata("design:type", String)
], Session.prototype, "sessionType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Session.prototype, "avgTrxOccurrence", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "numeric",
        precision: 15,
        scale: 2,
    }),
    __metadata("design:type", Number)
], Session.prototype, "avgTrxPrice", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Session.prototype, "timeCreated", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Session.prototype, "timeStart", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "timestamp",
    }),
    __metadata("design:type", Date)
], Session.prototype, "timeFinish", void 0);
Session = __decorate([
    (0, typeorm_1.Entity)("session")
], Session);
exports.default = Session;
