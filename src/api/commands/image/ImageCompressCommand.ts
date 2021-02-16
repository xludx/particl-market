// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { ListingItemTemplateService } from '../../services/model/ListingItemTemplateService';
import { RpcRequest } from '../../requests/RpcRequest';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands } from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { Image } from '../../models/Image';
import { ImageService } from '../../services/model/ImageService';
import { CoreMessageVersion } from '../../enums/CoreMessageVersion';
import { ImageVersions } from '../../../core/helpers/ImageVersionEnumType';
import { ImageDataService } from '../../services/model/ImageDataService';
import { ModelNotFoundException } from '../../exceptions/ModelNotFoundException';
import {
    CommandParamValidationRules,
    EnumValidationRule,
    IdValidationRule,
    NumberValidationRule,
    ParamValidationRule,
    ScalingValueValidationRule
} from '../CommandParamValidation';
import { EnumHelper } from '../../../core/helpers/EnumHelper';

export class ImageCompressCommand extends BaseCommand implements RpcCommandInterface<Image> {

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.ImageService) public imageService: ImageService,
        @inject(Types.Service) @named(Targets.Service.model.ImageDataService) public imageDataService: ImageDataService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemTemplateService) public listingItemTemplateService: ListingItemTemplateService
    ) {
        super(Commands.IMAGE_COMPRESS);
        this.log = new Logger(__filename);
    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('imageId', true, this.imageService),
                new EnumValidationRule('messageVersionToFit', false, 'CoreMessageVersion',
                    EnumHelper.getValues(CoreMessageVersion) as string[], CoreMessageVersion.FREE),
                new ScalingValueValidationRule('scalingFraction', false, 0.9),
                new ScalingValueValidationRule('qualityFraction', false, 0.9),
                new NumberValidationRule('maxIterations', false, 10)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    /**
     * data.params[]:
     *  [0]: image: resources.Image
     *  [1]: messageVersionToFit: CoreMessageVersion, default: FREE
     *  [2]: scalingFraction, default: 0.9
     *  [3]: qualityFraction, default: 0.9
     *  [4]: maxIterations, default: 10
     *
     * @param data
     * @returns {Promise<Image>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<Image> {
        const image: resources.Image = data.params[0];
        const messageVersionToFit: CoreMessageVersion = data.params[1];
        const scalingFraction: number = data.params[2];
        const qualityFraction: number = data.params[3];
        const maxIterations: number = data.params[4];

        return await this.imageService.createResizedVersion(image.id, messageVersionToFit, scalingFraction, qualityFraction, maxIterations);
    }

    /**
     * data.params[]:
     *  [0]: imageId
     *  [1]: messageVersionToFit: CoreMessageVersion, default: FREE
     *  [2]: scalingFraction, default: 0.9
     *  [3]: qualityFraction, default: 0.9
     *  [4]: maxIterations, default: 10
     *
     * @param data
     * @returns {Promise<RpcRequest>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data); // validates the basic search params, see: BaseSearchCommand.validateSearchParams()

        const image: resources.Image = data.params[0];

        const imageDataOriginal: resources.ImageData | undefined = _.find(image.ImageDatas, (imageData) => {
            return imageData.imageVersion === ImageVersions.ORIGINAL.propName;
        });

        if (_.isNil(imageDataOriginal)) {
            throw new ModelNotFoundException('ImageData');
        }

        // throws if load failed
        imageDataOriginal.data = await this.imageDataService.loadImageFile(image.hash, ImageVersions.ORIGINAL.propName);

        data.params[0] = image;
        return data;
    }

    public usage(): string {
        return this.getName() + ' <imageId> [messageVersionToFit] [scalingFraction] [qualityFraction] [maxIterations]';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <imageId>                - number, Id of the ListingItemTemplate. '
            + '    <messageVersionToFit>    - [optional] string, CoreMessageVersion to fit. '
            + '    <scalingFraction>        - [optional] number used to scale the Image size. '
            + '    <qualityFraction>        - [optional] number used to scale the Image quality. '
            + '    <maxIterations>          - [optional] number of max iterations run. ';
    }

    public description(): string {
        return 'Compress the Images to fit in an SmsgMessage.';
    }

    public example(): string {
        return 'image ' + this.getName() + ' 1';
    }
}
