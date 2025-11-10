import {config} from "dotenv";
import {join, resolve} from "path";

config({path: resolve(import.meta.dir, '../../../../.env')});
//console.log(join(process.env.PROJECT_ROOT as string, process.env.CERT_PEM as string))
export const ENV = {
    HOST: process.env.HOST || 'localhost',
    PORT: parseInt(process.env.SERVER_PORT || '3000'),
    PEM_KEY: join(__dirname, '../../../../key.pem'),
    PEM_CERT: join(__dirname, '../../../../cert.pem'),
    SAMPLE_TABLE: process.env.SAMPLE_TABLE || 'sensor_samples',
    DATABASE_PATH: (process.env.DB_PATH && process.env.DB_FILE) ?
        join(process.env.DB_PATH, process.env.DB_FILE) : 'plant.db',
    MAX_SSE_CLIENTS: parseInt(process.env.MAX_SSE_CLIENTS || "60", 10),

}

export default ENV;