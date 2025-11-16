import {config} from "dotenv";
import {join, resolve} from "path";

config({path: resolve(import.meta.dir, '../../../../.env')});

const ROOT_PATH = process.env.ROOT_PATH || './'
export const ENV = {
    HOST: process.env.HOST || 'localhost',
    PORT: parseInt(process.env.SERVER_PORT || '3000'),
    PEM_KEY: join(ROOT_PATH, 'key.pem'),
    PEM_CERT: join(ROOT_PATH, 'cert.pem'),
    SAMPLE_TABLE: process.env.SAMPLE_TABLE || 'sensor_samples',
    DATABASE_PATH: (process.env.DB_PATH && process.env.DB_FILE) ?
        join(process.env.DB_PATH, process.env.DB_FILE) : 'plant.db',
    MAX_SSE_CLIENTS: parseInt(process.env.MAX_SSE_CLIENTS || "60", 10),
    FRONTEND_PATH: join(ROOT_PATH, 'packages/frontend/dist')
}
console.log(ROOT_PATH);
console.log(ENV.FRONTEND_PATH);
console.log(ENV.PEM_KEY);
console.log(ENV.PEM_CERT);
export default ENV;