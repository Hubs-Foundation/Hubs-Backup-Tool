import {
  Button,
  Grid,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Tooltip,
  IconButton,
  LinearProgress,
  CircularProgress
} from "@mui/material";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../components/AuthProvider";
import { useStorage } from "../hooks/useStorage";
import HelpIcon from "@mui/icons-material/Help";
import FolderIcon from "@mui/icons-material/Folder";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import { IBackupProgressUpdateT, IBackupTypes } from "../../common/types";
import { useBackup } from "../hooks/useBackup";

type TypeNameKey = "avatars" | "blender" | "scenes" | "rooms" | "media";

const NameToType = {
  "avatars": IBackupTypes.Avatars,
  "blender": IBackupTypes.Blender,
  "scenes": IBackupTypes.Scenes,
  "rooms": IBackupTypes.Rooms,
  "media": IBackupTypes.Media
}

const Tooltips = {
  [IBackupTypes.Avatars]: "Downloads all avatars uploaded to this account",
  [IBackupTypes.Blender]:
    'Downloads 3D models of all scenes uploaded using the "Import from Blender" method on Spoke',
  [IBackupTypes.Scenes]: "Downloads all Spoke Scenes uploaded to this account, including .spoke legacy files",
  [IBackupTypes.Rooms]: "Downloads all pinned media from rooms created by this account",
  [IBackupTypes.Media]: 'Downloads all media uploaded through Spoke located in the "My Assets" tab',
};

