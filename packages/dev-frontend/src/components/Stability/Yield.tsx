import React, { useEffect, useState } from "react";
import { Card, Paragraph, Text } from "theme-ui";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { InfoIcon } from "../InfoIcon";
import { useLiquity } from "../../hooks/LiquityContext";
import { Badge } from "../Badge";
import { fetchLqtyPrice } from "./context/fetchLqtyPrice";

const selector = ({ kusdInStabilityPool, remainingStabilityPoolLQTYReward }: LiquityStoreState) => ({
  kusdInStabilityPool,
  remainingStabilityPoolLQTYReward
});

export const Yield: React.FC = () => {
  const {
    liquity: {
      connection: { addresses }
    }
  } = useLiquity();
  const { kusdInStabilityPool, remainingStabilityPoolLQTYReward } = useLiquitySelector(selector);

  const [lqtyPrice, setLqtyPrice] = useState<Decimal | undefined>(undefined);
  const hasZeroValue = remainingStabilityPoolLQTYReward.isZero || kusdInStabilityPool.isZero;
  const lqtyTokenAddress = addresses["lqtyToken"];

  useEffect(() => {
    (async () => {
      try {
        const { lqtyPriceUSD } = await fetchLqtyPrice(lqtyTokenAddress);
        setLqtyPrice(lqtyPriceUSD);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [lqtyTokenAddress]);

  if (hasZeroValue || lqtyPrice === undefined) return null;

  const yearlyHalvingSchedule = 0.5; // 50% see LQTY distribution schedule for more info
  const remainingLqtyOneYear = remainingStabilityPoolLQTYReward.mul(yearlyHalvingSchedule);
  const remainingLqtyOneYearInUSD = remainingLqtyOneYear.mul(lqtyPrice);
  const aprPercentage = remainingLqtyOneYearInUSD.div(kusdInStabilityPool).mul(100);
  const remainingLqtyInUSD = remainingStabilityPoolLQTYReward.mul(lqtyPrice);

  if (aprPercentage.isZero) return null;

  return (
    <Badge>
      <Text>LQTY APR {aprPercentage.toString(2)}%</Text>
      <InfoIcon
        tooltip={
          <Card variant="tooltip" sx={{ width: ["220px", "518px"] }}>
            <Paragraph>
              An <Text sx={{ fontWeight: "bold" }}>estimate</Text> of the LQTY return on the KUSD
              deposited to the Stability Pool over the next year, not including your ETH gains from
              liquidations.
            </Paragraph>
            <Paragraph sx={{ fontSize: "12px", fontFamily: "monospace", mt: 2 }}>
              (($LQTY_REWARDS * YEARLY_DISTRIBUTION%) / DEPOSITED_KUSD) * 100 ={" "}
              <Text sx={{ fontWeight: "bold" }}> APR</Text>
            </Paragraph>
            <Paragraph sx={{ fontSize: "12px", fontFamily: "monospace" }}>
              ($
              {remainingLqtyInUSD.shorten()} * 50% / ${kusdInStabilityPool.shorten()}) * 100 =
              <Text sx={{ fontWeight: "bold" }}> {aprPercentage.toString(2)}%</Text>
            </Paragraph>
          </Card>
        }
      ></InfoIcon>
    </Badge>
  );
};
