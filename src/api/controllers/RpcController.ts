// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as interfaces from '../../types/interfaces';
import { inject, named } from 'inversify';
import { controller, httpPost, response, requestBody } from 'inversify-express-utils';
import { app } from '../../app';
import { Types, Core, Targets } from '../../constants';
import { Logger as LoggerType } from '../../core/Logger';
import { JsonRpc2Request, JsonRpc2Response, RpcErrorCode } from '../../core/api/jsonrpc';
import { NotFoundException } from '../exceptions/NotFoundException';
import { RpcCommandFactory } from '../factories/RpcCommandFactory';
import { RpcRequest } from '../requests/RpcRequest';
import { Commands} from '../commands/CommandEnumType';
import { RpcCommandInterface } from '../commands/RpcCommandInterface';
import {Environment} from '../../core/helpers/Environment';

// Get middlewares
const rpc = app.IoC.getNamed<interfaces.Middleware>(Types.Middleware, Targets.Middleware.RpcMiddleware);
const authenticateMiddleware = app.IoC.getNamed<interfaces.Middleware>(Types.Middleware, Targets.Middleware.AuthenticateMiddleware);

let rpcIdCount = 0;
@controller('/rpc', authenticateMiddleware.use, rpc.use)
export class RpcController {

    private log: LoggerType;
    private VERSION = '2.0';
    private MAX_INT32 = 2147483647;

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Factory) @named(Targets.Factory.RpcCommandFactory) private rpcCommandFactory: RpcCommandFactory
    ) {
        this.log = new Logger(__filename);
    }

    @httpPost('/')
    public async handleRPC( @response() res: myExpress.Response, @requestBody() body: any): Promise<any> {

        let rpcRequest: RpcRequest = this.createRequest(body.method, body.params, body.id);

        if (Environment.isTruthy(process.env.LOG_RPC_INCOMING)) {
            if (rpcRequest.method === Commands.IMAGE_ROOT.commandName && rpcRequest.params[0] === Commands.IMAGE_ADD.commandName) {
                this.log.debug('controller.handleRPC():', rpcRequest.method + ' ' + rpcRequest.params[0] + '...');
            } else {
                this.log.debug('controller.handleRPC():', rpcRequest.method + ' ' + rpcRequest.params);
            }
        }

        // get the commandType for the method name
        const commandType = _.find(Commands.rootCommands, command => command.commandName === body.method);
        if (commandType) {
            // ... use the commandType to get the correct RpcCommand implementation and execute
            const rpcCommand: RpcCommandInterface<any> = this.rpcCommandFactory.get(commandType);
            const newRpcRequest = await rpcCommand.validate(rpcRequest);
            rpcRequest = newRpcRequest ? newRpcRequest : rpcRequest;
            const result = await rpcCommand.execute(rpcRequest, this.rpcCommandFactory);
            return this.createResponse(rpcRequest.id, result);
        } else {
            throw new NotFoundException('Unknown command: ' + body.method + '\n');
        }

    }

    private createRequest(method: string, params?: any, id?: string | number): RpcRequest {
        if (id === null || id === undefined) {
            id = this.generateId();
        } else if (typeof (id) !== 'number') {
            id = String(id);
        }
        return new RpcRequest({ jsonrpc: this.VERSION, method: method.toLowerCase(), params, id });
    }

    private createResponse(id: string | number = '', result?: any, error?: any): JsonRpc2Response {
        if (error) {
            return { id, jsonrpc: this.VERSION, error };
        } else {
            return { id, jsonrpc: this.VERSION, result };
        }
    }

    private generateId(): number {
        if (rpcIdCount >= this.MAX_INT32) {
            rpcIdCount = 0;
        }
        return ++rpcIdCount;
    }

    private getErrorMessage(code: number): string {
        switch (code) {
            case RpcErrorCode.ParseError:
                return 'Parse error';
            case RpcErrorCode.InvalidRequest:
                return 'Invalid Request';
            case RpcErrorCode.MethodNotFound:
                return 'Method not found';
            case RpcErrorCode.InvalidParams:
                return 'Invalid params';
            case RpcErrorCode.InternalError:
                return 'Internal error';
            default:
                return 'Unknown Error';
        }
    }
}
