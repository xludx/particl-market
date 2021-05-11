// Copyright (c) 2017-2021, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as resources from 'resources';
import * as _ from 'lodash';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../core/Logger';
import { Types, Core, Targets } from '../../constants';
import { ItemCategoryService } from './model/ItemCategoryService';
import { ItemCategoryCreateRequest } from '../requests/model/ItemCategoryCreateRequest';

interface CategoryItems {
    name: string;
    description?: string;
    subCategories?: CategoryItems[];
}

export class DefaultItemCategoryService {

    public log: LoggerType;

    constructor(
        @inject(Types.Service) @named(Targets.Service.model.ItemCategoryService) public itemCategoryService: ItemCategoryService,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }

    /**
     *
     * @param market receiveAddress
     */
    public async seedDefaultCategories(market?: string): Promise<void> {

        // this.log.debug('seedDefaultCategories(), market: ', market);
        const ROOT: resources.ItemCategory = await this.itemCategoryService.insertOrUpdateCategory(
            { name: 'ROOT', description: 'root item category', market } as ItemCategoryCreateRequest
        );

        const categories: CategoryItems[] = [
            {
                name: 'Clothing & Apparel',
                subCategories: [
                    { name: 'Men' },
                    { name: 'Women' },
                    { name: 'Children' },
                    { name: 'Accessories' },
                    { name: 'Other Apparel' }
                ]
            },

            {
                name: 'Apps & Software',
                subCategories: [
                    { name: 'Windows' },
                    { name: 'macOS' },
                    { name: 'Linux' },
                    { name: 'Games' },
                    { name: 'Mobile' },
                    { name: 'Other Software' }
                ]
            },

            {
                name: 'Automotive & Machinery'
            },

            {
                name: 'Media',
                subCategories: [
                    { name: 'Books' },
                    { name: 'E-Books' },
                    { name: 'Music' },
                    { name: 'Movies and Entertainment' },
                    { name: 'Other Media' }
                ]
            },

            {
                name: 'Mobile Devices',
                subCategories: [
                    { name: 'Accessories' },
                    { name: 'Phones' },
                    { name: 'Tablets and Ebook Readers' },
                    { name: 'Other Mobile Devices' }
                ]
            },

            {
                name: 'Electronics',
                subCategories: [
                    { name: 'Audio' },
                    { name: 'Automation & Security' },
                    { name: 'Video & Camera' },
                    { name: 'TV' },
                    { name: 'Office Equipment' },
                    { name: 'Computers' },
                    { name: 'Computer Accessories' },
                    { name: 'Gaming & Consoles' },
                    { name: 'Smart Devices' },
                    { name: 'Misc. Electronics' }
                ]
            },

            {
                name: 'Food and Nutrition',
                subCategories: [
                    { name: 'Fruits & Vegetables' },
                    { name: 'Meat' },
                    { name: 'Dairy Products' },
                    { name: 'Grains & Seeds' },
                    {
                        name: 'Beverages',
                        subCategories: [
                            { name: 'Non-alcoholic'},
                            { name: 'Alcoholic'}
                        ]
                    }
                ]
            },

            {
                name: 'Health & Beauty',
                subCategories: [
                    { name: 'Health & Personal Care' },
                    { name: 'Household Supplies' },
                    { name: 'Beauty Products' },
                    { name: 'Baby & Infant Care' },
                    { name: 'Vitamins & Supplements' },
                    { name: 'Misc Health & Beauty' }
                ]
            },

            {
                name: 'Home',
                subCategories: [
                    { name: 'Furniture' },
                    { name: 'Appliances' },
                    { name: 'Decor' },
                    { name: 'Hardware & Tools' },
                    { name: 'Pet Supplies' },
                    { name: 'Garden' },
                    { name: 'DIY Equipment' },
                    { name: 'Misc. Home Products'}
                ]
            },

            {
                name: 'Office, Business & Industrial',
                subCategories: [
                    { name: 'Office Equipment & Supplies' },
                    { name: 'Electrical Equipment & Supplies' },
                    { name: 'Retail Equipment & Supplies' },
                    { name: 'Building Materials & Supplies' },
                    { name: 'Hardware' },
                    { name: 'Restuarant & Food Equipment' }
                ]
            },

            {
                name: 'Sports & Outdoors'
            },

            {
                name: 'Games & Toys'
            },

            {
                name: 'Services',
                subCategories: [
                    { name: 'Vouchers & Gift Cards' },
                    { name: 'Creative' },
                    { name: 'Legal' },
                    { name: 'Other Services' }
                ]
            },

            {
                name: 'Crypto',
                subCategories: [
                    { name: 'Merchandise & Swag' },
                    { name: 'OTC Trading' },
                    { name: 'Wallets' },
                    { name: 'Other Crypto' }
                ]
            },

            {
                name: 'Collectibles',
                subCategories: [
                    { name: 'Non-Sports Cards' },
                    { name: 'Sports Cards' },
                    { name: 'Trading Card Games (TCG)' },
                    { name: 'Coins' },
                    { name: 'Other Collectibles' }
                ]
            }
        ];

        this.processCategories([ROOT], categories, market);

        this.log.debug('Default categories updated!');
    }

    private async processCategories(parents: resources.ItemCategory[], categoryItems: CategoryItems[] = [], market?: string): Promise<void> {
        for (const cat of categoryItems) {
            if (!cat.name) {
                continue;
            }
            const description = typeof cat.description === 'string' ? cat.description : '';
            const createCategory = await this.itemCategoryService.insertOrUpdateCategory(
                { name: cat.name, description, market } as ItemCategoryCreateRequest, parents
            );

            if (cat.subCategories) {
                await this.processCategories([...parents, createCategory], cat.subCategories, market);
            }
        }
    }

}