export default function Backup(): JSX.Element {
  const { credentials } = useContext(AuthContext);
  const { directory, updateDirectory, backupSettings, updateBackupSettings } = useStorage();
  const [avatarsProgress, setAvatarsProgress] = useState(0);
  const [scenesProgress, setScenesProgress] = useState(0);
  const [blenderProgress, setBlenderProgress] = useState(0);
  const [roomsProgress, setRoomsProgress] = useState(0);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [override, setOverride] = useState(backupSettings.override);
  const [supportedTypesUpdated, setSupportedTypesUpdate] = useState(false);
  const [types, setTypes] = useState(backupSettings.types);


  const onBackupProgress = useCallback(
    (props: IBackupProgressUpdateT) => {
      const { type, pct } = props;
      if ((type & IBackupTypes.Avatars) != 0) {
        setAvatarsProgress(pct);
      }
      if ((type & IBackupTypes.Scenes) != 0) {
        setScenesProgress(pct);
      }
      if ((type & IBackupTypes.Blender) != 0) {
        setBlenderProgress(pct);
      }
      if ((type & IBackupTypes.Rooms) != 0) {
        setRoomsProgress(pct);
      }
      if ((type & IBackupTypes.Media) != 0) {
        setMediaProgress(pct);
      }
    },
    [
      setAvatarsProgress,
      setScenesProgress,
      setBlenderProgress,
      setRoomsProgress,
      setMediaProgress,
    ]
  );
  const [log, running, result, cancelled, startBackup, cancelBackup] =
    useBackup(onBackupProgress);

  const onSelectDirectory = useCallback(async () => {
    const dirPath = await window.electronAPI.selectDirectory();
    if (dirPath) {
      updateDirectory(dirPath);
    }
  }, [updateDirectory]);

  const handleTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const type = NameToType[event.target.name as TypeNameKey]
      setTypes((types) => {
        if (event.target.checked) {
          const newValue = types | type;
          updateBackupSettings({ types: newValue, supportedTypes: backupSettings.supportedTypes, override });
          return newValue;
        } else {
          const newValue = types & ~type;
          updateBackupSettings({ types: newValue, supportedTypes: backupSettings.supportedTypes, override });
          return newValue;
        }
      });
    },
    [setTypes, updateBackupSettings, backupSettings, override]
  );

  const handleStartBackup = useCallback(() => {
    startBackup({
      directory: directory,
      types: types,
      credentials,
      override,
    });
  }, [types, override, startBackup]);

  const handleCancelBackup = useCallback(() => {
    cancelBackup();
  }, [cancelBackup]);

  const handleOpenFolder = useCallback(() => {
    window.electronAPI.openDirectory(directory);
  }, [directory]);

  const handleOpenLog = useCallback(() => {
    (async () => {
      const logPath = await window.hubs.getLogFilePath({
        directory,
        credentials,
      });
      window.electronAPI.openDirectory(logPath);
    })();
  }, [directory, credentials]);

  const handleOverride = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setOverride(event.target.checked);
      updateBackupSettings({ types, supportedTypes: backupSettings.supportedTypes, override: event.target.checked });
    },
    [setOverride, updateBackupSettings, types, backupSettings]
  );

  useEffect(() => {
    (async () => {
      const supportedTypes = await window.hubs.getSupportedEndpoints({ credentials });
      updateBackupSettings({ types, supportedTypes, override });
      setSupportedTypesUpdate(true);
    })();
  }, [updateBackupSettings, types, override, setSupportedTypesUpdate]);

  const isSupported = useCallback(
    (type: IBackupTypes) => {
      if (backupSettings.supportedTypes) {
        return (backupSettings.supportedTypes & type) != 0;
      } else {
        return false;
      }
    },
    [backupSettings]
  );

  const isTypeChecked = useCallback(
    (type: IBackupTypes) => {
      if (types && isSupported(type)) {
        return (types & type) != 0;
      } else {
        return false;
      }
    },
    [types, isSupported]
  );

  const getTooltipMessage = useCallback(
    (type: IBackupTypes) => {
      return (
        <Tooltip title={`${Tooltips[type]} ${!isSupported(type) ? ". Note: This option is not supported by your Hubs instance." : ""}`}>
          <HelpIcon sx={{ verticalAlign: "middle", color: "grey" }} />
        </Tooltip>
      );
    },
    [backupSettings]
  );

  return (
    <form noValidate autoComplete="on">
      <Grid
        container
        direction={"column"}
        rowSpacing={2}
        alignContent={"center"}
        justifyContent={"center"}
        display={"flex"}
      >
        <Grid
          container
          direction={"row"}
          alignContent={"center"}
          justifyContent={"center"}
          alignItems={"center"}
        >
          <Grid item xs={10}>
            <TextField
              variant="outlined"
              placeholder=""
              required={true}
              fullWidth
              name="directory"
              value={directory}
              disabled={true}
            />
          </Grid>
          <Grid item xs={2} textAlign={"center"}>
            <IconButton onClick={onSelectDirectory} disabled={running}>
              <FolderIcon fontSize="large" />
            </IconButton>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            component="label"
            fullWidth
            onClick={handleOpenFolder}
            disabled={!directory}
          >
            Show Download Location
          </Button>
        </Grid>
        <Grid
          container
          direction={"column"}
          alignContent={"start"}
          justifyContent={"center"}
          paddingTop={2}
        >
          {/* Avatars */}
          <Grid
            container
            direction={"row"}
            alignContent={"center"}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Grid item xs={5} alignItems={"center"}>
              <FormControlLabel
                control={<Checkbox />}
                label="Avatars"
                name="avatars"
                checked={isTypeChecked(IBackupTypes.Avatars)}
                onChange={handleTypeChange}
                disabled={running || !isSupported(IBackupTypes.Avatars) || !supportedTypesUpdated}
              />
              {getTooltipMessage(IBackupTypes.Avatars)}
            </Grid>
            <Grid item xs={6}>
              {running && isTypeChecked(IBackupTypes.Avatars) && (
                <LinearProgress variant={avatarsProgress != 0 ? "determinate" : undefined} value={avatarsProgress} />
              )}
            </Grid>
            <Grid item xs={1} paddingLeft={2}>
              {running && isTypeChecked(IBackupTypes.Avatars) && (
                <Typography
                  fontWeight={"bold"}
                  fontSize={"small"}
                >{`${avatarsProgress.toFixed(0)}%`}</Typography>
              )}
            </Grid>
          </Grid>
          {/* Spoke Scenes */}
          <Grid
            container
            direction={"row"}
            alignContent={"center"}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Grid item xs={5}>
              <FormControlLabel
                control={<Checkbox />}
                label="Spoke scene models"
                name="scenes"
                checked={isTypeChecked(IBackupTypes.Scenes)}
                onChange={handleTypeChange}
                disabled={running || !isSupported(IBackupTypes.Scenes) || !supportedTypesUpdated}
              />
              {getTooltipMessage(IBackupTypes.Scenes)}
            </Grid>
            <Grid item xs={6}>
              {running && isTypeChecked(IBackupTypes.Scenes) && (
                <LinearProgress variant={scenesProgress != 0 ? "determinate" : undefined} value={scenesProgress} />
              )}
            </Grid>
            <Grid item xs={1} paddingLeft={2}>
              {running && isTypeChecked(IBackupTypes.Scenes) && (
                <Typography
                  fontWeight={"bold"}
                  fontSize={"small"}
                >{`${scenesProgress.toFixed(0)}%`}</Typography>
              )}
            </Grid>
          </Grid>
          {/* Blender Scenes */}
          <Grid
            container
            direction={"row"}
            alignContent={"center"}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Grid item xs={5}>
              <FormControlLabel
                control={<Checkbox />}
                label="Blender scene models"
                name="blender"
                checked={isTypeChecked(IBackupTypes.Blender)}
                onChange={handleTypeChange}
                disabled={running || !isSupported(IBackupTypes.Blender) || !supportedTypesUpdated}
              />
              {getTooltipMessage(IBackupTypes.Blender)}
            </Grid>
            <Grid item xs={6}>
              {running && isTypeChecked(IBackupTypes.Blender) && (
                <LinearProgress variant={blenderProgress != 0 ? "determinate" : undefined} value={blenderProgress} />
              )}
            </Grid>
            <Grid item xs={1} paddingLeft={2}>
              {running && isTypeChecked(IBackupTypes.Blender) && (
                <Typography
                  fontWeight={"bold"}
                  fontSize={"small"}
                >{`${blenderProgress.toFixed(0)}%`}</Typography>
              )}
            </Grid>
          </Grid>
          {/* Rooms */}
          <Grid
            container
            direction={"row"}
            alignContent={"center"}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Grid item xs={5}>
              <FormControlLabel
                control={<Checkbox />}
                label="Room media"
                name="rooms"
                checked={isTypeChecked(IBackupTypes.Rooms)}
                onChange={handleTypeChange}
                disabled={running || !isSupported(IBackupTypes.Rooms) || !supportedTypesUpdated}
              />
              {getTooltipMessage(IBackupTypes.Rooms)}
            </Grid>
            <Grid item xs={6}>
              {running && isTypeChecked(IBackupTypes.Rooms) && (
                <LinearProgress variant={roomsProgress != 0 ? "determinate" : undefined} value={roomsProgress} />
              )}
            </Grid>
            <Grid item xs={1} paddingLeft={2}>
              {running && isTypeChecked(IBackupTypes.Rooms) && (
                <Typography
                  fontWeight={"bold"}
                  fontSize={"small"}
                >{`${roomsProgress.toFixed(0)}%`}</Typography>
              )}
            </Grid>
          </Grid>
          {/* Media */}
          <Grid
            container
            direction={"row"}
            alignContent={"center"}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Grid item xs={5}>
              <FormControlLabel
                control={<Checkbox />}
                label="Uploaded Media"
                name="media"
                checked={isTypeChecked(IBackupTypes.Media)}
                onChange={handleTypeChange}
                disabled={running || !isSupported(IBackupTypes.Media) || !supportedTypesUpdated}
              />
              {getTooltipMessage(IBackupTypes.Media)}
            </Grid>
            <Grid item xs={6}>
              {running && isTypeChecked(IBackupTypes.Media) && (
                <LinearProgress variant={mediaProgress != 0 ? "determinate" : undefined} value={mediaProgress} />
              )}
            </Grid>
            <Grid item xs={1} paddingLeft={2}>
              {running && isTypeChecked(IBackupTypes.Media) && (
                <Typography
                  fontWeight={"bold"}
                  fontSize={"small"}
                >{`${mediaProgress.toFixed(0)}%`}</Typography>
              )}
            </Grid>
          </Grid>
          <Grid item xs={12} textAlign={"center"}>
            <FormControlLabel
              control={<Checkbox size={"small"} />}
              name="override"
              checked={override}
              onChange={handleOverride}
              disabled={running}
              label={
                <Typography sx={{ fontSize: "small", fontWeight: "bold" }}>
                  Override existing files
                </Typography>
              }
            />
            <Tooltip title="On download, existing files previously exported with this email will be replaced">
              <HelpIcon sx={{ verticalAlign: "middle", color: "grey" }} />
            </Tooltip>
          </Grid>
        </Grid>
      </Grid>
      <Grid
        container
        direction={"row"}
        columnSpacing={2}
        alignContent={"center"}
        justifyContent={"center"}
        alignItems={"center"}
        paddingTop={2}
      >
        <Grid item xs={6}>
          <Button
            variant="contained"
            component="label"
            onClick={handleCancelBackup}
            disabled={!(directory && running) || (running && cancelled)}
            color="error"
            fullWidth
          >
            Cancel
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button
            variant="contained"
            component="label"
            onClick={handleStartBackup}
            disabled={!(directory && !running) || types == 0 || !supportedTypesUpdated}
            color="success"
            fullWidth
          >
            {supportedTypesUpdated && "Backup" || <><CircularProgress color="inherit" style={{ width: "20", height: "20", marginRight: "10" }} />Checking support...</>}
          </Button>
        </Grid>
      </Grid>
      <Grid item xs={12} marginTop={2}>
        {log && (
          <Grid
            container
            alignItems={"center"}
            alignContent={"center"}
            direction={"row"}
            sx={{
              borderRadius: 1,
              bgcolor: running
                ? "primary.main"
                : result
                  ? "success.main"
                  : "error.main",
            }}
            padding={2}
            height={60}
            marginTop={4}
          >
            <Grid item xs={11}>
              <Typography
                fontWeight={"bold"}
                fontSize={"small"}
                color={"white"}
              >
                {log}
              </Typography>
            </Grid>
            <Grid item xs={1}>
              {!running && (
                <IconButton onClick={handleOpenLog} size="small">
                  <TextSnippetIcon fontSize="small" sx={{ color: "white" }} />
                </IconButton>
              )}
            </Grid>
          </Grid>
        )}
      </Grid>
    </form>
  );
}
