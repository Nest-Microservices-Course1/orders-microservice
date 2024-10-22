import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  /*   DATABASE_URL: string;
   */
  PRODUCTS_MICROSERVICE_HOST: string;
  PRODUCTS_MICROSERVICE_PORT: number;
}

const envSchema = joi
  .object({
    PORT: joi.number().required(),
    /*     DATABASE_URL: joi.string().required(),
     */
    PRODUCTS_MICROSERVICE_HOST: joi.string().required(),
    PRODUCTS_MICROSERVICE_PORT: joi.number().required(),
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  /*   databaseUrl: envVars.DATABASE_URL,
   */
  hostProductMs: envVars.PRODUCTS_MICROSERVICE_HOST,
  portProductMs: envVars.PRODUCTS_MICROSERVICE_PORT,
};
