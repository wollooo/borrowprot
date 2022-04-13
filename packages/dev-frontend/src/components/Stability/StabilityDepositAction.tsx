import { Button } from "theme-ui";
import { Decimal, KumoStoreState, StabilityDepositChange } from "@kumo/lib-base";
import { useKumoSelector } from "@kumo/lib-react";

import { useKumo } from "../../hooks/KumoContext";
import { useTransactionFunction } from "../Transaction";

type StabilityDepositActionProps = {
  transactionId: string;
  change: StabilityDepositChange<Decimal>;
};

const selectFrontendRegistered = ({ frontend }: KumoStoreState) =>
  frontend.status === "registered";

export const StabilityDepositAction: React.FC<StabilityDepositActionProps> = ({
  children,
  transactionId,
  change
}) => {
  const { config, kumo } = useKumo();
  const frontendRegistered = useKumoSelector(selectFrontendRegistered);

  const frontendTag = frontendRegistered ? config.frontendTag : undefined;

  const [sendTransaction] = useTransactionFunction(
    transactionId,
    change.depositKUSD
      ? kumo.send.depositKUSDInStabilityPool.bind(kumo.send, change.depositKUSD, frontendTag)
      : kumo.send.withdrawKUSDFromStabilityPool.bind(kumo.send, change.withdrawKUSD)
  );

  return <Button onClick={sendTransaction}>{children}</Button>;
};
