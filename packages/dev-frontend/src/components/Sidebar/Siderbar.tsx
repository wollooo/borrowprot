import React from "react";
import { Flex, Box, Container, Divider } from "theme-ui";
import { KumoLogo } from "../KumoLogo";
import { Link } from "../Link";

export const Sidebar: React.FC = () => {
  return (
    <Container variant="sideBarOverlay">
      <Flex variant="layout.sideBar" sx={{ flex: 1 }}>
        <KumoLogo height={"20px"} variant="layout.sideBarLogo" />
        <Box as="nav" variant="layout.sideBarNav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/portfolio">Portfolio</Link>
          <Link to="/staking">Staking</Link>
          <Link to="/redemption">Redemption</Link>
          <Link to="/stats">Stats</Link>
        </Box>
      </Flex>
      <Divider sx={{ color: "muted" }} />
      <Flex sx={{ flexDirection: "column", pl: 4, pb: 4 }} variant="layout.newTabLinks">
        <Link to={{ pathname: " https://docs.kumo.earth" }} target="_blank"  style={{  color: 'black' }} className="link">Documentation</Link>
        <Link to={{ pathname: "https://discord.gg/smxnnmG6" }} target="_blank" style={{  color: 'black' }} className="link">Discord</Link>
        <Link to={{ pathname: "https://twitter.com/Kumo_DAO" }} target="_blank" style={{  color: 'black' }} className="link">Twitter</Link>
      </Flex>
    </Container>
  );
};
