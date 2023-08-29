import loglevel from "loglevel";
import env from "./env";

const logger = loglevel;
logger.setLevel(env.LOG_LEVEL);

export default logger;
