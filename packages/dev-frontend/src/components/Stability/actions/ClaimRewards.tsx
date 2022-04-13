import React from "react";
import { Button } from "theme-ui";

import { useKumo } from "../../../hooks/KumoContext";
import { useTransactionFunction } from "../../Transaction";

type ClaimRewardsProps = {
  disabled?: boolean;
};

export const ClaimRewards: React.FC<ClaimRewardsProps> = ({ disabled, children }) => {
  const { kumo } = useKumo();

  const [sendTransaction] = useTransactionFunction(
    "stability-deposit",
    kumo.send.withdrawGainsFromStabilityPool.bind(kumo.send)
  );

  return (
    <Button onClick={sendTransaction} disabled={disabled}>
      {children}
    </Button>
  );
};
