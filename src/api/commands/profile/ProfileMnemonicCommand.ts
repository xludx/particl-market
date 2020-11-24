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
import { DefaultSettingService } from '../../services/DefaultSettingService';
import { BooleanValidationRule, CommandParamValidationRules, IdValidationRule, ParamValidationRule } from '../CommandParamValidation';
import {IdentityType} from '../../enums/IdentityType';
import {MessageException} from '../../exceptions/MessageException';
import {IdentityService} from '../../services/model/IdentityService';
import {IdentityUpdateRequest} from '../../requests/model/IdentityUpdateRequest';


export interface ProfileMnemonic {
    mnemonic: string;
    passphrase: string;
}

export class ProfileMnemonicCommand extends BaseCommand implements RpcCommandInterface<ProfileMnemonic> {

    public log: LoggerType;

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.ProfileService) private profileService: ProfileService,
        @inject(Types.Service) @named(Targets.Service.model.IdentityService) private identityService: IdentityService,
        @inject(Types.Service) @named(Targets.Service.DefaultSettingService) private defaultSettingService: DefaultSettingService
    ) {
        super(Commands.PROFILE_MNEMONIC);
        this.log = new Logger(__filename);
    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('profileId', true, this.profileService),
                new BooleanValidationRule('clean', false, false)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    /**
     * data.params[]:
     *  [0]: profile: resources.Profile
     *  [1]; clean: boolean
     *
     * @param data
     * @returns {Promise<Profile>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<ProfileMnemonic> {
        let profileIdentity: resources.Identity = data.params[0];
        const clean: boolean = data.params[1];

        if (clean) {
            profileIdentity = await this.identityService.clear(profileIdentity.id).then(value => value.toJSON());
        }

        return {
            mnemonic: profileIdentity.mnemonic,
            passphrase: profileIdentity.passphrase
        } as ProfileMnemonic;
    }

    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);

        const profile: resources.Profile = data.params[0];
        const profileIdentity: resources.Identity | undefined = _.find(profile.Identities, identity => {
            return identity.type === IdentityType.PROFILE;
        });

        if (!profileIdentity) {
            throw new MessageException('Missing Profile Identity.');
        }
        data.params[0] = profileIdentity;
        return data;
    }

    public usage(): string {
        return this.getName() + ' <id> [clean] ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <id>             - number, the Id of the Profile. \n'
            + '    <clean>          - [optional] boolean, clear the stored mnemonic, default: false. \n';
    }

    public description(): string {
        return 'Get/Clean the stored Profile mnemonic.';
    }

    public example(): string {
        return 'profile ' + this.getName() + ' 1 true';
    }
}
