import newman from "newman";
import log from "../common/utils/logger";
import config from "../configHandler";

const collection = `https://api.getpostman.com/collections/14947205-3415f85f-0563-4c91-8694-c1e94e73efb0?apikey=${config.postmanApiKey}`;

const environmentUuid =
  process.env.NODE_ENV === "production"
    ? "14947205-2a99e3cd-522c-4cbc-8fc7-506201f7d0bd"
    : "14947205-02c5ca02-9f24-40a3-ae9f-1dacd056ce16";
const environment = `https://api.getpostman.com/environments/${environmentUuid}?apikey=${config.postmanApiKey}`;

log.info("Starting newman collection run");
newman.run(
  {
    collection: collection,
    environment: environment,
    reporters: "cli",
  },
  function (err) {
    if (err) {
      throw err;
    }
    log.info("Collection run complete!");
  }
);
