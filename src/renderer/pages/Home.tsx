import { Box, Container, Grid, Typography } from "@mui/material";
import hubsLogo from "../../../static/hubs.svg";

export default function Home(): JSX.Element {
  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Grid container justifyContent="center">
        <Box component="img" src={hubsLogo} width={400} />
      </Grid>
      <Typography variant="h1" textAlign="center" sx={{ mt: 8 }}>
        Home
      </Typography>
    </Container>
  );
}
