import {
  existsSync,
  mkdirSync,
  readFileSync,
  createWriteStream,
  writeFileSync,
  rmSync,
  copyFileSync,
} from "fs";
import fetch from "node-fetch";
import {
  AssetT,
  AvatarListingT,
  HubT,
  ReticulumApi,
  SceneT,
} from "./reticulum-api";
import path from "path";
import {
  IAuthCredentials,
  IBackupParams,
  IBackupTypes,
  ISupportedEndpointsParams,
} from "../common/types";
import { BrowserWindow } from "electron";
import log from "electron-log/main";

async function downloadFile({
  url,
  outPath,
  override = false,
}: {
  url: string;
  outPath: string;
  override: boolean;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const destination = path.resolve(outPath);

    let download = true;
    if (override) {
      if (existsSync(destination)) {
        rmSync(destination, {
          recursive: true,
          force: true,
        });
      }
    } else if (existsSync(destination)) {
      log.info(`${destination} already downloaded, skipping`);
      download = false;
    }

    if (download) {
      fetch(url)
        .then((res) => {
          const fileStream = createWriteStream(destination, { flags: "wx" });
          log.log(`Downloading ${url} => ${outPath}... `);
          res.body.pipe(fileStream);
          res.body.on("error", (e) => {
            log.error("Error");
            reject(e);
          });
          fileStream.on("finish", () => {
            log.log("Success");
            resolve();
          });
        })
        .catch((e) => {
          reject(e);
        });
    } else {
      resolve();
    }
  });
}

function createDir(dir: string) {
  if (!existsSync(dir)) {
    if (!mkdirSync(dir, { recursive: true })) {
      throw `Error creating directory: ${dir}`;
    }
  }
  return dir;
}

function getOutputPath(
  directory: string,
  credentials: IAuthCredentials
): string {
  return path.join(directory, credentials.host, credentials.email);
}

export function getLogPath(
  directory: string,
  credentials: IAuthCredentials
): string {
  return path.join(getOutputPath(directory, credentials), "backup.log");
}

async function backupBlenderProjects(
  api: ReticulumApi,
  directory: string,
  override: boolean
): Promise<boolean> {
  const mainWindow = BrowserWindow.getFocusedWindow();
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Blender,
    pct: 0,
  });

  try {
    const projectlessOutputDir = createDir(path.join(directory, "blender"));
    const scenes = await api.getGLBScenes();
    const sceneNum = scenes.length;
    let count = 0;
    let result = true;
    for (const scene of scenes) {
      if (cancel) {
        break;
      }

      try {
        const sceneDir = path.join(projectlessOutputDir, scene.scene_id);
        createDir(sceneDir);

        writeFileSync(
          path.join(sceneDir, `${scene.scene_id}.json`),
          JSON.stringify(scene, null, 2),
          {
            encoding: "utf-8",
          }
        );
        const url = new URL(scene.model_url);
        const fileName = url.pathname.split("/").pop();
        if (fileName) {
          await downloadFile({
            url: scene.model_url,
            outPath: path.join(sceneDir, fileName),
            override,
          });
        }
        if (scene.screenshot_url) {
          const url = new URL(scene.screenshot_url);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: scene.screenshot_url,
              outPath: path.join(sceneDir, fileName),
              override,
            });
          }
        }
      } catch (e) {
        log.error(e);
        result = false;
      }

      count++;
      mainWindow.webContents.send("backup-progress-update", {
        type: IBackupTypes.Blender,
        pct: (count / sceneNum) * 100,
      });
    }
    return result;
  } catch (e) {
    log.error(e);
    return false;
  }
}

