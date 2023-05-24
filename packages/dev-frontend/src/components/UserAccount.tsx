import React, { useEffect, useState } from "react";
import { Flex, Box, Button } from "theme-ui";
import { useWalletView } from "../components/WalletConnect/context/WalletViewContext";
import { Web3Provider } from "@ethersproject/providers";

import { useWeb3React } from "@web3-react/core";
import { useDialogState, Dialog } from "reakit/Dialog";
import { WalletModal } from "./WalletConnect/WalletModal";
import { Tooltip } from "./Tooltip";
import { SwitchNetworkModal } from "./SwitchNetwork/SwitchNetwork";
import { useSwitchNetworkView } from "./SwitchNetwork/context/SwitchNetworkViewContext";
import { AddAssetModal } from "./AddAssetModal";

const style = {
  top: "45%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: [340, 470],
  bgcolor: "white",
  border: "none",
  boxShadow: 24,
  p: 0,
};

export const UserAccount: React.FC = () => {
  const [showAssetModal, setShowAssetModal] = useState(false);
  const { deactivate, active } = useWeb3React<Web3Provider>();
  const dialog = useDialogState();
  const { showModal, dispatchEvent } = useWalletView();
  const { showSwitchModal } = useSwitchNetworkView();
  const { account } = useWeb3React();

  useEffect(() => {
    if (!active) {
      dialog.setVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect(() => {
  //   const keyDownHandler = (event: { key: string; preventDefault: () => void }) => {
  //     if (event.key === "Escape") {
  //       event.preventDefault();
  //       console.log("UserAccount", view);
  //       if (view === "NONE" || "OPEN") {
  //         dispatchEvent("CLOSE_WALLET_MODAL_PRESSED");
  //       }
  //     }
  //   };

  //   document.addEventListener("keydown", keyDownHandler);

  //   // 👇️ clean up event listener
  //   return () => {
  //     document.removeEventListener("keydown", keyDownHandler);
  //   };
  // }, []);

  return (
    <Box>
      <Flex sx={{ alignItems: "center", ml: 3 }}>
        {account ? (
          <>
            <Button
              onClick={() => {
                setShowAssetModal(true);
                dialog.setVisible(true);
              }}
              sx={{
                py: 2,
                px: 3,
                mr: 2,
                outline: "none",
                fontSize: '14px'
              }}
            >
              {" "}
              ADD TEST TOKENS TO WALLET
            </Button>
            <Tooltip message={account}>
              <Button
                onClick={() => {
                  deactivate();
                  sessionStorage.removeItem("account");
                }}
                sx={{
                  py: 2,
                  px: 3,
                  mr: 2,
                  outline: "none",
                  fontSize: '14px'
                }}
              >
                {" "}
                DISCONNECT
              </Button>
            </Tooltip>
          </>
        ) : (
          <Button
            onClick={() => dispatchEvent("OPEN_WALLET_MODAL_PRESSED")}
            sx={{
              py: 2,
              px: 3,
              mr: 2,
              outline: "none",
              fontSize: '14px'
            }}
          >
            CONNECT
          </Button>
        )}

      </Flex>
      {showModal && (
        <Dialog {...dialog} hideOnClickOutside={false} preventBodyScroll={true}>
          <Box sx={{ ...style, position: "absolute", borderRadius: "50px", background: "linear-gradient(128.29deg, #FFFFFF 0%, rgba(255, 255, 255, 1) 127.78%)" }}>
            <WalletModal />
          </Box>
        </Dialog>
      )}
      {showSwitchModal && (
        <Dialog {...dialog} hideOnClickOutside={false} >
          <Box sx={{ ...style, position: "absolute", borderRadius: "50px", background: "linear-gradient(128.29deg, #FFFFFF 0%, rgba(255, 255, 255, 1) 127.78%)" }}>
            <SwitchNetworkModal />
          </Box>
        </Dialog>
      )}
      {showAssetModal && (
        <Dialog {...dialog} hideOnClickOutside={false}>
          <Box sx={{ ...style, width: [340, 500], position: "absolute", borderRadius: "50px", background: "linear-gradient(128.29deg, #FFFFFF 0%, rgba(255, 255, 255, 1) 127.78%)" }}>
            <AddAssetModal onClose={() => setShowAssetModal(false)} />
          </Box>
        </Dialog>
      )}
    </Box>
  );
};
