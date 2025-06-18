import { env } from './env';

export const dbConfig = {
    uri: env.MONGO_URI,
};
