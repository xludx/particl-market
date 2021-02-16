// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { Bookshelf } from '../../config/Database';
import { Image } from './Image';
import { Collection, Model } from 'bookshelf';
import { SearchOrder } from '../enums/SearchOrder';

export class ImageData extends Bookshelf.Model<ImageData> {

    public static RELATIONS = [
        'Image'
    ];

    public static async fetchAllByImageHashAndVersion(hash: string, version: string, withRelated: boolean = true): Promise<Collection<ImageData>> {
        const collection = ImageData.forge<Model<ImageData>>()
            .query(qb => {
                qb.where('image_hash', hash)
                    .andWhere('image_version', version);
            })
            .orderBy('created_at', SearchOrder.DESC);

        return collection.fetchAll(withRelated ? {withRelated: this.RELATIONS} : undefined);
    }

    public static async fetchById(value: number, withRelated: boolean = true): Promise<ImageData> {
        return ImageData.where<ImageData>({ id: value }).fetch(withRelated ? {withRelated: this.RELATIONS} : undefined);
    }

    public static async fetchByImageIdAndVersion(imageId: number, version: string, withRelated: boolean = true): Promise<ImageData> {
        return ImageData.where<ImageData>({ image_id: imageId, image_version: version })
            .fetch(withRelated ? {withRelated: this.RELATIONS} : undefined);
    }

    public get tableName(): string { return 'image_datas'; }
    public get hasTimestamps(): boolean { return true; }

    public get Id(): number { return this.get('id'); }
    public set Id(value: number) { this.set('id', value); }

    public get Protocol(): string { return this.get('protocol'); }
    public set Protocol(value: string) { this.set('protocol', value); }

    public get Encoding(): string { return this.get('encoding'); }
    public set Encoding(value: string) { this.set('encoding', value); }

    public get ImageVersion(): string { return this.get('imageVersion'); }
    public set ImageVersion(value: string) { this.set('imageVersion', value); }

    public get ImageHash(): string { return this.get('imageHash'); }
    public set ImageHash(value: string) { this.set('imageHash', value); }

    public get DataId(): string { return this.get('dataId'); }
    public set DataId(value: string) { this.set('dataId', value); }

    public get Data(): string { return this.get('data'); }
    public set Data(value: string) { this.set('data', value); }

    public get OriginalMime(): string { return this.get('originalMime'); }
    public set OriginalMime(value: string) { this.set('originalMime', value); }

    public get OriginalName(): string { return this.get('originalName'); }
    public set OriginalName(value: string) { this.set('originalName', value); }

    public get UpdatedAt(): Date { return this.get('updatedAt'); }
    public set UpdatedAt(value: Date) { this.set('updatedAt', value); }

    public get CreatedAt(): Date { return this.get('createdAt'); }
    public set CreatedAt(value: Date) { this.set('createdAt', value); }

    public Image(): Image {
        return this.belongsTo(Image, 'image_id', 'id');
    }

}
