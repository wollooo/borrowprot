import React, { useEffect } from "react";
import { useWeb3React } from "@web3-react/core";

import { useSwitchNetwork } from "../../hooks/useSwitchNetwork";
import { useWalletView } from "./context/WalletViewContext";
import { Card, Box, Heading, Button } from "theme-ui";
import { useDialogState } from "reakit/Dialog";
import { injectedConnector, WalletConnect } from "../../connectors/injectedConnector";
import { Icon } from "../Icon";

export const WalletModal: React.FC = () => {
  const { activate } = useWeb3React<unknown>();
  const { view, dispatchEvent } = useWalletView();
  const { switchNetwork } = useSwitchNetwork();
  const dialog = useDialogState();

  useEffect(() => {
    if (!dialog.visible && view !== "OPEN") {
      dispatchEvent("CLOSE_WALLET_MODAL_PRESSED");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog.visible]);

  return (
    <Card variant="modalCard">
      <Heading as="h2" sx={{ mr: 2 }}>
        Connect to Wallet{" "}
        <span
          style={{ marginLeft: "auto", cursor: "pointer" }}
          onClick={() => dispatchEvent("CLOSE_WALLET_MODAL_PRESSED")}
        >
          <Icon name="window-close" size={"1x"} color="#da357a" />
        </span>
      </Heading>
      <Box sx={{ p: [4, 3], mt: 3, display: "flex", justifyContent: "center" }}>
        <Button
          onClick={e => {
            activate(injectedConnector, undefined, true).catch(async error => {
              if (
                error?.name === "UnsupportedChainIdError" ||
                error?.message?.includes("Unsupported chain id")
              ) {
                try {
                  const metaMaaskProvider = await injectedConnector.getProvider();
                  if (metaMaaskProvider) {
                    switchNetwork(metaMaaskProvider, injectedConnector);
                  }
                } catch (error) {
                  console.log(error);
                }
              } else if (error.name === "NoEthereumProviderError") {
                alert("Please Intall MetaMask Extension");
              }
            });

            dispatchEvent("CLOSE_WALLET_MODAL_PRESSED");
            e.stopPropagation();
          }}
          sx={{
            width: 200,
            outline: "none"
          }}
        >
          <Box sx={{ ml: 2 }}>MetaMask</Box>
        </Button>
      </Box>
      <Box sx={{ p: [4, 3], mb: 3, display: "flex", justifyContent: "center" }}>
        <Button
          onClick={e => {
            activate(WalletConnect);
            dispatchEvent("CLOSE_WALLET_MODAL_PRESSED");
            e.stopPropagation();
          }}
          sx={{
            width: 200,
            outline: "none"
          }}
        >
          <Box sx={{ ml: 2 }}>WalletConnect</Box>
        </Button>
      </Box>
    </Card>
  );
};