async function processSpokeScene(
  sceneUrl: string,
  projectDir: string,
  override: boolean
) {
  const url = new URL(sceneUrl);
  const fileName = url.pathname.split("/").pop();
  if (fileName) {
    await downloadFile({
      url: sceneUrl,
      outPath: path.join(projectDir, fileName),
      override,
    });
    try {
      const fileText = readFileSync(path.join(projectDir, fileName), {
        encoding: "utf-8",
      }) as never;
      const parsed = JSON.parse(fileText);
      if ("entities" in parsed) {
        for (const entity in parsed["entities"]) {
          const thisEntity = parsed["entities"][entity];
          if ("components" in thisEntity) {
            for (const component of thisEntity["components"]) {
              if ("src" in component["props"]) {
                const src = component["props"]["src"];
                const assetUrl = new URL(src);
                const assetFileName = assetUrl.pathname.split("/").pop();
                await downloadFile({
                  url: component["props"]["src"],
                  outPath: path.join(projectDir, assetFileName),
                  override,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      log.error(e);
    }
  }
}

async function backupScene(
  api: ReticulumApi,
  scene: SceneT,
  projectDir: string,
  override: boolean
) {
  const spokeFilePath = path.join(projectDir, `${scene.scene_id}.json`);
  writeFileSync(spokeFilePath, JSON.stringify(scene, null, 2), {
    encoding: "utf-8",
  });

  if (scene.scene_project_url) {
    await processSpokeScene(scene.scene_project_url, projectDir, override);
  }

  const url = new URL(scene.model_url);
  const fileName = url.pathname.split("/").pop();
  if (fileName) {
    await downloadFile({
      url: scene.model_url,
      outPath: path.join(projectDir, fileName),
      override,
    });
    const dotIdx = fileName.lastIndexOf(".");
    const fileNameWithoutExt = fileName.substring(0, dotIdx);
    copyFileSync(
      path.join(projectDir, fileName),
      path.join(projectDir, `${fileNameWithoutExt}.glb`)
    );
  }
  if (scene.screenshot_url) {
    const url = new URL(scene.screenshot_url);
    const fileName = url.pathname.split("/").pop();
    if (fileName) {
      await downloadFile({
        url: scene.screenshot_url,
        outPath: path.join(projectDir, fileName),
        override,
      });
    }
  }
}

async function backupSpokeProjects(
  api: ReticulumApi,
  directory: string,
  override: boolean
): Promise<boolean> {
  const mainWindow = BrowserWindow.getFocusedWindow();
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Scenes,
    pct: 0,
  });

  try {
    const projectsOutputDir = createDir(path.join(directory, "spoke"));
    const projects = await api.getProjects();
    const projectsNum = projects.length;
    let count = 0;
    let result = true;
    for (const project of projects) {
      if (cancel) {
        break;
      }

      try {
        const projectScene = await api.getProjectScene(project.project_id);
        const projectDir = path.join(projectsOutputDir, project.project_id);
        createDir(projectDir);

        writeFileSync(
          path.join(projectDir, `${project.project_id}.json`),
          JSON.stringify(project, null, 2),

          { encoding: "utf-8" }
        );
        if (project.project_url) {
          const url = new URL(project.project_url);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: project.project_url,
              outPath: path.join(projectDir, fileName),
              override,
            });
            copyFileSync(
              path.join(projectDir, fileName),
              path.join(projectDir, `${project.name}.spoke`)
            );
            await processSpokeScene(project.project_url, projectDir, override);
          }
        }
        if (project.thumbnail_url) {
          const url = new URL(project.thumbnail_url);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: project.thumbnail_url,
              outPath: path.join(projectDir, fileName),
              override,
            });
          }
        }
        if (projectScene.scene) {
          backupScene(api, projectScene.scene, projectDir, override);
        } else if (projectScene.parent_scene) {
          backupScene(api, projectScene.parent_scene, projectDir, override);
        } else {
          log.warn(`Project ${project.project_id} doesn't have a scene`);
        }
      } catch (e) {
        log.error(e);
        result = false;
      }

      count++;
      mainWindow.webContents.send("backup-progress-update", {
        type: IBackupTypes.Scenes,
        pct: (count / projectsNum) * 100,
      });
    }

    return result;
  } catch (e) {
    log.error(e);
    return false;
  }
}

