import React from "react";
import { Flex } from "theme-ui";

import { KumoStoreState } from "@kumo/lib-base";
import { useKumoSelector } from "@kumo/lib-react";

const selector = ({ remainingLiquidityMiningKUMOReward }: KumoStoreState) => ({
  remainingLiquidityMiningKUMOReward
});

export const RemainingKUMO: React.FC = () => {
  const { remainingLiquidityMiningKUMOReward } = useKumoSelector(selector);

  return (
    <Flex sx={{ mr: 2, fontSize: 2, fontWeight: "medium" }}>
      {remainingLiquidityMiningKUMOReward.prettify(0)} KUMO remaining
    </Flex>
  );
};
