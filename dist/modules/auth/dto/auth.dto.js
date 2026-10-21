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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutDto = exports.ResetPasswordDto = exports.ForgotPasswordDto = exports.UpdatePasswordDto = exports.CreateAdminDto = exports.LoginDto = void 0;
const class_validator_1 = require("class-validator");
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Username must be a string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Username is required' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Username cannot exceed 100 characters' }),
    __metadata("design:type", String)
], LoginDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Password must be a string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Password is required' }),
    (0, class_validator_1.MinLength)(1, { message: 'Password cannot be empty' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password cannot exceed 128 characters' }),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class CreateAdminDto {
}
exports.CreateAdminDto = CreateAdminDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password cannot exceed 128 characters' }),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "displayName", void 0);
class UpdatePasswordDto {
}
exports.UpdatePasswordDto = UpdatePasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password cannot exceed 128 characters' }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "newPassword", void 0);
class ForgotPasswordDto {
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "identity", void 0);
class ResetPasswordDto {
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "token", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password cannot exceed 128 characters' }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
class LogoutDto {
}
exports.LogoutDto = LogoutDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], LogoutDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], LogoutDto.prototype, "displayName", void 0);
//# sourceMappingURL=auth.dto.js.map