function processAvatarGLTF(filePath: string) {
  try {
    const gltfText = readFileSync(filePath, {
      encoding: "utf-8",
    }) as never;
    const gltf = JSON.parse(gltfText);
    if ("images" in gltf) {
      for (const image of gltf["images"]) {
        if ("uri" in image) {
          const imageUrl = new URL(image["uri"]);
          const imageName = imageUrl.pathname.split("/").pop();
          image.uri = imageName;
        }
      }
    }
    if ("buffers" in gltf) {
      for (const buffer of gltf["buffers"]) {
        if ("uri" in buffer) {
          const bufferUrl = new URL(buffer["uri"]);
          const bufferName = bufferUrl.pathname.split("/").pop();
          buffer.uri = bufferName;
        }
      }
    }
    writeFileSync(filePath, JSON.stringify(gltf, null, 2), {
      encoding: "utf-8",
    });
  } catch (e) {
    log.error(e);
  }
}

async function processObjectsGLTF(
  dir: string,
  filePath: string,
  override: boolean
) {
  try {
    const gltfText = readFileSync(filePath, {
      encoding: "utf-8",
    }) as never;
    const gltf = JSON.parse(gltfText);
    if ("nodes" in gltf) {
      for (const node of gltf["nodes"]) {
        if ("extensions" in node) {
          for (const ext in node["extensions"]) {
            if ("HUBS_components" === ext) {
              const components = node["extensions"]["HUBS_components"];
              if ("media" in components) {
                const media = components["media"];
                try {
                  const mediaUrl = new URL(media["src"]);
                  const mediaName = mediaUrl.pathname.split("/").pop();
                  if (mediaName) {
                    await downloadFile({
                      url: media["src"],
                      outPath: path.join(dir, mediaName),
                      override,
                    });
                    // media.src = mediaName;
                  } else {
                    log.error(
                      `Media ${media["src"]} is not a valid downloadable media, skipping`
                    );
                  }
                } catch (e) {
                  log.error(
                    `Media ${media["src"]} is not a valid URL, skipping`
                  );
                }
              }
            }
          }
        }
      }
    }
    writeFileSync(filePath, JSON.stringify(gltf, null, 2), {
      encoding: "utf-8",
    });
  } catch (e) {
    log.error(e);
  }
}

async function backupAvatars(
  api: ReticulumApi,
  directory: string,
  credentials: IAuthCredentials,
  override: boolean
): Promise<boolean> {
  const mainWindow = BrowserWindow.getFocusedWindow();
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Avatars,
    pct: 0,
  });
  try {
    const avatarsOutputDir = createDir(path.join(directory, "avatars"));
    const avatarListings = await api.getMedia<AvatarListingT>({
      accountId: credentials.accountId,
      type: "avatars",
    });
    const avatarsNum = avatarListings.length;
    let count = 0;
    let result = true;
    for (const avatarListing of avatarListings) {
      if (cancel) {
        break;
      }

      const avatarDir = path.join(avatarsOutputDir, avatarListing.id);
      createDir(avatarDir);

      try {
        const avatar = await api.getAvatar(avatarListing.id);
        writeFileSync(
          path.join(avatarDir, `${avatar.avatar_id}.json`),
          JSON.stringify(avatar, null, 2),
          { encoding: "utf-8" }
        );
        if (avatar.files.base_map) {
          const url = new URL(avatar.files.base_map);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.files.base_map,
              outPath: path.join(avatarDir, fileName),
              override,
            });
          }
        }
        if (avatar.files.emissive_map) {
          const url = new URL(avatar.files.emissive_map);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.files.emissive_map,
              outPath: path.join(avatarDir, fileName),
              override,
            });
          }
        }
        if (avatar.files.normal_map) {
          const url = new URL(avatar.files.normal_map);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.files.normal_map,
              outPath: path.join(avatarDir, fileName),
              override,
            });
          }
        }
        if (avatar.files.orm_map) {
          const url = new URL(avatar.files.orm_map);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.files.orm_map,
              outPath: path.join(avatarDir, fileName),
              override,
            });
          }
        }
        if (avatar.files.bin) {
          const url = new URL(avatar.files.bin);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.files.bin,
              outPath: path.join(avatarDir, fileName),
              override,
            });
          }
        }
        if (avatar.files.gltf) {
          const url = new URL(avatar.files.gltf);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.files.gltf,
              outPath: path.join(avatarDir, fileName),
              override,
            });
          }
        }
        if (avatar.files.thumbnail) {
          const url = new URL(avatar.files.thumbnail);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.files.thumbnail,
              outPath: path.join(avatarDir, fileName),
              override,
            });
          }
        }
        if (avatar.gltf_url) {
          const url = new URL(avatar.gltf_url);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.gltf_url,
              outPath: path.join(avatarDir, fileName),
              override,
            });
            processAvatarGLTF(path.join(avatarDir, fileName));
          }
        }
        if (avatar.base_gltf_url) {
          const url = new URL(avatar.base_gltf_url);
          const fileName = url.pathname.split("/").pop();
          if (fileName) {
            await downloadFile({
              url: avatar.base_gltf_url,
              outPath: path.join(avatarDir, fileName),
              override,
            });
            processAvatarGLTF(path.join(avatarDir, fileName));
          }
        }
      } catch (e) {
        log.error(e);
        result = false;
      }

      count++;
      mainWindow.webContents.send("backup-progress-update", {
        type: IBackupTypes.Avatars,
        pct: (count / avatarsNum) * 100,
      });
    }

    return result;
  } catch (e) {
    log.error(e);
    return false;
  }
}

