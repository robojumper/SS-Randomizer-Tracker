import { load } from 'js-yaml';
import { RawLogic } from '../logic/UpstreamTypes';
import { MultiChoiceOption, OptionDefs } from '../permalink/SettingsTypes';

export type RemoteReference =
    | {
          type: 'latestRelease';
      }
    | {
          type: 'releaseVersion';
          versionTag: string;
      }
    | {
          type: 'forkBranch';
          author: string;
          repoName: string | undefined;
          branch: string;
      };

async function fetchLatestGithubRelease() {
    const releaseData = await fetch(
        'https://api.github.com/repos/ssrando/ssrando/releases',
    );
    const release = (await releaseData.json()) as { tag_name: string }[];
    return release[0].tag_name;
}

async function resolveRemote(ref: RemoteReference): Promise<[url: string, name: string]> {
    switch (ref.type) {
        case 'latestRelease':
            try {
                const latest = await fetchLatestGithubRelease();
                return [`https://raw.githubusercontent.com/ssrando/ssrando/${latest}`, latest];
            } catch (e) {
                throw new Error(
                    'Could not retrieve latest release from GitHub: ' +
                        (e
                            ? typeof e === 'object' && 'message' in e
                                ? (e.message as string)
                                : JSON.stringify(e)
                            : 'Unknown error'),
                );
            }
        case 'releaseVersion':
            return [`https://raw.githubusercontent.com/ssrando/ssrando/${ref.versionTag}`, formatRemote(ref)];
        case 'forkBranch':
            return [
                `https://raw.githubusercontent.com/${ref.author}/${
                    ref.repoName ?? 'ssrando'
                }/${ref.branch}`,
                formatRemote(ref),
            ];
    }
}

export function formatRemote(ref: RemoteReference) {
    switch (ref.type) {
        case 'latestRelease':
            return 'Latest';
        case 'releaseVersion':
            return ref.versionTag;
        case 'forkBranch':
            if (ref.repoName) {
                return `https://github.com/${ref.author}/${ref.repoName}/tree/${ref.branch}`;
            } else {
                return `${ref.author}/${ref.branch}`;
            }
            
    }
}

const prBranchPattern = /^https:\/\/github.com\/([^/]+)\/ssrando\/tree\/([^/]+)$/;
const extendedPrBranchPattern = /^https:\/\/github.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/;
const branchPattern = /^([^/]+)(?:[/|:])([^/]+)$/;
const versionPattern = /^v[0-9]+\.[0-9]+\.[0-9]+$/;

export function parseRemote(remote: string): RemoteReference | undefined {
    if (remote === 'Latest') {
        return { type: 'latestRelease' };
    }
    if (remote.match(versionPattern)) {
        return { type: 'releaseVersion', versionTag: remote };
    }

    const prBranchMatch =
        remote.match(prBranchPattern) ?? remote.match(branchPattern);
    if (prBranchMatch) {
        return {
            type: 'forkBranch',
            author: prBranchMatch[1],
            branch: prBranchMatch[2],
            repoName: undefined,
        };
    }

    const extendedPrBranchMatch = remote.match(extendedPrBranchPattern);
    if (extendedPrBranchMatch) {
        return {
            type: 'forkBranch',
            author: extendedPrBranchMatch[1],
            branch: extendedPrBranchMatch[3],
            repoName: extendedPrBranchMatch[2],
        };
    }
}

const baseFileUrl = (remoteUrl: string, file: string) =>
    `${remoteUrl}/${file}.yaml`;

const loadFileFromUrl = async (url: string) => {
    const response = await fetch(url);
    if (response.status === 200) {
        return response.text();
    } else {
        throw new Error(`failed to fetch ${url}`);
    }
};

const loadFile = async <T>(baseUrl: string, file: string) => {
    const fileUrl = baseFileUrl(baseUrl, file);
    const data = await loadFileFromUrl(fileUrl);
    return load(data) as T;
};

export async function loadRemoteLogic(
    remote: RemoteReference,
): Promise<[RawLogic, OptionDefs, string]> {
    const [baseUrl, remoteName] = await resolveRemote(remote);

    const [logic, options] = await Promise.all([
        loadFile<RawLogic>(baseUrl, 'dump'),
        loadFile<OptionDefs>(baseUrl, 'options'),
    ]);

    // We need to patch the "excluded locations" option with the actual checks from logic.
    const excludedLocsIndex = options.findIndex(
        (x) => x.command === 'excluded-locations' && x.type === 'multichoice',
    );

    const choices = Object.values(logic.checks).map((c) => c.short_name);

    const patchedOptions = options.slice();
    patchedOptions[excludedLocsIndex] = {
        ...(options[excludedLocsIndex] as MultiChoiceOption),
        choices,
    };

    return [
        logic,
        patchedOptions,
        remoteName,
    ];
}
