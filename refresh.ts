#!/usr/bin/env -S deno run --allow-all --unstable-kv --location https://api.smallweb.run/ --env
import {
    refreshApps,
    refreshSmallwebVersions,
    refreshTemplates,
} from "./github.ts";

const apps = await refreshApps();
const templates = await refreshTemplates();
const versions = await refreshSmallwebVersions();

console.log(
    `Found ${apps.length} apps, ${templates.length} templates and ${versions.length} versions!`,
);
