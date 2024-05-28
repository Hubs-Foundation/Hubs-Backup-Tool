import {
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Grid,
    Box,
} from "@mui/material";
import { ReactNode, useCallback, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import Logout from "@mui/icons-material/Logout";
import EmailIcon from "@mui/icons-material/Email";
import StorageIcon from "@mui/icons-material/Storage";
import HelpIcon from "@mui/icons-material/Help";
import VideoIcon from "@mui/icons-material/VideoLibrary";
import DocumentationIcon from "@mui/icons-material/TextSnippet";
import hubsLogo from "../../../static/hubs.svg";

type Props = {
    children?: ReactNode;
};

export default function App({ children }: Props): JSX.Element {
    const [open, setOpen] = useState(false);
    const { credentials, updateCredentials } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = useCallback(async () => {
        setOpen(false);
        updateCredentials(null);
        navigate("/login");
    }, [setOpen, updateCredentials, navigate]);

    const handleOpenClick = useCallback(() => {
        setOpen(true);
    }, [setOpen]);

    const handleClose = useCallback(() => {
        setOpen(false);
    }, [setOpen]);

    const openVideo = useCallback(() => {
        window.electronAPI.openInBrowser("https://youtu.be/vnkgGLkcxuk");
    }, []);

    return (
        <>
            <Grid container padding={4}>
                <Grid item xs={1}>
                    {credentials && (
                        <Avatar onClick={handleOpenClick}>
                            {credentials.email.substring(0, 1).toUpperCase()}
                        </Avatar>
                    )}
                </Grid>
                <Grid item xs={10}>
                    <Grid container alignItems={"center"} direction={"column"}>
                        <Grid item xs={6}>
                            <Box component="img" src={hubsLogo} width={400} />
                        </Grid>
                        <Grid item xs={6} marginTop={8} width={800}>
                            {children}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs={1} textAlign={"end"}>
                    <IconButton onClick={openVideo}>
                        <VideoIcon fontSize="large" />
                    </IconButton>
                </Grid>

            </Grid>
            {credentials && <Menu
                id="basic-menu"
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    "aria-labelledby": "basic-button",
                }}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "left",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "left",
                }}
                sx={{ top: 70, left: 20 }}
            >
                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <Logout fontSize="small" />
                    </ListItemIcon>
                    Logout
                </MenuItem>
                <MenuItem style={{ pointerEvents: "none" }}>
                    <ListItemIcon>
                        <EmailIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{credentials.email}</ListItemText>
                </MenuItem>
                <MenuItem style={{ pointerEvents: "none" }}>
                    <ListItemIcon>
                        <StorageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{credentials.host}</ListItemText>
                </MenuItem>
            </Menu>}
        </>
    );
}
