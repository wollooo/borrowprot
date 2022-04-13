import React from "react";
import { Button } from "theme-ui";
import { useKumo } from "../../../hooks/KumoContext";
import { useTransactionFunction } from "../../Transaction";

type ClaimAndMoveProps = {
  disabled?: boolean;
};

export const ClaimAndMove: React.FC<ClaimAndMoveProps> = ({ disabled, children }) => {
  const { kumo } = useKumo();

  const [sendTransaction] = useTransactionFunction(
    "stability-deposit",
    kumo.send.transferCollateralGainToTrove.bind(kumo.send)
  );

  return (
    <Button
      variant="outline"
      sx={{ mt: 3, width: "100%" }}
      onClick={sendTransaction}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};