async function backupRooms(
  api: ReticulumApi,
  directory: string,
  credentials: IAuthCredentials,
  override: boolean
): Promise<boolean> {
  const mainWindow = BrowserWindow.getFocusedWindow();
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Rooms,
    pct: 0,
  });

  try {
    const roomsOutputDir = createDir(path.join(directory, "rooms"));
    const rooms = await api.getMedia<HubT>({
      accountId: credentials.accountId,
      type: "rooms",
      filter: "created",
    });
    const roomsNum = rooms.length;
    let count = 0;
    let result = true;
    for (const hub of rooms) {
      if (cancel) {
        break;
      }

      try {
        const hubDir = path.join(roomsOutputDir, hub.id);
        createDir(hubDir);

        writeFileSync(
          path.join(hubDir, `${hub.id}.json`),
          JSON.stringify(hub, null, 2),
          {
            encoding: "utf-8",
          }
        );

        const url = new URL(api.getRoomObjectsUrl(hub.id));
        const fileName = url.pathname.split("/").pop();
        if (fileName) {
          const objectsGLTFPath = path.join(hubDir, fileName);
          await downloadFile({
            url: url.toString(),
            outPath: objectsGLTFPath,
            override,
          });
          await processObjectsGLTF(hubDir, objectsGLTFPath, override);
        }
      } catch (e) {
        log.error(e);
        result = false;
      }

      count++;
      mainWindow.webContents.send("backup-progress-update", {
        type: IBackupTypes.Rooms,
        pct: (count / roomsNum) * 100,
      });
    }

    return result;
  } catch (e) {
    log.error(e);
    return false;
  }
}

async function backupMedia(
  api: ReticulumApi,
  directory: string,
  credentials: IAuthCredentials,
  override: boolean
): Promise<boolean> {
  const mainWindow = BrowserWindow.getFocusedWindow();
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Media,
    pct: 0,
  });

  try {
    const assetsOutputDir = createDir(path.join(directory, "media"));
    const assets = await api.getMedia<AssetT>({
      accountId: credentials.accountId,
      type: "assets",
    });
    writeFileSync(
      path.join(assetsOutputDir, `assets.json`),
      JSON.stringify(assets, null, 2),

      { encoding: "utf-8" }
    );
    const assetsNum = assets.length;
    let count = 0;
    let result = true;
    for (const asset of assets) {
      if (cancel) {
        break;
      }

      try {
        const url = new URL(asset.url);
        const fileName = url.pathname.split("/").pop();

        if (fileName) {
          await downloadFile({
            url: asset.url,
            outPath: path.join(assetsOutputDir, fileName),
            override,
          });
        }
      } catch (e) {
        log.error(`Media ${asset.url} is not a valid URL, skipping`);
        result = false;
      }

      count++;
      mainWindow.webContents.send("backup-progress-update", {
        type: IBackupTypes.Media,
        pct: (count / assetsNum) * 100,
      });
    }

    return result;
  } catch (e) {
    log.error(e);
    return false;
  }
}

