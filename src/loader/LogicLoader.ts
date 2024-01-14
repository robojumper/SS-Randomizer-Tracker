import { load } from 'js-yaml';
import { RawLogic } from '../logic/UpstreamTypes';
import { OptionDefs } from '../permalink/SettingsTypes';

export type RemoteReference =
    | {
          type: 'releaseVersion';
          versionTag: string;
      }
    | {
          type: 'forkBranch';
          author: string;
          branch: string;
      };

export const defaultUpstream: RemoteReference = {
    type: 'forkBranch',
    author: 'robojumper',
    branch: 'logic-dump',
};

function resolveRemote(ref: RemoteReference) {
    switch (ref.type) {
        case 'releaseVersion':
            return `https://raw.githubusercontent.com/ssrando/ssrando/${ref.versionTag}`;
        case 'forkBranch':
            return `https://raw.githubusercontent.com/${ref.author}/ssrando/${ref.branch}`;
    }
}

export function formatRemote(ref: RemoteReference) {
    switch (ref.type) {
        case 'releaseVersion':
            return ref.versionTag;
        case 'forkBranch':
            return `${ref.author}/${ref.branch}`;
    }
}

const prBranchPattern = /^https:\/\/github.com\/(.*)\/ssrando\/tree\/(.*)$/;
const branchPattern = /^(.*)\/(.*)$/;
const versionPattern = /^v[0-9]+\.[0-9]+\.[0-9]+$/;

export function parseRemote(remote: string): RemoteReference | undefined {
    if (remote.match(versionPattern)) {
        return { type: 'releaseVersion', versionTag: remote };
    }

    const prBranchMatch = remote.match(prBranchPattern) ?? remote.match(branchPattern);
    if (prBranchMatch) {
        return { type: 'forkBranch', author: prBranchMatch[1], branch: prBranchMatch[2] };
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

export async function loadRemoteLogic(remote: RemoteReference): Promise<[RawLogic, OptionDefs]> {
    const baseUrl = resolveRemote(remote);

    const [logic, options] = await Promise.all([
        loadFile<RawLogic>(baseUrl, 'dump'),
        loadFile<OptionDefs>(baseUrl, 'options'),
    ]);

    return [logic, options];
}
