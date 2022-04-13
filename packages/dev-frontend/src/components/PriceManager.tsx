import React, { useState, useEffect } from "react";
import { Card, Box, Heading, Flex, Button, Label, Input } from "theme-ui";

import { Decimal, KumoStoreState } from "@kumo/lib-base";
import { useKumoSelector } from "@kumo/lib-react";

import { useKumo } from "../hooks/KumoContext";

import { Icon } from "./Icon";
import { Transaction } from "./Transaction";

const selectPrice = ({ price }: KumoStoreState) => price;

export const PriceManager: React.FC = () => {
  const {
    kumo: {
      send: kumo,
      connection: { _priceFeedIsTestnet: canSetPrice }
    }
  } = useKumo();

  const price = useKumoSelector(selectPrice);
  const [editedPrice, setEditedPrice] = useState(price.toString(2));

  useEffect(() => {
    setEditedPrice(price.toString(2));
  }, [price]);

  return (
    <Card>
      <Heading>Price feed</Heading>

      <Box sx={{ p: [2, 3] }}>
        <Flex sx={{ alignItems: "stretch" }}>
          <Label>ETH</Label>

          <Label variant="unit">$</Label>

          <Input
            type={canSetPrice ? "number" : "text"}
            step="any"
            value={editedPrice}
            onChange={e => setEditedPrice(e.target.value)}
            disabled={!canSetPrice}
          />

          {canSetPrice && (
            <Flex sx={{ ml: 2, alignItems: "center" }}>
              <Transaction
                id="set-price"
                tooltip="Set"
                tooltipPlacement="bottom"
                send={overrides => {
                  if (!editedPrice) {
                    throw new Error("Invalid price");
                  }
                  return kumo.setPrice(Decimal.from(editedPrice), overrides);
                }}
              >
                <Button variant="icon">
                  <Icon name="chart-line" size="lg" />
                </Button>
              </Transaction>
            </Flex>
          )}
        </Flex>
      </Box>
    </Card>
  );
};
