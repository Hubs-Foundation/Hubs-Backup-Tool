import { net } from "electron";

export interface ReticulumApiOptions {
  host: string;
  port: string;
  token: string;
}

export enum ReticulumAssetType {
  scene = "scene",
  avatar = "avatar_listing",
  room = "room",
  video = "video",
}

export enum ReticulumAssetMediaType {
  audio = "audio",
  image = "image",
  video = "video",
  model = "model",
}

export interface AttributionsT {
  content?: [];
  creator: string;
}

export interface SceneT {
  account_id: string;
  allow_promotion: boolean;
  allow_remixing: boolean;
  attribution: any | null;
  attributions: AttributionsT;
  description: string | null;
  model_url: string;
  name: string;
  parent_scene_id: string | null;
  project_id: string | null;
  scene_id: string;
  screenshot_url: string;
  type: ReticulumAssetType;
  url: string;
}

export interface ProjectT {
  name: string;
  parent_scene: string | null;
  project_id: string;
  project_url: string;
  scene: string | null;
  thumbnail_url: string;
}

export interface ProjectSceneT {
  name: string;
  parent_scene: SceneT | null;
  project_id: string;
  project_url: string;
  scene: SceneT | null;
  status: string;
  thumbnail_url: string;
}

export interface AvatarListingT {
  allow_remixing: boolean;
  attributions: AttributionsT;
  description: string | null;
  gltfs: {
    avatar: string;
    base: string;
  };
  id: string;
  images: {
    preview: { height: number; url: string; width: number };
  };
  name: string;
  url: string;
}

export interface AvatarT {
  allow_promotion: boolean;
  allow_remixing: boolean;
  attributions: AttributionsT;
  avatar_id: string;
  base_gltf_url: string;
  description: string | null;
  files: {
    base_map: string | null;
    bin: string;
    emissive_map: string | null;
    gltf: string;
    normal_map: string | null;
    orm_map: string | null;
    thumbnail: string;
  };
  gltf_url: string;
  name: string;
  parent_avatar_listing_id: string | null;
  type: ReticulumAssetType;
}

export interface MetaT {
  source: string;
  next_cursor: number;
}

export interface HubT {
  description: string | null;
  id: string;
  images: {
    preview: {
      url: string;
    };
  };
  lobby_count: number;
  member_count: number;
  name: string;
  room_size: number;
  scene_id: string | null;
  type: ReticulumAssetType;
  url: string;
  user_data: object | null;
}

export interface AssetT {
  attributions: AttributionsT;
  id: string;
  images: {
    preview: {
      url: string;
    };
  };
  name: string;
  type: ReticulumAssetMediaType;
  url: string;
}

interface MediaWithCursorT {
  accountId?: string;
  type: string;
  filter?: string;
  cursor?: number;
  probe?: boolean;
}

export class ReticulumApi {
  options: ReticulumApiOptions;

  constructor(options: ReticulumApiOptions) {
    this.options = options;
  }

  getUrl(path: string): string {
    return `https://${this.options.host}${
      this.options.port ? ":" + this.options.port : ""
    }/api/v1/${path}`;
  }

  getRoomObjectsUrl(hubId: string) {
    return `https://${this.options.host}${
      this.options.port ? ":" + this.options.port : ""
    }/${hubId}/objects.gltf`;
  }

  api(path: string, method = "GET", payload?: JSON): Promise<any> {
    const params = {
      headers: {
        "content-type": "application/json",
        authorization: `bearer ${this.options.token}`,
      },
      method,
      agent: {
        rejectUnauthorized: false,
      },
    } as RequestInit;
    if (payload) {
      params.body = JSON.stringify(payload);
    }
    return net.fetch(this.getUrl(path), params).then(async (r) => {
      const result = await r.text();
      try {
        return JSON.parse(result);
      } catch (e) {
        // Some reticulum responses, particularly DELETE requests, don't return json.
        return result;
      }
    });
  }

  async getMedia<T>({
    accountId,
    type,
    filter = "",
    cursor = 0,
    probe = false,
  }: MediaWithCursorT): Promise<T[]> {
    const res = await this.api(
      `media/search?source=${type}` +
        `${accountId ? "&user=" + accountId : ""}` +
        `${cursor ? "&cursor=" + cursor : ""}` +
        `${filter ? "&filter=" + filter : ""}`
    );
    const entries = res["entries"] as T[];
    const meta = res["meta"] as MetaT;
    if (meta?.next_cursor && !probe) {
      return [
        ...entries,
        ...(await this.getMedia({
          accountId,
          type,
          filter,
          cursor: meta.next_cursor,
        })),
      ] as T[];
    } else {
      return entries as T[];
    }
  }

  async getAvatar(avatarId: string): Promise<AvatarT> {
    const res = await this.api(`avatars/${avatarId}`);
    const avatar = res["avatars"][0];
    return avatar as AvatarT;
  }

  async getGLBScenes(): Promise<SceneT[]> {
    const res = await this.api("scenes/projectless");
    return res["scenes"] as SceneT[];
  }

  async getProjects(): Promise<ProjectT[]> {
    const res = await this.api("projects");
    return res["projects"] as ProjectT[];
  }

  async getProjectScene(scene_id: string): Promise<ProjectSceneT> {
    const res = await this.api(`projects/${scene_id}`);
    return res as ProjectSceneT;
  }

  async getSceneInfo(sceneId: string): Promise<SceneT[]> {
    const res = await this.api(`scenes/${sceneId}`);
    return res["scenes"] as SceneT[];
  }
}
