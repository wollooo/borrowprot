import React from "react";
import { Flex } from "theme-ui";

import { KumoStoreState } from "@kumo/lib-base";
import { useKumoSelector } from "@kumo/lib-react";

const selector = ({ remainingStabilityPoolKUMOReward }: KumoStoreState) => ({
  remainingStabilityPoolKUMOReward
});

export const RemainingKUMO: React.FC = () => {
  const { remainingStabilityPoolKUMOReward } = useKumoSelector(selector);

  return (
    <Flex sx={{ mr: 2, fontSize: 2, fontWeight: "medium" }}>
      {remainingStabilityPoolKUMOReward.prettify(0)} KUMO remaining
    </Flex>
  );
};
