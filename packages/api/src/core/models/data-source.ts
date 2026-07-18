import { DataSource } from 'typeorm';
import { config } from '@/shared/config';

export const createDataSource = (entities: Function[]): DataSource => {
    return new DataSource({
        type: 'better-sqlite3',
        database: config.databasePath,
        synchronize: true,
        entities
    });
};
