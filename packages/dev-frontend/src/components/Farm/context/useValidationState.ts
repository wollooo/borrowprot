import { Decimal, KumoStoreState } from "@kumo/lib-base";
import { useKumoSelector } from "@kumo/lib-react";

const selector = ({
  uniTokenBalance,
  uniTokenAllowance,
  liquidityMiningStake
}: KumoStoreState) => ({
  uniTokenBalance,
  uniTokenAllowance,
  liquidityMiningStake
});

type FarmStakeValidation = {
  isValid: boolean;
  hasApproved: boolean;
  hasEnoughUniToken: boolean;
  isWithdrawing: boolean;
  amountChanged: Decimal;
  maximumStake: Decimal;
  hasSetMaximumStake: boolean;
};

export const useValidationState = (amount: Decimal): FarmStakeValidation => {
  const { uniTokenBalance, uniTokenAllowance, liquidityMiningStake } = useKumoSelector(selector);
  const isWithdrawing = liquidityMiningStake.gt(amount);
  const amountChanged = isWithdrawing
    ? liquidityMiningStake.sub(amount)
    : Decimal.from(amount).sub(liquidityMiningStake);
  const maximumStake = liquidityMiningStake.add(uniTokenBalance);
  const hasSetMaximumStake = amount.eq(maximumStake);

  if (isWithdrawing) {
    return {
      isValid: true,
      hasApproved: true,
      hasEnoughUniToken: true,
      isWithdrawing,
      amountChanged,
      maximumStake,
      hasSetMaximumStake
    };
  }

  const hasApproved = !uniTokenAllowance.isZero && uniTokenAllowance.gte(amountChanged);
  const hasEnoughUniToken = !uniTokenBalance.isZero && uniTokenBalance.gte(amountChanged);

  return {
    isValid: hasApproved && hasEnoughUniToken,
    hasApproved,
    hasEnoughUniToken,
    isWithdrawing,
    amountChanged,
    maximumStake,
    hasSetMaximumStake
  };
};
