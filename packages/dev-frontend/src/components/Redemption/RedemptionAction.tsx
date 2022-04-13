import { Button } from "theme-ui";

import { Decimal } from "@kumo/lib-base";

import { useKumo } from "../../hooks/KumoContext";
import { useTransactionFunction } from "../Transaction";

type RedemptionActionProps = {
  transactionId: string;
  disabled?: boolean;
  kusdAmount: Decimal;
  maxRedemptionRate: Decimal;
};

export const RedemptionAction: React.FC<RedemptionActionProps> = ({
  transactionId,
  disabled,
  kusdAmount,
  maxRedemptionRate
}) => {
  const {
    kumo: { send: kumo }
  } = useKumo();

  const [sendTransaction] = useTransactionFunction(
    transactionId,
    kumo.redeemKUSD.bind(kumo, kusdAmount, maxRedemptionRate)
  );

  return (
    <Button disabled={disabled} onClick={sendTransaction}>
      Confirm
    </Button>
  );
};
