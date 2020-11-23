// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { ProfileService } from '../../services/model/ProfileService';
import { RpcRequest } from '../../requests/RpcRequest';
import { Profile } from '../../models/Profile';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands} from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { InvalidParamException } from '../../exceptions/InvalidParamException';
import { DefaultSettingService } from '../../services/DefaultSettingService';
import { ModelNotFoundException } from '../../exceptions/ModelNotFoundException';
import { CommandParamValidationRules, IdValidationRule, ParamValidationRule } from '../CommandParamValidation';

export class ProfileDefaultCommand extends BaseCommand implements RpcCommandInterface<Profile> {

    public log: LoggerType;

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.ProfileService) private profileService: ProfileService,
        @inject(Types.Service) @named(Targets.Service.DefaultSettingService) private defaultSettingService: DefaultSettingService
    ) {
        super(Commands.PROFILE_DEFAULT);
        this.log = new Logger(__filename);
    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('profileId', false, this.profileService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    /**
     * data.params[]:
     *  [0]: id
     *
     * @param data
     * @returns {Promise<Profile>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<Profile> {
        const profile: resources.Profile = data.params[0];

        if (!_.isNil(profile)) {
            // set
            const setting: resources.Setting = await this.defaultSettingService.insertOrUpdateDefaultProfileSetting(profile.id);
            return await this.profileService.findOne(parseInt(setting.value, 10));
        } else {
            // get
            return await this.profileService.getDefault();
        }
    }

    /**
     * data.params[]:
     *  [0]: id, optional
     *
     * @param data
     * @returns {Promise<Profile>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data); // validates the basic search params, see: BaseSearchCommand.validateSearchParams()
        return data;
    }

    public usage(): string {
        return this.getName() + ' [id] ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <id>            - The Id of the Profile we want to set as the default. \n';
    }

    public description(): string {
        return 'Get/Set the default Profile.';
    }

    public example(): string {
        return 'profile ' + this.getName() + ' 1';
    }
}
