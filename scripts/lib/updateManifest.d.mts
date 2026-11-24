export declare const RELEASES_REPO: string;
export declare const UPDATE_ARCHIVE: string;
export declare function releaseAssetUrl(version: string, asset?: string, repo?: string): string;
export interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { signature: string; url: string }>;
}
export declare function buildUpdateManifest(input: { version: string; signature: string; notes?: string; date?: Date }): UpdateManifest;