let cancel = false;
export async function startBackup(
  _event: Electron.IpcMainInvokeEvent,
  options: IBackupParams
): Promise<boolean> {
  cancel = false;

  const { directory, types, credentials, override } = options;

  log.initialize();
  log.transports.file.level = "info";
  log.transports.file.resolvePathFn = () =>
    getLogPath(options.directory, credentials);
  const file = log.transports.file.getFile();
  file.clear();

  const outputPath = getOutputPath(directory, credentials);
  if (!existsSync(outputPath)) {
    if (!mkdirSync(outputPath, { recursive: true })) {
      log.error(`Error creating the output folder ${outputPath}`);
      return false;
    }
  }

  const api = new ReticulumApi({
    host: credentials.host,
    port: credentials.port,
    token: credentials.token,
  });

  const mainWindow = BrowserWindow.getFocusedWindow();
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Blender,
    pct: 0,
  });
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Scenes,
    pct: 0,
  });
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Avatars,
    pct: 0,
  });
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Rooms,
    pct: 0,
  });
  mainWindow.webContents.send("backup-progress-update", {
    type: IBackupTypes.Media,
    pct: 0,
  });

  try {
    const results = await Promise.all([
      ((types & IBackupTypes.Scenes) != 0 &&
        backupSpokeProjects(api, outputPath, override)) ||
        true,
      ((types & IBackupTypes.Blender) != 0 &&
        backupBlenderProjects(api, outputPath, override)) ||
        true,
      ((types & IBackupTypes.Avatars) != 0 &&
        backupAvatars(api, outputPath, credentials, override)) ||
        true,
      ((types & IBackupTypes.Rooms) != 0 &&
        backupRooms(api, outputPath, credentials, override)) ||
        true,
      ((types & IBackupTypes.Media) != 0 &&
        backupMedia(api, outputPath, credentials, override)) ||
        true,
    ]);

    log.info("Backup finished");

    const result = results.reduce((prev: boolean, current: boolean) => {
      return prev && current;
    });

    if (cancel) {
      return false;
    } else if (result) {
      return result;
    }
  } catch (e: unknown) {
    return false;
  }
}

export async function cancelBackup(
  _event: Electron.IpcMainInvokeEvent
): Promise<void> {
  cancel = true;
}

export async function getSupportedEndpoints(
  _event: Electron.IpcMainInvokeEvent,
  params: ISupportedEndpointsParams
): Promise<number> {
  const { credentials } = params;
  const api = new ReticulumApi({
    host: credentials.host,
    port: credentials.port,
    token: credentials.token,
  });

  let result = 0;
  try {
    const spoke = await api.getProjects();
    spoke && (result |= IBackupTypes.Scenes);
  } catch (e) {
    console.error(e);
  }
  try {
    const blender = await api.getGLBScenes();
    blender && (result |= IBackupTypes.Blender);
  } catch (e) {
    console.error(e);
  }
  try {
    const rooms = await api.getMedia<HubT>({
      accountId: credentials.accountId,
      type: "rooms",
      filter: "created",
      probe: true,
    });
    rooms && (result |= IBackupTypes.Rooms);
  } catch (e) {
    console.error(e);
  }
  try {
    const media = await api.getMedia<AssetT>({
      accountId: credentials.accountId,
      type: "assets",
      probe: true,
    });
    media && (result |= IBackupTypes.Media);
  } catch (e) {
    console.error(e);
  }
  try {
    const avatars = await api.getMedia<AvatarListingT>({
      accountId: credentials.accountId,
      type: "avatars",
      probe: true,
    });
    avatars && (result |= IBackupTypes.Avatars);
  } catch (e) {
    console.error(e);
  }

  return result;
}
