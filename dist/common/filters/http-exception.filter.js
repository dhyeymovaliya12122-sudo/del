"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalHttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalHttpExceptionFilter = class GlobalHttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger('ExceptionFilter');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let errorMessage;
        let errorName;
        if (exception instanceof common_1.HttpException) {
            const res = exception.getResponse();
            if (typeof res === 'string') {
                errorMessage = res;
            }
            else if (typeof res === 'object' && res !== null) {
                const resObj = res;
                if (typeof resObj.message === 'string') {
                    errorMessage = resObj.message;
                }
                else if (Array.isArray(resObj.message)) {
                    errorMessage = resObj.message.join(', ');
                }
                else if (typeof resObj.error === 'string') {
                    errorMessage = resObj.error;
                }
                else {
                    errorMessage = 'Request failed';
                }
                errorName = typeof resObj.error === 'string' ? resObj.error : undefined;
            }
            else {
                errorMessage = String(res);
            }
        }
        else if (exception instanceof Error) {
            errorMessage = exception.message;
            errorName = exception.name;
        }
        else {
            errorMessage = 'Internal server error';
        }
        const isProd = process.env.NODE_ENV === 'production';
        this.logger.error(`${request.method} ${request.url} → ${status}: ${errorMessage}`, exception instanceof Error ? exception.stack : undefined);
        const clientMessage = isProd && status >= common_1.HttpStatus.INTERNAL_SERVER_ERROR
            ? 'An internal server error occurred.'
            : errorMessage;
        response.status(status).json({
            statusCode: status,
            error: errorName || (status >= 500 ? 'Internal Server Error' : 'Error'),
            message: clientMessage,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
exports.GlobalHttpExceptionFilter = GlobalHttpExceptionFilter;
exports.GlobalHttpExceptionFilter = GlobalHttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalHttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map