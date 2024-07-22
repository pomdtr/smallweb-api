import * as semver from "@std/semver";
import { z } from "zod"; // <- add zod

const kv = await Deno.openKv();
const token = Deno.env.get("GITHUB_TOKEN");
if (!token) {
    throw new Error("GITHUB_TOKEN not set");
}

export const Repository = z.object({
    name: z.string(),
    description: z.string(),
    url: z.string(),
});

export type Repository = z.infer<typeof Repository>;

function fetchGithub(pathname: string, init: RequestInit = {}) {
    const url = new URL(pathname, "https://api.github.com");
    return fetch(url, {
        ...init,
        headers: {
            ...init.headers,
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function refreshSmallwebVersions() {
    const resp = await fetchGithub(
        `/repos/pomdtr/smallweb/releases`,
    );
    if (!resp.ok) {
        throw new Error(`could not fetch releases: ${resp.statusText}`);
    }
    const releases = await resp.json() as {
        tag_name: string;
    }[];
    const versions = releases.map((release) =>
        semver.parse(release.tag_name.slice(1))
    );

    await kv.set(["versions"], versions);
    return versions;
}

async function listReposWithTopic(topic: string) {
    const query = "topic:" + topic;
    const resp = await fetchGithub(
        `/search/repositories?q=${encodeURIComponent(query)}`,
        {
            headers: {
                Accept: "application/vnd.github.v3+json",
            },
        },
    );

    if (!resp.ok) {
        throw new Error("Failed to fetch Smallweb apps" + resp.statusText);
    }

    const { items: repos } = await resp.json() as {
        items: {
            full_name: string;
            description: string;
            html_url: string;
        }[];
    };

    return repos;
}

export async function refreshApps() {
    const repos = await listReposWithTopic("smallweb-app");
    const appBlacklist = new Set([
        "StudentPP1/Image-generating-app",
    ]);

    const apps: Repository[] = repos.filter((repo) =>
        !appBlacklist.has(repo.full_name)
    )
        .map((
            repo,
        ) => ({
            name: repo.full_name,
            description: repo.description,
            url: repo.html_url,
        }));

    apps.push({
        name: "nalgeon/sqlime",
        description: "Online SQLite playground",
        url: "https://github.com/nalgeon/sqlime",
    });

    await kv.set(["apps"], apps);
    return apps;
}

export async function refreshTemplates() {
    const repos = await listReposWithTopic("smallweb-template");
    const blacklist: Set<string> = new Set([]);
    const templates: Repository[] = repos.filter((repo) =>
        !blacklist.has(repo.full_name)
    )
        .map((
            repo,
        ) => ({
            name: repo.full_name,
            description: repo.description,
            url: repo.html_url,
        }));

    await kv.set(["templates"], templates);
    return templates;
}
